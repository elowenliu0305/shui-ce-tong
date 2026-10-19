import type { RiskQuestion, RiskQuestionnaireDraft, RiskSummary } from "./types";

export interface RiskEvaluation extends RiskSummary {
  answeredCount: number;
  unansweredQuestionIds: string[];
}

export function evaluateRisk(
  questions: RiskQuestion[],
  answersByQuestionId: RiskQuestionnaireDraft["answersByQuestionId"],
): RiskEvaluation {
  const items: RiskSummary["items"] = [];
  const pendingItems: RiskSummary["pendingItems"] = [];
  const unansweredQuestionIds: string[] = [];

  for (const question of [...questions].sort((a, b) => a.order - b.order)) {
    const optionId = answersByQuestionId[question.id];
    const selected = question.options.find((option) => option.id === optionId);
    if (!selected) {
      unansweredQuestionIds.push(question.id);
      continue;
    }
    if (selected.effect === "risk") {
      items.push({ questionId: question.id, questionTitle: question.title, optionId: selected.id, answerLabel: selected.label, riskPoints: 1 });
    } else if (selected.effect === "unknown") {
      pendingItems.push({ questionId: question.id, questionTitle: question.title, optionId: selected.id, answerLabel: selected.label });
    }
  }

  const confirmedRiskCount = items.length;
  return {
    confirmedRiskCount,
    pendingVerificationCount: pendingItems.length,
    level: confirmedRiskCount <= 2 ? "low" : confirmedRiskCount <= 5 ? "medium" : "high",
    healthPercent: (10 - confirmedRiskCount) * 10,
    items,
    pendingItems,
    answeredCount: questions.length - unansweredQuestionIds.length,
    unansweredQuestionIds,
  };
}
