import type { ISODateTime } from "./shared";

export type FileAnalysisTask = "tax-health" | "rd-check" | "invoice-check" | "cashflow-summary";

export interface FileSelectionMetadata {
  displayName: string;
  mediaType: string;
  byteSize: number;
}

export interface FileUploadSelection extends FileSelectionMetadata {
  /** 仅存在于当前页面内存中；服务不得把 File/Blob 写入应用快照。 */
  sourceFile?: File;
}

export type FileReadingStatus = "not-read" | "partial" | "complete" | "failed";
export type FileProcessingStatus = "registered" | "uploading" | "processing" | "completed" | "failed";

export interface FileAnalysisRecord extends FileSelectionMetadata {
  id: string;
  fileId?: string;
  enterpriseId: string;
  selectedTask: FileAnalysisTask;
  status: FileProcessingStatus;
  readingStatus: FileReadingStatus;
  contentRead: boolean;
  resultSummary: string | null;
  errorCode?: string | null;
  sourceAvailable?: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
