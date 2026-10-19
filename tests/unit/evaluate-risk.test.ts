import { describe, expect, it } from "vitest";

import { evaluateRisk } from "../../src/domain/rules/evaluate-risk";
import { riskQuestions } from "../../src/fixtures/risk-questions";

function answersWithRiskCount(count: number) {
  return Object.fromEntries(riskQuestions.map((question, index) => [question.id, question.options[index < count ? 1 : 0].id]));
}

describe("evaluateRisk", () => {
  it.each([
    [0, "low", 100], [2, "low", 80], [3, "medium", 70], [5, "medium", 50], [6, "high", 40], [10, "high", 0]
  ] as const)("maps %i risk answers to %s", (count, level, healthPercent) => {
    const result = evaluateRisk(riskQuestions, answersWithRiskCount(count));
    expect(result.confirmedRiskCount).toBe(count);
    expect(result.level).toBe(level);
    expect(result.healthPercent).toBe(healthPercent);
  });

  it("counts unknown as pending with zero risk points", () => {
    const answers = answersWithRiskCount(3);
    answers[riskQuestions[3].id] = riskQuestions[3].options.at(-1)!.id;
    const result = evaluateRisk(riskQuestions, answers);
    expect(result.confirmedRiskCount).toBe(3);
    expect(result.pendingVerificationCount).toBe(1);
    expect(result.healthPercent).toBe(70);
  });

  it("treats every non-first option of question 10 as risk", () => {
    const question = riskQuestions[9];
    for (const selected of question.options.slice(1)) {
      const result = evaluateRisk(riskQuestions, { ...answersWithRiskCount(0), [question.id]: selected.id });
      expect(result.confirmedRiskCount).toBe(1);
      expect(result.pendingVerificationCount).toBe(0);
    }
  });
});
