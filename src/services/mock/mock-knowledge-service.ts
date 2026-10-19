import type { KnowledgeDocument, KnowledgeListItem, KnowledgeQuery } from "../../domain/knowledge";
import { knowledgeDocuments, knowledgeSources } from "../../fixtures/knowledge";
import type { KnowledgeService } from "../contracts/knowledge-service";
import { failure, success } from "../contracts/service-result";
import type { MockDatabase } from "./mock-database";

const normalize = (value: string) => value.trim().toLocaleLowerCase("zh-CN");
const id = () => `favorite-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

function searchableText(document: KnowledgeDocument) {
  return [document.title, document.docNo, ...document.issuer, document.fullText, document.summary].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
}

export class MockKnowledgeService implements KnowledgeService {
  constructor(private readonly database: MockDatabase) {}

  private applicability(document: KnowledgeDocument, enterpriseId?: string): KnowledgeListItem["applicability"] {
    if (document.effectiveStatus === "expired" || document.effectiveStatus === "repealed") return "ineligible";
    if (!enterpriseId || document.kind !== "policy") return "not-evaluated";
    const reports = Object.values(this.database.read().reportSnapshotsById).filter((item) => item.enterpriseId === enterpriseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const match = reports[0]?.result.policyMatches.find((item) => item.policyVersionId.startsWith(`${document.id}@`));
    return match?.status ?? "not-evaluated";
  }

  async list(accountId: string, query: KnowledgeQuery = {}) {
    const needle = normalize(query.query ?? "");
    const favorites = Object.values(this.database.read().favoritesById).filter((item) => item.accountId === accountId);
    const favoriteIds = new Set(favorites.map((item) => item.targetId));
    const items = knowledgeDocuments
      .filter((document) => !needle || searchableText(document).includes(needle))
      .filter((document) => !query.kind || query.kind === "all" || document.kind === query.kind)
      .filter((document) => !query.effectiveStatus || query.effectiveStatus === "all" || document.effectiveStatus === query.effectiveStatus)
      .filter((document) => !query.favoritesOnly || favoriteIds.has(document.id))
      .map((document) => ({ document, favorite: favoriteIds.has(document.id), applicability: this.applicability(document, query.enterpriseId) }));
    return success({ items, total: items.length, nextCursor: null });
  }

  async get(accountId: string, documentId: string, enterpriseId?: string) {
    const document = knowledgeDocuments.find((item) => item.id === documentId);
    if (!document) return failure({ code: "NOT_FOUND", message: "资料不存在", retryable: false });
    const favorite = Object.values(this.database.read().favoritesById).some((item) => item.accountId === accountId && item.targetId === documentId);
    return success({ document, favorite, applicability: this.applicability(document, enterpriseId) });
  }

  async setFavorite(accountId: string, documentId: string, favorite: boolean) {
    if (!knowledgeDocuments.some((item) => item.id === documentId)) return failure({ code: "NOT_FOUND", message: "资料不存在", retryable: false });
    const existing = Object.values(this.database.read().favoritesById).find((item) => item.accountId === accountId && item.targetId === documentId);
    this.database.transact((draft) => {
      if (favorite && !existing) {
        const favoriteId = id();
        const document = knowledgeDocuments.find((item) => item.id === documentId)!;
        draft.favoritesById[favoriteId] = { id: favoriteId, accountId, targetType: document.kind, targetId: documentId, createdAt: new Date().toISOString() };
      } else if (!favorite && existing) delete draft.favoritesById[existing.id];
    });
    return success(favorite);
  }

  async getDownload(documentId: string) {
    const document = knowledgeDocuments.find((item) => item.id === documentId);
    const source = document ? knowledgeSources.find((item) => item.id === document.sourceIds[0]) : null;
    if (!document || !source) return failure({ code: "NOT_FOUND", message: "原始文件不存在", retryable: false });
    return success({ documentId, fileName: source.originalFileName, mimeType: source.mimeType, downloadRef: source.downloadRef, available: true });
  }

  async getRawDocument(documentId: string) {
    const document = knowledgeDocuments.find((item) => item.id === documentId);
    return document ? success(document) : failure({ code: "NOT_FOUND", message: "资料不存在", retryable: false });
  }
}
