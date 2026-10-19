import type { EffectiveStatus, KnowledgeDocument, KnowledgeKind, KnowledgeListItem, KnowledgeQuery } from "../../domain/knowledge";
import type { KnowledgeService } from "../contracts/knowledge-service";
import { failure, success } from "../contracts/service-result";
import { getSupabaseClient } from "./client";
import type { ServerErrorEnvelope } from "./types";
import { toAppError } from "./types";

interface PublicDocumentRow {
  id: string;
  category: string;
  source_ids: string[] | null;
  title: string;
  document_number: string | null;
  issuer: string[] | null;
  published_on: string | null;
  validity_status: string;
  parse_status: string;
  body_text: string | null;
  summary: string | null;
  review_status: string;
  created_at: string;
}

interface SearchResponse {
  items: Array<{ documentId: string }>;
  requestId: string;
}

function kind(value: string): KnowledgeKind {
  return value === "policy" || value === "news" || value === "case" ? value : "other";
}

function effectiveStatus(value: string): EffectiveStatus {
  if (value === "current") return "effective";
  if (value === "superseded") return "expired";
  if (value === "repealed") return "repealed";
  if (value === "partially_effective") return "partial";
  return "unknown";
}

function mapDocument(row: PublicDocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    kind: kind(row.category),
    sourceIds: row.source_ids ?? [],
    title: row.title,
    docNo: row.document_number,
    issuer: row.issuer ?? [],
    publishedAt: row.published_on,
    effectiveStatus: effectiveStatus(row.validity_status),
    parseStatus: row.parse_status === "parsed" ? "parsed" : row.parse_status === "partial" ? "partial" : "failed",
    fullText: row.body_text,
    summary: row.summary,
    downloadRefs: [],
    matchEligibility: row.review_status === "verified" ? "structured-verified" : "searchable-only",
    supersedes: [],
    supersededBy: [],
    createdAt: row.created_at,
  };
}

function serviceError(message = "资料库暂时不可用，请稍后重试") {
  return failure({ code: "STORAGE_ERROR", message, retryable: true });
}

export class SupabaseKnowledgeService implements KnowledgeService {
  private readonly client = getSupabaseClient();

  private async favoriteIds(accountId: string): Promise<Set<string> | null> {
    const { data, error } = await this.client.from("favorites").select("document_id").eq("owner_id", accountId);
    return error ? null : new Set((data ?? []).map((row) => String(row.document_id)));
  }

  private applicability(document: KnowledgeDocument): KnowledgeListItem["applicability"] {
    return document.effectiveStatus === "expired" || document.effectiveStatus === "repealed" ? "ineligible" : "not-evaluated";
  }

  async list(accountId: string, query: KnowledgeQuery = {}) {
    let orderedIds: string[] | null = null;
    if (query.query?.trim()) {
      const search = await this.client.functions.invoke<SearchResponse | ServerErrorEnvelope>("knowledge-search", {
        body: { query: query.query.trim(), mode: "discovery", filters: { kind: query.kind ?? "all" }, limit: 20 },
      });
      if (search.error || !search.data) return serviceError("资料搜索暂时不可用，请稍后重试");
      if ("error" in search.data) return failure(toAppError(search.data));
      orderedIds = [...new Set(search.data.items.map((item) => item.documentId))];
      if (!orderedIds.length) return success({ items: [], total: 0, nextCursor: null });
    }

    let request = this.client.from("knowledge_public_documents").select("*").limit(500);
    if (orderedIds) request = request.in("id", orderedIds);
    if (query.kind && query.kind !== "all") request = request.eq("category", query.kind);
    const expectedValidity = query.effectiveStatus === "effective" ? "current"
      : query.effectiveStatus === "expired" ? "superseded"
        : query.effectiveStatus === "partial" ? "partially_effective"
          : query.effectiveStatus;
    if (expectedValidity && expectedValidity !== "all") request = request.eq("validity_status", expectedValidity);
    const [{ data, error }, favorites] = await Promise.all([request, this.favoriteIds(accountId)]);
    if (error || !favorites) return serviceError();
    let documents = (data as PublicDocumentRow[]).map(mapDocument);
    if (orderedIds) {
      const order = new Map(orderedIds.map((id, index) => [id, index]));
      documents = documents.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    } else documents.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    const items = documents
      .filter((document) => !query.favoritesOnly || favorites.has(document.id))
      .map((document) => ({ document, favorite: favorites.has(document.id), applicability: this.applicability(document) }));
    return success({ items, total: items.length, nextCursor: null });
  }

  async get(accountId: string, documentId: string) {
    const [{ data, error }, favorites] = await Promise.all([
      this.client.from("knowledge_public_documents").select("*").eq("id", documentId).maybeSingle(),
      this.favoriteIds(accountId),
    ]);
    if (error || !favorites) return serviceError();
    if (!data) return failure({ code: "NOT_FOUND", message: "资料不存在", retryable: false });
    const document = mapDocument(data as PublicDocumentRow);
    return success({ document, favorite: favorites.has(document.id), applicability: this.applicability(document) });
  }

  async setFavorite(accountId: string, documentId: string, favorite: boolean) {
    const result = favorite
      ? await this.client.from("favorites").upsert({ owner_id: accountId, document_id: documentId }, { onConflict: "owner_id,document_id", ignoreDuplicates: true })
      : await this.client.from("favorites").delete().eq("owner_id", accountId).eq("document_id", documentId);
    return result.error ? serviceError("收藏更新失败，请稍后重试") : success(favorite);
  }

  async getDownload(documentId: string) {
    const { data, error } = await this.client.functions.invoke<{ fileName: string; mimeType: string; signedUrl: string } | ServerErrorEnvelope>("knowledge-source-url", { body: { documentId } });
    if (error || !data) return serviceError("原始文件链接生成失败");
    if ("error" in data) return failure(toAppError(data));
    return success({ documentId, fileName: data.fileName, mimeType: data.mimeType, downloadRef: data.signedUrl, available: true });
  }

  async getRawDocument(documentId: string) {
    const { data, error } = await this.client.from("knowledge_public_documents").select("*").eq("id", documentId).maybeSingle();
    if (error) return serviceError();
    return data ? success(mapDocument(data as PublicDocumentRow)) : failure({ code: "NOT_FOUND", message: "资料不存在", retryable: false });
  }
}
