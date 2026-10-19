import type { FileAnalysisRecord, FileAnalysisTask, FileUploadSelection } from "../../domain/file-analysis";
import type { FileAnalysisService } from "../contracts/file-analysis-service";
import { failure, success } from "../contracts/service-result";
import type { MockDatabase } from "./mock-database";

const id = () => `file-record-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

export class MockFileAnalysisService implements FileAnalysisService {
  constructor(private readonly database: MockDatabase) {}

  async register(enterpriseId: string, file: FileUploadSelection, task: FileAnalysisTask) {
    if (!this.database.read().enterprisesById[enterpriseId]) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    if (!file.displayName.trim() || file.byteSize < 0) return failure({ code: "VALIDATION_ERROR", message: "文件显示信息不完整", retryable: false });
    const now = new Date().toISOString();
    const record: FileAnalysisRecord = { id: id(), enterpriseId, displayName: file.displayName, mediaType: file.mediaType || "application/octet-stream", byteSize: file.byteSize, selectedTask: task, status: "registered", readingStatus: "not-read", contentRead: false, resultSummary: null, sourceAvailable: false, createdAt: now, updatedAt: now };
    this.database.transact((draft) => { draft.fileAnalysisRecordsById[record.id] = record; });
    return success(record);
  }

  async refreshStatus(recordId: string, enterpriseId: string) {
    const record = this.database.read().fileAnalysisRecordsById[recordId];
    if (!record || record.enterpriseId !== enterpriseId) return failure({ code: "NOT_FOUND", message: "文件记录不存在", retryable: false });
    const next: FileAnalysisRecord = record.status === "registered"
      ? { ...record, status: "processing", updatedAt: new Date().toISOString() }
      : record.displayName.includes("模拟失败")
        ? { ...record, status: "failed", readingStatus: "failed", contentRead: false, resultSummary: null, errorCode: "mock_processing_failed", updatedAt: new Date().toISOString() }
        : { ...record, status: "completed", readingStatus: "not-read", contentRead: false, resultSummary: "演示流程已完成；系统未读取文件正文，无法对真实内容下结论。", updatedAt: new Date().toISOString() };
    this.database.transact((draft) => { draft.fileAnalysisRecordsById[recordId] = next; });
    return success(next);
  }

  async get(recordId: string, enterpriseId: string) {
    const record = this.database.read().fileAnalysisRecordsById[recordId];
    return record?.enterpriseId === enterpriseId ? success(record) : failure({ code: "NOT_FOUND", message: "文件记录不存在", retryable: false });
  }

  async list(enterpriseId: string) {
    return success(Object.values(this.database.read().fileAnalysisRecordsById).filter((item) => item.enterpriseId === enterpriseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async getDownloadUrl() {
    return failure({ code: "NOT_FOUND", message: "演示模式不保存原文件", retryable: false });
  }

  async delete(recordId: string, enterpriseId: string) {
    const record = this.database.read().fileAnalysisRecordsById[recordId];
    if (!record || record.enterpriseId !== enterpriseId) return failure({ code: "NOT_FOUND", message: "文件记录不存在", retryable: false });
    this.database.transact((draft) => { delete draft.fileAnalysisRecordsById[recordId]; });
    return success(undefined);
  }
}
