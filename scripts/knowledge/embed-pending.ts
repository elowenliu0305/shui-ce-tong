import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface ChunkRow { id: string; content: string }
interface EmbeddingResponse { data?: Array<{ index: number; embedding: number[] }>; error?: { message?: string } }

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) throw new Error("embedding_zero_norm");
  return values.map((value) => value / norm);
}

function endpoint(baseUrl: string): string {
  const clean = baseUrl.replace(/\/$/, "");
  return clean.endsWith("/embeddings") ? clean : `${clean}/embeddings`;
}

async function requestEmbeddings(inputs: string[]): Promise<number[][]> {
  const dimension = Number.parseInt(process.env.EMBEDDING_DIMENSION ?? "1024", 10);
  let lastError = "embedding_request_failed";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(endpoint(required("EMBEDDING_API_BASE_URL")), {
      method: "POST",
      headers: { Authorization: `Bearer ${required("EMBEDDING_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.EMBEDDING_MODEL ?? "Qwen/Qwen3-Embedding-0.6B", input: inputs, encoding_format: "float", dimensions: dimension }),
      signal: AbortSignal.timeout(45_000),
    });
    const body = await response.json() as EmbeddingResponse;
    if (response.ok && body.data?.length === inputs.length) {
      return body.data.sort((a, b) => a.index - b.index).map((item) => {
        if (item.embedding.length !== dimension || item.embedding.some((value) => !Number.isFinite(value))) throw new Error("embedding_dimension_mismatch");
        return normalize(item.embedding);
      });
    }
    lastError = body.error?.message ?? `embedding_http_${response.status}`;
    if (response.status !== 429 && response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
  }
  throw new Error(lastError);
}

async function allChunks(client: SupabaseClient): Promise<ChunkRow[]> {
  const rows: ChunkRow[] = [];
  for (let from = 0; ; from += 1_000) {
    const { data, error } = await client.from("knowledge_chunks").select("id, content").order("id").range(from, from + 999);
    if (error) throw new Error(`读取待向量化分块失败: ${error.message}`);
    rows.push(...(data as ChunkRow[]));
    if (!data || data.length < 1_000) return rows;
  }
}

async function generationId(client: SupabaseClient): Promise<string> {
  const supplied = argument("--generation");
  if (supplied) return supplied;
  const model = process.env.EMBEDDING_MODEL ?? "Qwen/Qwen3-Embedding-0.6B";
  const dimension = Number.parseInt(process.env.EMBEDDING_DIMENSION ?? "1024", 10);
  const { data, error } = await client.from("embedding_generations").insert({
    model_name: model,
    model_revision: process.env.EMBEDDING_MODEL_REVISION ?? "provider-current",
    dimension,
    normalized: true,
    chunking_version: "structured-zh-v1",
    status: "building",
  }).select("id").single();
  if (error || !data) throw new Error(`创建 embedding generation 失败: ${error?.message ?? "未返回 ID"}`);
  return String(data.id);
}

export async function embedPendingChunks() {
  const client = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const generation = await generationId(client);
  const chunks = await allChunks(client);
  const existingResult = await client.from("chunk_embeddings").select("chunk_id").eq("generation_id", generation);
  if (existingResult.error) throw new Error(`读取已生成向量失败: ${existingResult.error.message}`);
  const existing = new Set((existingResult.data ?? []).map((row) => String(row.chunk_id)));
  const pending = chunks.filter((chunk) => !existing.has(chunk.id));
  for (let start = 0; start < pending.length; start += 16) {
    const batch = pending.slice(start, start + 16);
    const embeddings = await requestEmbeddings(batch.map((chunk) => chunk.content));
    const rows = batch.map((chunk, index) => ({
      chunk_id: chunk.id,
      generation_id: generation,
      embedding: `[${embeddings[index].join(",")}]`,
    }));
    const inserted = await client.from("chunk_embeddings").upsert(rows, { onConflict: "chunk_id,generation_id", ignoreDuplicates: true });
    if (inserted.error) throw new Error(`保存向量失败: ${inserted.error.message}`);
    process.stdout.write(`向量进度 ${Math.min(start + batch.length, pending.length)}/${pending.length}\n`);
  }
  const validating = await client.from("embedding_generations").update({ status: "validating" }).eq("id", generation).eq("status", "building");
  if (validating.error) throw new Error(`更新 generation 状态失败: ${validating.error.message}`);
  return { generationId: generation, chunkCount: chunks.length, embeddedCount: pending.length };
}

void embedPendingChunks().then((result) => {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
