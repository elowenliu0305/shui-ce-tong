import { describe, expect, it } from "vitest";

import { MockAgentService } from "../../src/services/mock/mock-agent-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { createMemoryStorage } from "../test-storage";

describe("MockAgentService", () => {
  const create = () => new MockAgentService(createMockDatabase(createMemoryStorage()));

  it.each([
    ["你好，可以介绍一下你吗？", "general", "completed"],
    ["研发费用加计扣除有什么依据？", "tax-rag", "completed"],
    ["这个神秘税政策适用吗？", "tax-rag", "insufficient-evidence"],
    ["怎么改善现金流？", "financial-guidance", "completed"],
    ["模拟工具错误：税务问题", "tax-rag", "tool-error"],
    ["模拟模型错误", "general", "model-error"]
  ] as const)("routes %s", async (message, intent, status) => {
    const result = await create().ask({ enterpriseId: "enterprise-nebula", message });
    expect(result.ok && result.data.intent).toBe(intent);
    expect(result.ok && result.data.status).toBe(status);
    if (result.ok && intent === "tax-rag" && status === "completed") expect(result.data.citations.length).toBeGreaterThan(0);
    if (result.ok && intent === "general") expect(result.data.citations).toHaveLength(0);
  });

  it("uses report context without exposing executable HTML", async () => {
    const database = createMockDatabase(createMemoryStorage());
    database.transact((draft) => { draft.reportSnapshotsById.report = { id: "report", enterpriseId: "enterprise-nebula", result: { riskSummary: { confirmedRiskCount: 2, pendingVerificationCount: 1 }, citations: [] } } as never; });
    const service = new MockAgentService(database);
    const result = await service.ask({ enterpriseId: "enterprise-nebula", reportSnapshotId: "report", message: "我的报告先处理什么？" });
    expect(result.ok && result.data.intent).toBe("enterprise-context");
    expect(result.ok && result.data.answer).not.toMatch(/<[^>]+>/);
  });
});
