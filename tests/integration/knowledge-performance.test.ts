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

  it("hybrid search 的精确标题路径与全管线结果一致（exact-scan 对照）", async () => {
    const admin = createTestAdminClient();
    const docs = await admin.from("knowledge_public_documents")
      .select("id, version_id, title, document_number, validity_status")
      .eq("validity_status", "current")
      .eq("review_status", "verified")
      .order("id").limit(5);
    expect(docs.error).toBeNull();
    const targets = (docs.data ?? []).filter((item) => item.title && item.title.trim().length > 0);
    expect(targets.length).toBeGreaterThan(0);

    for (const target of targets) {
      // 对照基线：只走精确/元数据路径（无分词、无向量），标题精确命中必须排第一。
      const exact = await admin.rpc("hybrid_search", {
        p_query: target.title,
        p_query_tokens: [],
        p_query_embedding: null,
        p_kind: null,
        p_reliable: false,
        p_limit: 10,
      });
      expect(exact.error).toBeNull();
      expect((exact.data ?? [])[0]).toMatchObject({ document_id: target.id, document_version_id: target.version_id });

      // 全管线（带向量）下，精确命中的文档仍须保持在前三的文档集合内。
      const sample = await admin.from("chunk_embeddings").select("embedding")
        .limit(1).maybeSingle();
      const full = await admin.rpc("hybrid_search", {
        p_query: target.title,
        p_query_tokens: [],
        p_query_embedding: sample.data?.embedding ?? null,
        p_kind: null,
        p_reliable: false,
        p_limit: 10,
      });
      expect(full.error).toBeNull();
      const topDocuments = [...new Set((full.data ?? []).map((row: { document_id: string }) => row.document_id))].slice(0, 3);
      expect(topDocuments).toContain(target.id);
    }
  }, 120_000);

  it("embedding generation 可回滚到上一个 active 版本并恢复", async () => {
    const admin = createTestAdminClient();
    const generations = await admin.from("embedding_generations")
      .select("id, status, activated_at")
      .in("status", ["active", "retired"])
      .order("activated_at", { ascending: false });
    expect(generations.error).toBeNull();
    const active = (generations.data ?? []).filter((item) => item.status === "active");
    expect(active).toHaveLength(1);
    const retired = (generations.data ?? []).filter((item) => item.status === "retired");
    if (retired.length === 0) return; // 尚无历史 generation 可回滚

    const rollbackTarget = retired[0];
    const restored = await admin.rpc("activate_embedding_generation", { p_generation_id: rollbackTarget.id });
    expect(restored.error).toBeNull();

    const afterRollback = await admin.from("embedding_generations").select("id, status")
      .in("id", [active[0].id, rollbackTarget.id]);
    expect(afterRollback.error).toBeNull();
    const statusOf = (id: string) => (afterRollback.data ?? []).find((item) => item.id === id)?.status;
    expect(statusOf(rollbackTarget.id)).toBe("active");
    expect(statusOf(active[0].id)).toBe("retired");

    const searchAfterRollback = await admin.rpc("hybrid_search", {
      p_query: "研发费用加计扣除",
      p_query_tokens: ["研", "研发", "费用", "扣除"],
      p_query_embedding: null,
      p_kind: null,
      p_reliable: false,
      p_limit: 5,
    });
    expect(searchAfterRollback.error).toBeNull();

    // 恢复原 active generation，保证后续测试基线不变。
    const restore = await admin.rpc("activate_embedding_generation", { p_generation_id: active[0].id });
    expect(restore.error).toBeNull();
    const afterRestore = await admin.from("embedding_generations").select("id, status")
      .in("id", [active[0].id, rollbackTarget.id]);
    expect(afterRestore.error).toBeNull();
    expect(afterRestore.data?.find((item) => item.id === active[0].id)?.status).toBe("active");
    expect(afterRestore.data?.find((item) => item.id === rollbackTarget.id)?.status).toBe("retired");
  }, 60_000);
});
