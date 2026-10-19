import { requestStructuredModelAnswer, type ModelMessage, type StructuredModelAnswer } from "../_shared/model-provider.ts";
import { failedAgentAnswer, finalizeModelAnswer, insufficientTaxAnswer, type AgentSearchCitation, type PreparedAgentAnswer } from "./answer-policy.ts";
import { routeAgentIntent } from "./intent-router.ts";

export interface AgentTurnInput {
  message: string;
  reportId?: string | null;
  knowledgeDocumentId?: string | null;
}

export interface AgentTurnDependencies {
  retrieveReliable: (query: string, documentId?: string | null) => Promise<AgentSearchCitation[]>;
  buildContext: () => Promise<Record<string, unknown>>;
  generate?: (messages: ModelMessage[]) => Promise<StructuredModelAnswer>;
}

function modelMessages(
  input: AgentTurnInput,
  intent: ReturnType<typeof routeAgentIntent>,
  citations: AgentSearchCitation[],
  context: Record<string, unknown> | null,
): ModelMessage[] {
  const evidence = citations.map((citation) => ({
    citationId: citation.citationId,
    title: citation.title,
    documentNumber: citation.documentNumber,
    issuer: citation.issuer,
    validityStatus: citation.validityStatus,
    locator: citation.locator,
    excerpt: citation.excerpt,
  }));
  return [
    {
      role: "system",
      content: [
        "你是面向小微企业的税务与经营助手。",
        "只输出 JSON：{answer:string,citationIds:string[],suggestedQuestions:string[]}。",
        "不要声称代替税务机关、法律或投资专业意见。",
        intent === "tax_policy_case" ? "税务结论只能使用 evidence，citationIds 只能选择 evidence 中的 citationId。" : "不得伪造政策引用，citationIds 返回空数组。",
        intent === "general" ? "可直接回答；若相关，自然引导到小微企业现金流、融资、成本或经营管理。" : "",
      ].filter(Boolean).join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({ intent, question: input.message, evidence, enterpriseContext: context }),
    },
  ];
}

export async function runAgentTurn(input: AgentTurnInput, dependencies: AgentTurnDependencies): Promise<PreparedAgentAnswer> {
  const intent = routeAgentIntent(input);
  let citations: AgentSearchCitation[] = [];
  let context: Record<string, unknown> | null = null;
  if (intent === "tax_policy_case") {
    try {
      citations = await dependencies.retrieveReliable(input.message, input.knowledgeDocumentId);
    } catch {
      return failedAgentAnswer(intent, "retrieval");
    }
    if (!citations.length) return insufficientTaxAnswer();
  }
  if (intent === "enterprise_report") {
    try {
      context = await dependencies.buildContext();
    } catch {
      return failedAgentAnswer(intent, "context");
    }
  }
  try {
    const generate = dependencies.generate ?? requestStructuredModelAnswer;
    const draft = await generate(modelMessages(input, intent, citations, context));
    return finalizeModelAnswer(intent, draft, citations);
  } catch {
    return failedAgentAnswer(intent, "model");
  }
}
