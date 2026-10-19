import { describe, expect, it, vi } from "vitest";

import { projectSafeEnterpriseContext } from "../../supabase/functions/agent-chat/context-builder.ts";
import { runAgentTurn } from "../../supabase/functions/agent-chat/orchestrator.ts";

describe("Agent 工具编排与安全失败", () => {
  it("企业上下文只保留允许字段", () => {
    const context = projectSafeEnterpriseContext({
      enterprise: { id: "enterprise-a", region_province: "浙江省", region_city: "杭州市", industry: "软件业" },
      profileAnswers: {
        companyName: { status: "known", value: "敏感企业名" },
        unifiedSocialCreditCode: { status: "known", value: "9133-sensitive" },
        annualRevenue: { status: "known", value: { amountYuan: 100 } },
        taxpayerType: { status: "known", value: "小规模纳税人" },
      },
      reportId: "report-a",
      report: {
        enterpriseDisplay: { name: "敏感企业名" },
        result: { riskSummary: { level: "medium" }, priorityActions: ["补资料"] },
      },
    });
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain("敏感企业名");
    expect(serialized).not.toContain("9133-sensitive");
    expect(context.profile).toHaveProperty("annualRevenue");
    expect(context.report).toMatchObject({ reportId: "report-a", riskSummary: { level: "medium" } });
  });

  it("区分检索失败与模型失败，不伪装成成功", async () => {
    const retrievalFailure = await runAgentTurn(
      { message: "这项税收政策适用吗？" },
      { retrieveReliable: async () => { throw new Error("offline"); }, buildContext: async () => ({}) },
    );
    expect(retrievalFailure).toMatchObject({ status: "failed", errorStage: "retrieval", citations: [] });

    const modelFailure = await runAgentTurn(
      { message: "你好" },
      { retrieveReliable: async () => [], buildContext: async () => ({}), generate: async () => { throw new Error("offline"); } },
    );
    expect(modelFailure).toMatchObject({ status: "failed", errorStage: "model", citations: [] });
  });

  it("企业报告上下文失败时不调用模型", async () => {
    const generate = vi.fn();
    const result = await runAgentTurn(
      { message: "这份体检报告有哪些风险？", reportId: "report-other" },
      { retrieveReliable: async () => [], buildContext: async () => { throw new Error("not_owned"); }, generate },
    );
    expect(result).toMatchObject({ status: "failed", errorStage: "context" });
    expect(generate).not.toHaveBeenCalled();
  });
});
