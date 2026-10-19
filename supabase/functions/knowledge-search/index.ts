import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { logEvent } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { tokenizeChineseSearch } from "../_shared/search-tokens.ts";

interface SearchRequest {
  query?: string;
  mode?: "discovery" | "reliable_tax";
  asOfDate?: string;
  filters?: { kind?: string };
  limit?: number;
}

interface EmbeddingResponse {
  data?: Array<{ embedding: number[] }>;
}

function embeddingEndpoint(base: string): string {
  const clean = base.replace(/\/$/, "");
  return clean.endsWith("/embeddings") ? clean : `${clean}/embeddings`;
}

async function queryEmbedding(query: string): Promise<string | null> {
  const base = Deno.env.get("EMBEDDING_API_BASE_URL")?.trim();
  const key = Deno.env.get("EMBEDDING_API_KEY")?.trim();
  if (!base || !key) return null;
  const response = await fetch(embeddingEndpoint(base), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("EMBEDDING_MODEL") ?? "Qwen/Qwen3-Embedding-0.6B", input: [query], encoding_format: "float", dimensions: 1024 }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`embedding_http_${response.status}`);
  const values = (await response.json() as EmbeddingResponse).data?.[0]?.embedding;
  if (!values || values.length !== 1024 || values.some((value) => !Number.isFinite(value))) throw new Error("embedding_dimension_mismatch");
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) throw new Error("embedding_zero_norm");
  return `[${values.map((value) => value / norm).join(",")}]`;
}

Deno.serve((request) => handleRequest(request, async ({ requestId }) => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user } = await requireUser(request);
  enforceRateLimit(`knowledge-search:${user.id}`, { limit: 60, windowMs: 60_000 });
  const body = await request.json() as SearchRequest;
  const query = body.query?.trim() ?? "";
  const limit = body.limit ?? 10;
  const mode = body.mode ?? "discovery";
  if (!query || query.length > 500 || !Number.isInteger(limit) || limit < 1 || limit > 20 || !["discovery", "reliable_tax"].includes(mode)) {
    throw new HttpError(400, "validation_failed", "搜索条件不完整。", false);
  }
  const asOfDate = body.asOfDate ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) throw new HttpError(400, "validation_failed", "查询日期格式不正确。", false);

  let embedding: string | null = null;
  try {
    embedding = await queryEmbedding(query);
  } catch (error) {
    logEvent("warn", "knowledge.embedding.unavailable", { requestId, code: error instanceof Error ? error.message : "embedding_failed" });
  }
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("hybrid_search", {
    p_query: query,
    p_query_tokens: tokenizeChineseSearch(query),
    p_query_embedding: embedding,
    p_kind: body.filters?.kind ?? null,
    p_reliable: mode === "reliable_tax",
    p_as_of_date: asOfDate,
    p_limit: limit,
  });
  if (error) {
    logEvent("error", "knowledge.search.failed", { requestId, code: error.code });
    throw new HttpError(503, "dependency_unavailable", "资料检索暂时不可用，请稍后重试。", true);
  }
  const items = (data ?? []).map((row: Record<string, unknown>) => ({
    citationId: row.citation_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    chunkId: row.chunk_id,
    title: row.title,
    documentNumber: row.document_number,
    issuer: row.issuer,
    category: row.category,
    validityStatus: row.validity_status,
    reviewStatus: row.review_status,
    locator: { headingPath: row.heading_path, charStart: row.char_start, charEnd: row.char_end },
    excerpt: row.excerpt,
    score: row.fused_score,
  }));
  logEvent("info", "knowledge.search.completed", { requestId, mode, resultCount: items.length, semanticUsed: Boolean(embedding) });
  return { items, requestId };
}));
