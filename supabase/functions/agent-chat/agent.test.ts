import { describe, expect, it, vi } from "vitest";

import { finalizeModelAnswer, insufficientTaxAnswer, type AgentSearchCitation } from "./answer-policy.ts";
import { routeAgentIntent, requiresReliableRetrieval } from "./intent-router.ts";
import { runAgentTurn } from "./orchestrator.ts";

const citation: AgentSearchCitation = {
  citationId: "citation-1",
  documentId: "document-1",
  documentVersionId: "version-1",
  chunkId: "chunk-1",
  title: "研发费用税前加计扣除政策指引",
  documentNumber: null,
  issuer: ["国家税务总局"],
  validityStatus: "current",
  locator: { headingPath: ["适用条件"], charStart: 0, charEnd: 20 },
  excerpt: "企业应归集研发费用。",
  score: 0.9,
};

describe("Agent 意图和 RAG 证据门控", () => {
  it("区分四类意图，并对税务问题强制可靠检索", () => {
    expect(routeAgentIntent({ message: "介绍一下你自己" })).toBe("general");
    expect(routeAgentIntent({ message: "研发费用加计扣除有什么依据？" })).toBe("tax_policy_case");
    expect(routeAgentIntent({ message: "这份体检报告先处理哪个风险？" })).toBe("enterprise_report");
    expect(routeAgentIntent({ message: "怎么改善现金流？" })).toBe("sme_finance_operations");
    expect(requiresReliableRetrieval("tax_policy_case")).toBe(true);
    expect(requiresReliableRetrieval("general")).toBe(false);
  });

  it("没有可靠候选时返回依据不足，不调用模型", async () => {
    const generate = vi.fn();
    const result = await runAgentTurn(
      { message: "某个未知税收政策是否可用？" },
      { retrieveReliable: async () => [], buildContext: async () => ({}), generate },
    );
    expect(result).toEqual(insufficientTaxAnswer());
    expect(generate).not.toHaveBeenCalled();
  });

  it("只保留当次检索候选中的 citation ID", () => {
    const result = finalizeModelAnswer("tax_policy_case", {
      answer: "根据已检索的现行资料，还需结合具体归集口径判断。",
      citationIds: ["forged-citation", "citation-1"],
    }, [citation]);
    expect(result.status).toBe("completed");
    expect(result.citations.map((item) => item.citationId)).toEqual(["citation-1"]);
  });

  it("模型只给出伪造引用时降级为依据不足", () => {
    const result = finalizeModelAnswer("tax_policy_case", { answer: "确定结论", citationIds: ["forged"] }, [citation]);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.citations).toEqual([]);
    expect(result.content).toContain("不能直接给出确定的税务结论");
  });

  it("普通问题不接受模型伪造引用，并引导小微经营场景", async () => {
    const result = await runAgentTurn(
      { message: "如何做一个好的复盘？" },
      {
        retrieveReliable: async () => { throw new Error("should_not_search"); },
        buildContext: async () => ({}),
        generate: async () => ({ answer: "可以从目标、偏差和下一步行动展开，若用于小微企业还可继续梳理现金流与成本。", citationIds: ["forged"] }),
      },
    );
    expect(result.status).toBe("completed");
    expect(result.citations).toEqual([]);
    expect(result.content).toContain("小微企业");
  });
});
