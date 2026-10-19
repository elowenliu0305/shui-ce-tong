import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { logEvent } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface DeleteFileRequest {
  enterpriseId?: string;
  recordId?: string;
}

interface RevokedFile {
  jobId: string;
  fileId: string;
  enterpriseId: string;
  storageKeys: string[];
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve((request) => handleRequest(request, async ({ requestId }) => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user, client } = await requireUser(request);
  enforceRateLimit(`delete-enterprise-file:${user.id}`, { limit: 10, windowMs: 60_000 });
  const body = await request.json() as DeleteFileRequest;
  if (!body.enterpriseId || !body.recordId || !uuidPattern.test(body.enterpriseId) || !uuidPattern.test(body.recordId)) {
    throw new HttpError(400, "validation_failed", "删除参数不完整。", false);
  }
  const revoked = await client.rpc("revoke_enterprise_file_for_deletion", { p_record_id: body.recordId });
  if (revoked.error || !revoked.data) {
    if (revoked.error?.code === "P0002") throw new HttpError(404, "not_found", "文件不存在或不属于当前企业。", false);
    throw new HttpError(503, "dependency_unavailable", "文件暂时无法删除。", true);
  }
  const item = revoked.data as RevokedFile;
  if (item.enterpriseId !== body.enterpriseId) throw new HttpError(404, "not_found", "文件不存在或不属于当前企业。", false);
  const admin = createServiceClient();
  await admin.from("deletion_jobs").update({ status: "running", attempt_count: 1 }).eq("id", item.jobId).eq("owner_id", user.id);
  await admin.from("enterprise_files").update({ deletion_state: "purging" }).eq("id", item.fileId).eq("owner_id", user.id);
  try {
    if (item.storageKeys.length) {
      const removed = await admin.storage.from("enterprise-files").remove(item.storageKeys);
      if (removed.error) throw new Error("storage_remove_failed");
    }
    const deleted = await admin.from("enterprise_files").delete().eq("id", item.fileId).eq("owner_id", user.id);
    if (deleted.error) throw new Error("database_delete_failed");
    const result = { resourceId: item.fileId, status: "completed", deletedCounts: { sourceObjects: item.storageKeys.length, files: 1 } };
    await admin.from("deletion_jobs").update({ status: "completed", completed_at: new Date().toISOString(), result_summary: result }).eq("id", item.jobId);
    logEvent("info", "enterprise_file.delete.completed", { requestId, ownerId: user.id, enterpriseId: item.enterpriseId, fileId: item.fileId, objectCount: item.storageKeys.length });
    return result;
  } catch {
    await admin.from("enterprise_files").update({ deletion_state: "failed" }).eq("id", item.fileId).eq("owner_id", user.id);
    await admin.from("deletion_jobs").update({ status: "failed", last_error_code: "dependency_unavailable" }).eq("id", item.jobId);
    logEvent("error", "enterprise_file.delete.failed", { requestId, ownerId: user.id, enterpriseId: item.enterpriseId, fileId: item.fileId });
    throw new HttpError(503, "dependency_unavailable", "文件访问已撤销，但存储清理未完成；可稍后重试。", true);
  }
}));
