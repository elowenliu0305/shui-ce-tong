import type {
  FileAnalysisRecord,
  FileAnalysisTask,
  FileUploadSelection
} from "../../domain/file-analysis";
import type { ServiceResult } from "./service-result";

export interface FileAnalysisService {
  register(
    enterpriseId: string,
    file: FileUploadSelection,
    task: FileAnalysisTask
  ): Promise<ServiceResult<FileAnalysisRecord>>;
  refreshStatus(recordId: string, enterpriseId: string): Promise<ServiceResult<FileAnalysisRecord>>;
  get(recordId: string, enterpriseId: string): Promise<ServiceResult<FileAnalysisRecord>>;
  list(enterpriseId: string): Promise<ServiceResult<FileAnalysisRecord[]>>;
  getDownloadUrl(recordId: string, enterpriseId: string): Promise<ServiceResult<string>>;
  delete(recordId: string, enterpriseId: string): Promise<ServiceResult<void>>;
}
