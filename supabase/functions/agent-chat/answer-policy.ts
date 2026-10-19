import { defaultFollowUps, type AgentRouteIntent } from "./intent-router.ts";

export interface AgentSearchCitation {
  citationId: string;
  documentId: string;
  documentVersionId: string;
  chunkId: string;
  title: string;
  documentNumber: string | null;
  issuer: string[];
  validityStatus: string;
  locator: Record<string, unknown>;
  excerpt: string;
  score: number;
}

export interface ModelAnswerDraft {
  answer: string;
  citationIds?: string[];
  suggestedQuestions?: string[];
}

export interface PreparedAgentAnswer {
  intent: AgentRouteIntent;
  status: "completed" | "insufficient_evidence" | "failed";
  content: string;
  citations: AgentSearchCitation[];
  toolsUsed: string[];
  suggestedQuestions: string[];
  errorStage: "retrieval" | "context" | "model" | "persistence" | null;
}

export function insufficientTaxAnswer(): PreparedAgentAnswer {
  return {
    intent: "tax_policy_case",
    status: "insufficient_evidence",
    content: "当前资料库没有检索到足够可靠的依据，因此我不能直接给出确定的税务结论。你可以补充政策名称、文号、地区或具体业务背景。",
    citations: [],
    toolsUsed: ["knowledge-search"],
    suggestedQuestions: defaultFollowUps("tax_policy_case"),
    errorStage: null,
  };
}

function safeSuggestions(intent: AgentRouteIntent, suggestions?: string[]): string[] {
  const values = (suggestions ?? []).map((value) => value.trim()).filter(Boolean).slice(0, 3);
  return values.length ? values : defaultFollowUps(intent);
}

export function finalizeModelAnswer(
  intent: AgentRouteIntent,
  draft: ModelAnswerDraft,
  candidates: AgentSearchCitation[] = [],
): PreparedAgentAnswer {
  const content = draft.answer.trim();
  if (!content) throw new Error("model_empty_answer");
  if (intent === "tax_policy_case") {
    if (!candidates.length) return insufficientTaxAnswer();
    const allowed = new Map(candidates.map((citation) => [citation.citationId, citation]));
    const citations = [...new Set(draft.citationIds ?? [])]
      .map((id) => allowed.get(id))
      .filter((citation): citation is AgentSearchCitation => Boolean(citation));
    if (!citations.length) return insufficientTaxAnswer();
    return {
      intent,
      status: "completed",
      content,
      citations,
      toolsUsed: ["knowledge-search", "citation-check", "model"],
      suggestedQuestions: safeSuggestions(intent, draft.suggestedQuestions),
      errorStage: null,
    };
  }
  return {
    intent,
    status: "completed",
    content,
    citations: [],
    toolsUsed: intent === "enterprise_report" ? ["enterprise-context", "model"] : ["model"],
    suggestedQuestions: safeSuggestions(intent, draft.suggestedQuestions),
    errorStage: null,
  };
}

export function failedAgentAnswer(intent: AgentRouteIntent, stage: NonNullable<PreparedAgentAnswer["errorStage"]>): PreparedAgentAnswer {
  const message = stage === "retrieval"
    ? "资料检索服务暂时不可用，未生成税务结论。请稍后重试。"
    : stage === "context"
      ? "当前企业或报告上下文不可用，我没有根据其他企业数据作答。"
      : stage === "model"
        ? "回答服务暂时不可用，请稍后重试。"
        : "回答保存失败，请使用原请求重试。";
  return {
    intent,
    status: "failed",
    content: message,
    citations: [],
    toolsUsed: stage === "retrieval" ? ["knowledge-search:error"] : stage === "context" ? ["enterprise-context:error"] : [],
    suggestedQuestions: ["稍后重试"],
    errorStage: stage,
  };
}
