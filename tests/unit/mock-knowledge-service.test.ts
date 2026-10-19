import { describe, expect, it } from "vitest";

import { createMockDatabase } from "../../src/services/mock/mock-database";
import { MockKnowledgeService } from "../../src/services/mock/mock-knowledge-service";
import { createMemoryStorage } from "../test-storage";

describe("MockKnowledgeService", () => {
  it.each(["研发费用", "财税演示〔2026〕01号", "国家税务总局", "从业人数"])("searches title, document number, issuer or full text: %s", async (query) => {
    const service = new MockKnowledgeService(createMockDatabase(createMemoryStorage()));
    const result = await service.list("account-demo", { query });
    expect(result.ok && result.data.total).toBeGreaterThan(0);
  });

  it("returns zero results and filters effective status", async () => {
    const service = new MockKnowledgeService(createMockDatabase(createMemoryStorage()));
    const empty = await service.list("account-demo", { query: "不存在的极特殊词" });
    const expired = await service.list("account-demo", { effectiveStatus: "expired" });
    expect(empty.ok && empty.data.total).toBe(0);
    expect(expired.ok && expired.data.items.every((item) => item.document.effectiveStatus === "expired")).toBe(true);
  });

  it("keeps a download descriptor when extraction failed", async () => {
    const service = new MockKnowledgeService(createMockDatabase(createMemoryStorage()));
    const document = await service.getRawDocument("doc-digital-case");
    const download = await service.getDownload("doc-digital-case");
    expect(document.ok && document.data.parseStatus).toBe("failed");
    expect(download.ok && download.data.available).toBe(true);
  });
});
