import type { ISODate, ISODateTime } from "./shared";

export type KnowledgeKind = "policy" | "news" | "case" | "other";
export type EffectiveStatus = "effective" | "expired" | "repealed" | "partial" | "unknown";

export interface KnowledgeSource {
  id: string;
  originalFileName: string;
  relativePath: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  normalizedTextSha256: string | null;
  extractionStatus: "parsed" | "failed" | "partial";
  exactDuplicateOf: string | null;
  suspectedDuplicateGroup: string | null;
  downloadRef: string;
}

export interface KnowledgeDocument {
  id: string;
  kind: KnowledgeKind;
  sourceIds: string[];
  title: string;
  docNo: string | null;
  issuer: string[];
  publishedAt: ISODate | null;
  effectiveStatus: EffectiveStatus;
  parseStatus: "parsed" | "failed" | "partial";
  fullText: string | null;
  summary: string | null;
  downloadRefs: string[];
  matchEligibility: "structured-verified" | "searchable-only";
  supersedes: string[];
  supersededBy: string[];
  createdAt: ISODateTime;
}

export interface Favorite {
  id: string;
  accountId: string;
  targetType: KnowledgeKind;
  targetId: string;
  createdAt: ISODateTime;
}

export interface KnowledgeQuery {
  query?: string;
  kind?: KnowledgeKind | "all";
  effectiveStatus?: EffectiveStatus | "all";
  favoritesOnly?: boolean;
  enterpriseId?: string;
}

export interface KnowledgeListItem {
  document: KnowledgeDocument;
  favorite: boolean;
  applicability: "eligible" | "pending" | "ineligible" | "not-evaluated";
}

export interface DownloadDescriptor {
  documentId: string;
  fileName: string;
  mimeType: string;
  downloadRef: string;
  available: boolean;
}
