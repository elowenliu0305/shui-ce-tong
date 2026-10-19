import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { logEvent } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { bytesMatchDeclaredType, validateFileMetadata } from "./file-policy.ts";

type FileTask = "tax-health" | "rd-check" | "invoice-check" | "cashflow-summary";
type FileAction = "prepare" | "finalize" | "fail" | "download";

interface FileRequest {
  action?: FileAction;
  enterpriseId?: string;
  recordId?: string;
  fileId?: string;
  idempotencyKey?: string;
  file?: { displayName?: string; mediaType?: string; byteSize?: number };
  task?: FileTask;
  errorCode?: string;
}

interface PreparedRow {
  fileId: string;
  recordId: string;
  storageKey: string;
  record: { status: string };
  replayed: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tasks = new Set<FileTask>(["tax-health", "rd-check", "invoice-check", "cashflow-summary"]);

function requireUuid(value: string | undefined): string {
  if (!value || !uuidPattern.test(value)) throw new HttpError(400, "validation_failed", "文件参数不完整。", false);
  return value;
}

async function requireCurrentEnterprise(admin: ReturnType<typeof createServiceClient>, ownerId: string, enterpriseId: string) {
  const [enterprise, profile] = await Promise.all([
    admin.from("enterprises").select("id").eq("id", enterpriseId).eq("owner_id", ownerId).eq("deletion_state", "active").maybeSingle(),
    admin.from("account_profiles").select("current_enterprise_id").eq("user_id", ownerId).eq("current_enterprise_id", enterpriseId).maybeSingle(),
  ]);
  if (enterprise.error || profile.error) throw new HttpError(503, "dependency_unavailable", "企业校验暂时不可用。", true);
  if (!enterprise.data || !profile.data) throw new HttpError(404, "not_found", "请先切换到对应企业。", false);
}

async function storageObjectExists(admin: ReturnType<typeof createServiceClient>, storageKey: string): Promise<boolean> {
  const parts = storageKey.split("/");
  const name = parts.pop();
  const { data, error } = await admin.storage.from("enterprise-files").list(parts.join("/"), { search: name, limit: 10 });
  if (error) throw new HttpError(503, "dependency_unavailable", "私有存储暂时不可用。", true);
  return Boolean(data?.some((item) => item.name === name));
}

async function markFailed(
  admin: ReturnType<typeof createServiceClient>, ownerId: string, enterpriseId: string,
  fileId: string, recordId: string, errorCode: string, requestId: string,
) {
  return admin.rpc("fail_enterprise_file_upload", {
    p_owner_id: ownerId,
    p_enterprise_id: enterpriseId,
    p_file_id: fileId,
    p_record_id: recordId,
    p_error_code: errorCode,
    p_request_id: requestId,
  });
}

Deno.serve((request) => handleRequest(request, async ({ requestId }) => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user } = await requireUser(request);
  enforceRateLimit(`enterprise-file-upload:${user.id}`, { limit: 30, windowMs: 60_000 });
  const body = await request.json() as FileRequest;
  const action = body.action ?? "prepare";
  const enterpriseId = requireUuid(body.enterpriseId);
  const admin = createServiceClient();
  await requireCurrentEnterprise(admin, user.id, enterpriseId);

  if (action === "prepare") {
    if (!body.file || !body.task || !tasks.has(body.task)) throw new HttpError(400, "validation_failed", "请选择受支持的文件和任务。", false);
    const mutationId = requireUuid(body.idempotencyKey);
    let metadata;
    try {
      metadata = validateFileMetadata(body.file.displayName ?? "", body.file.mediaType ?? "", body.file.byteSize ?? 0);
    } catch (error) {
      const code = error instanceof Error ? error.message : "validation_failed";
      throw new HttpError(400, "validation_failed", code === "invalid_file_size" ? "文件大小必须在 20MB 以内。" : "文件类型、扩展名或名称不受支持。", false);
    }
    const prepared = await admin.rpc("prepare_enterprise_file_upload", {
      p_owner_id: user.id,
      p_enterprise_id: enterpriseId,
      p_original_name: metadata.originalName,
      p_detected_mime: metadata.detectedMime,
      p_byte_size: metadata.byteSize,
      p_task_type: body.task,
      p_extension: metadata.extension,
      p_mutation_id: mutationId,
      p_request_id: requestId,
    });
    if (prepared.error || !prepared.data) {
      if (prepared.error?.code === "23505") throw new HttpError(409, "idempotency_mismatch", "重复上传请求的文件信息不一致。", false);
      if (prepared.error?.code === "P0002") throw new HttpError(404, "not_found", "企业不存在或已切换。", false);
      throw new HttpError(503, "dependency_unavailable", "暂时无法准备文件上传。", true);
    }
    const row = prepared.data as PreparedRow;
    const objectPresent = row.record.status === "completed" || await storageObjectExists(admin, row.storageKey);
    if (row.record.status === "completed") return { ...row, uploadRequired: false, signedUpload: null };
    if (objectPresent) return { ...row, uploadRequired: false, signedUpload: null };
    const signed = await admin.storage.from("enterprise-files").createSignedUploadUrl(row.storageKey, { upsert: false });
    if (signed.error || !signed.data) throw new HttpError(503, "dependency_unavailable", "暂时无法创建私有上传链接。", true);
    logEvent("info", "enterprise_file.upload.prepared", { requestId, ownerId: user.id, enterpriseId, fileId: row.fileId, byteSize: metadata.byteSize });
    return {
      ...row,
      uploadRequired: true,
      signedUpload: { path: row.storageKey, token: signed.data.token },
    };
  }

  const fileId = requireUuid(body.fileId);
  const recordId = requireUuid(body.recordId);
  const file = await admin.from("enterprise_files")
    .select("id, storage_key, byte_size, detected_mime, original_name, processing_status, deletion_state")
    .eq("id", fileId).eq("owner_id", user.id).eq("enterprise_id", enterpriseId).eq("deletion_state", "active").maybeSingle();
  const analysis = await admin.from("file_analysis_records").select("id").eq("id", recordId)
    .eq("file_id", fileId).eq("owner_id", user.id).eq("enterprise_id", enterpriseId).maybeSingle();
  if (file.error || analysis.error) throw new HttpError(503, "dependency_unavailable", "文件状态读取失败。", true);
  if (!file.data || !analysis.data) throw new HttpError(404, "not_found", "文件记录不存在。", false);

  if (action === "download") {
    if (!["uploaded", "processing", "ready"].includes(file.data.processing_status)) throw new HttpError(404, "not_found", "原文件暂不可下载。", false);
    const signed = await admin.storage.from("enterprise-files").createSignedUrl(file.data.storage_key, 120, { download: file.data.original_name });
    if (signed.error || !signed.data) throw new HttpError(503, "dependency_unavailable", "暂时无法创建下载链接。", true);
    return { signedUrl: signed.data.signedUrl, expiresIn: 120 };
  }

  if (action === "fail") {
    const errorCode = body.errorCode && ["upload_failed", "object_missing", "hash_failed", "storage_unavailable"].includes(body.errorCode)
      ? body.errorCode : "upload_failed";
    const failed = await markFailed(admin, user.id, enterpriseId, fileId, recordId, errorCode, requestId);
    if (failed.error || !failed.data) throw new HttpError(503, "dependency_unavailable", "上传失败状态保存失败。", true);
    return { record: failed.data };
  }

  if (action !== "finalize") throw new HttpError(400, "validation_failed", "不支持的文件操作。", false);
  const downloaded = await admin.storage.from("enterprise-files").download(file.data.storage_key);
  if (downloaded.error || !downloaded.data) {
    await markFailed(admin, user.id, enterpriseId, fileId, recordId, "object_missing", requestId);
    throw new HttpError(422, "validation_failed", "上传对象不存在，请重新选择文件。", false);
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const metadata = validateFileMetadata(file.data.original_name, file.data.detected_mime, file.data.byte_size);
  if (bytes.byteLength !== metadata.byteSize || !bytesMatchDeclaredType(bytes.subarray(0, Math.min(bytes.length, 4096)), metadata.extension)) {
    await admin.storage.from("enterprise-files").remove([file.data.storage_key]);
    await markFailed(admin, user.id, enterpriseId, fileId, recordId, "upload_failed", requestId);
    throw new HttpError(400, "validation_failed", "文件实际格式或大小与声明不一致，已移除上传对象。", false);
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const finalized = await admin.rpc("finalize_enterprise_file_upload", {
    p_owner_id: user.id,
    p_enterprise_id: enterpriseId,
    p_file_id: fileId,
    p_record_id: recordId,
    p_sha256: hash,
    p_request_id: requestId,
  });
  if (finalized.error || !finalized.data) throw new HttpError(503, "dependency_unavailable", "文件状态保存失败，可安全重试。", true);
  logEvent("info", "enterprise_file.upload.completed", { requestId, ownerId: user.id, enterpriseId, fileId, byteSize: bytes.byteLength });
  return { record: finalized.data, replayed: file.data.processing_status === "ready" };
}));
