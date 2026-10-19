import { describe, expect, it } from "vitest";

import { riskQuestions } from "../../src/fixtures/risk-questions";
import { MockAssessmentService } from "../../src/services/mock/mock-assessment-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { createMemoryStorage } from "../test-storage";

describe("report snapshots", () => {
  it("reads the requested immutable snapshot after a newer assessment is completed", async () => {
    const database = createMockDatabase(createMemoryStorage());
    const service = new MockAssessmentService(database);
    const riskDraft = await service.getRiskDraft("enterprise-nebula");
    if (!riskDraft.ok) throw new Error("risk draft missing");
    const safeAnswers = Object.fromEntries(riskQuestions.map((question) => [question.id, question.options[0].id]));
    await service.saveRiskDraft({ ...riskDraft.data, answersByQuestionId: safeAnswers });
    const first = await service.complete("enterprise-nebula");
    if (!first.ok) throw new Error(first.error.message);

    const changedAnswers = { ...safeAnswers, penalty: riskQuestions[0].options[1].id };
    await service.saveRiskDraft({ ...riskDraft.data, answersByQuestionId: changedAnswers });
    const second = await service.complete("enterprise-nebula");
    if (!second.ok) throw new Error(second.error.message);

    const requestedFirst = await service.getReport(first.data.id);
    expect(requestedFirst.ok && requestedFirst.data.result.riskSummary.healthPercent).toBe(100);
    expect(second.data.result.riskSummary.healthPercent).toBe(90);
    expect(Object.keys(database.read().reportSnapshotsById)).toHaveLength(2);
  });
});
