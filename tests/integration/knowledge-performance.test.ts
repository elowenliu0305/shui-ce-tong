import { describe, expect, it } from "vitest";

import { createTestAdminClient, integrationTestsConfigured } from "./helpers/supabase";

const configured = integrationTestsConfigured()
  && Boolean(process.env.SUPABASE_TEST_SERVICE_ROLE_KEY)
  && process.env.RUN_KNOWLEDGE_PERFORMANCE_TESTS === "1";

function percentile95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

describe.skipIf(!configured)("knowledge search performance and generation safety", () => {
  it("keeps one complete active generation, acceptable HNSW recall and bounded p95", async () => {
    const admin = createTestAdminClient();
    const generations = await admin.from("embedding_generations")
      .select("id, status, validation_summary")
      .in("status", ["active", "retired"]);
    expect(generations.error).toBeNull();
    const active = (generations.data ?? []).filter((item) => item.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0].validation_summary).toMatchObject({
      chunkCount: expect.any(Number),
      embeddingCount: expect.any(Number),
    });

    const sample = await admin.from("chunk_embeddings").select("embedding")
      .eq("generation_id", active[0].id).limit(1).maybeSingle();
    expect(sample.error).toBeNull();
    expect(sample.data?.embedding).toBeTruthy();
    if (!sample.data?.embedding) return;

    const recall = await admin.rpc("validate_embedding_recall", {
      p_query_embedding: sample.data.embedding,
      p_limit: 10,
    });
    expect(recall.error).toBeNull();
    expect(Number(recall.data?.recall)).toBeGreaterThanOrEqual(0.9);

    const timings: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      const search = await admin.rpc("hybrid_search", {
        p_query: "研发费用加计扣除",
        p_query_tokens: ["研", "研发", "发费", "费用", "加计", "扣除"],
        p_query_embedding: sample.data.embedding,
        p_kind: "policy",
        p_reliable: true,
        p_as_of_date: "2026-10-19",
        p_limit: 10,
      });
      expect(search.error).toBeNull();
      timings.push(performance.now() - started);
    }
    expect(percentile95(timings)).toBeLessThan(Number(process.env.KNOWLEDGE_SEARCH_P95_MS ?? 2_000));
  }, 60_000);
});
