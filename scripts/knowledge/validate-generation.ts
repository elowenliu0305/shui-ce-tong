import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const generationId = argument("--generation");
  if (!generationId) throw new Error("用法：npm run knowledge:validate -- --generation <uuid>");
  const client = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const [chunks, embeddings] = await Promise.all([
    client.from("knowledge_chunks").select("id", { count: "exact", head: true }),
    client.from("chunk_embeddings").select("chunk_id", { count: "exact", head: true }).eq("generation_id", generationId),
  ]);
  if (chunks.error || embeddings.error) throw new Error(`generation 对账失败: ${chunks.error?.message ?? embeddings.error?.message}`);
  if (!chunks.count || chunks.count !== embeddings.count) throw new Error(`generation_incomplete: chunks=${chunks.count ?? 0}, embeddings=${embeddings.count ?? 0}`);
  const activated = await client.rpc("activate_embedding_generation", { p_generation_id: generationId });
  if (activated.error) throw new Error(`generation 激活失败: ${activated.error.message}`);
  process.stdout.write(`${JSON.stringify({ generationId, status: "active", chunkCount: chunks.count }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
