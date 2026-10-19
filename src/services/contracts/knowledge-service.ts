import type {
  DownloadDescriptor,
  KnowledgeDocument,
  KnowledgeListItem,
  KnowledgeQuery
} from "../../domain/knowledge";
import type { PageResult, ServiceResult } from "./service-result";

export interface KnowledgeService {
  list(accountId: string, query?: KnowledgeQuery): Promise<ServiceResult<PageResult<KnowledgeListItem>>>;
  get(accountId: string, documentId: string, enterpriseId?: string): Promise<ServiceResult<KnowledgeListItem>>;
  setFavorite(accountId: string, documentId: string, favorite: boolean): Promise<ServiceResult<boolean>>;
  getDownload(documentId: string): Promise<ServiceResult<DownloadDescriptor>>;
  getRawDocument(documentId: string): Promise<ServiceResult<KnowledgeDocument>>;
}
