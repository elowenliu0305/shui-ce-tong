import type { FileAnalysisRecord, FileAnalysisTask, FileUploadSelection } from "../../domain/file-analysis";
import type { FileAnalysisService } from "../contracts/file-analysis-service";
import { failure, success } from "../contracts/service-result";
import { getSupabaseClient } from "./client";
import type { ServerErrorEnvelope } from "./types";
import { toAppError } from "./types";

interface FileRow {
  id: string;
  enterprise_id: string;
  file_id: string;
  task_type: FileAnalysisTask;
  status: "queued" | "processing" | "completed" | "failed";
  reading_status: "not_read" | "partial" | "complete" | "failed";
  result: { summary?: string } | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
  enterprise_files: {
    original_name: string;
    detected_mime: string;
    byte_size: number;
    processing_status: string;
    deletion_state: string;
  };
}

interface PrepareResponse {
  fileId: string;
  recordId: string;
  uploadRequired: boolean;
  signedUpload: { path: string; token: string } | null;
  record: FileAnalysisRecord;
  replayed: boolean;
}

interface RecordResponse { record: FileAnalysisRecord; replayed?: boolean }
interface DownloadResponse { signedUrl: string; expiresIn: number }

const selectColumns = "id, enterprise_id, file_id, task_type, status, reading_status, result, error_code, created_at, updated_at, enterprise_files!inner(original_name, detected_mime, byte_size, processing_status, deletion_state)";

function record(row: FileRow): FileAnalysisRecord {
  const source = row.enterprise_files;
  const readingStatus = row.reading_status.replace("_", "-") as FileAnalysisRecord["readingStatus"];
  return {
    id: row.id,
    fileId: row.file_id,
    enterpriseId: row.enterprise_id,
    displayName: source.original_name,
    mediaType: source.detected_mime,
    byteSize: Number(source.byte_size),
    selectedTask: row.task_type,
    status: row.status === "queued" ? "processing" : row.status,
    readingStatus,
    contentRead: readingStatus === "partial" || readingStatus === "complete",
    resultSummary: row.result?.summary ?? null,
    errorCode: row.error_code,
    sourceAvailable: ["uploaded", "processing", "ready"].includes(source.processing_status) && source.deletion_state === "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function unavailable(message: string) {
  return failure({ code: "STORAGE_ERROR", message, retryable: true });
}

export class SupabaseFileAnalysisService implements FileAnalysisService {
  private readonly client = getSupabaseClient();
  private readonly mutationIds = new Map<string, string>();

  async register(enterpriseId: string, file: FileUploadSelection, task: FileAnalysisTask) {
    if (!file.sourceFile) return failure({ code: "VALIDATION_ERROR", message: "请选择需要上传的文件", retryable: false });
    if (file.sourceFile.size !== file.byteSize || file.sourceFile.name !== file.displayName) {
      return failure({ code: "VALIDATION_ERROR", message: "文件信息已变化，请重新选择", retryable: false });
    }
    const fingerprint = JSON.stringify({ enterpriseId, name: file.displayName, type: file.mediaType, size: file.byteSize, task });
    const idempotencyKey = this.mutationIds.get(fingerprint) ?? crypto.randomUUID();
    this.mutationIds.set(fingerprint, idempotencyKey);
    const prepared = await this.client.functions.invoke<PrepareResponse | ServerErrorEnvelope>("enterprise-file-upload", {
      body: {
        action: "prepare",
        enterpriseId,
        task,
        idempotencyKey,
        file: { displayName: file.displayName, mediaType: file.mediaType, byteSize: file.byteSize },
      },
    });
    if (prepared.error || !prepared.data) return unavailable("暂时无法准备文件上传");
    if ("error" in prepared.data) {
      if (!prepared.data.error.retryable) this.mutationIds.delete(fingerprint);
      return failure(toAppError(prepared.data));
    }
    const upload = prepared.data;
    if (upload.record.status === "completed") {
      this.mutationIds.delete(fingerprint);
      return success(upload.record);
    }
    if (upload.uploadRequired) {
      if (!upload.signedUpload) return unavailable("私有上传链接不完整");
      const stored = await this.client.storage.from("enterprise-files").uploadToSignedUrl(
        upload.signedUpload.path,
        upload.signedUpload.token,
        file.sourceFile,
        { contentType: file.mediaType || undefined, upsert: false },
      );
      if (stored.error) {
        const marked = await this.client.functions.invoke("enterprise-file-upload", {
          body: { action: "fail", enterpriseId, fileId: upload.fileId, recordId: upload.recordId, errorCode: "upload_failed" },
        });
        if (!marked.error) this.mutationIds.delete(fingerprint);
        return unavailable("文件上传失败，请检查网络后重试");
      }
    }
    const finalized = await this.client.functions.invoke<RecordResponse | ServerErrorEnvelope>("enterprise-file-upload", {
      body: { action: "finalize", enterpriseId, fileId: upload.fileId, recordId: upload.recordId },
    });
    if (finalized.error || !finalized.data) return unavailable("文件已上传，但状态确认失败；可安全重试");
    if ("error" in finalized.data) {
      if (!finalized.data.error.retryable) this.mutationIds.delete(fingerprint);
      return failure(toAppError(finalized.data));
    }
    this.mutationIds.delete(fingerprint);
    return success(finalized.data.record);
  }

  async refreshStatus(recordId: string, enterpriseId: string) {
    return this.get(recordId, enterpriseId);
  }

  async get(recordId: string, enterpriseId: string) {
    const { data, error } = await this.client.from("file_analysis_records").select(selectColumns)
      .eq("id", recordId).eq("enterprise_id", enterpriseId).maybeSingle();
    if (error) return unavailable("文件记录加载失败");
    if (!data) return failure({ code: "NOT_FOUND", message: "文件记录不存在", retryable: false });
    return success(record(data as unknown as FileRow));
  }

  async list(enterpriseId: string) {
    const { data, error } = await this.client.from("file_analysis_records").select(selectColumns)
      .eq("enterprise_id", enterpriseId).order("created_at", { ascending: false });
    if (error) return unavailable("文件记录加载失败");
    return success((data ?? []).map((row) => record(row as unknown as FileRow)));
  }

  async getDownloadUrl(recordId: string, enterpriseId: string) {
    const found = await this.get(recordId, enterpriseId);
    if (!found.ok) return failure(found.error);
    if (!found.data.fileId) return failure({ code: "NOT_FOUND", message: "原文件不存在", retryable: false });
    const { data, error } = await this.client.functions.invoke<DownloadResponse | ServerErrorEnvelope>("enterprise-file-upload", {
      body: { action: "download", enterpriseId, recordId, fileId: found.data.fileId },
    });
    if (error || !data) return unavailable("原文件下载暂时不可用");
    if ("error" in data) return failure(toAppError(data));
    return success(data.signedUrl);
  }

  async delete(recordId: string, enterpriseId: string) {
    const { data, error } = await this.client.functions.invoke<{ status: string } | ServerErrorEnvelope>("delete-enterprise-file", {
      body: { enterpriseId, recordId },
    });
    if (error || !data) return unavailable("文件删除失败，请稍后重试");
    if ("error" in data) return failure(toAppError(data));
    return success(undefined);
  }
}
