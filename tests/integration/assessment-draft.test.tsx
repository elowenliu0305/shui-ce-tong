import { describe, expect, it } from "vitest";

import { known } from "../../src/domain/shared";
import { riskQuestions } from "../../src/fixtures/risk-questions";
import { MockAssessmentService } from "../../src/services/mock/mock-assessment-service";
import { createMockDatabase } from "../../src/services/mock/mock-database";
import { createMemoryStorage } from "../test-storage";

describe("assessment draft persistence", () => {
  it("keeps one autosave-style profile and risk draft per enterprise and restores them", async () => {
    const storage = createMemoryStorage();
    const firstDatabase = createMockDatabase(storage);
    const firstService = new MockAssessmentService(firstDatabase);
    const profile = await firstService.getProfileDraft("enterprise-nebula");
    const risk = await firstService.getRiskDraft("enterprise-nebula");
    if (!profile.ok || !risk.ok) throw new Error("seed enterprise missing");

    profile.data.fields.taxpayerType = known("一般纳税人");
    await firstService.saveProfileDraft(profile.data);
    await firstService.saveProfileDraft({ ...profile.data, fields: { ...profile.data.fields, employeeCount: known(32) } });
    await firstService.saveRiskDraft({ ...risk.data, answersByQuestionId: { [riskQuestions[0].id]: riskQuestions[0].options[1].id } });

    const restoredDatabase = createMockDatabase(storage);
    const restoredService = new MockAssessmentService(restoredDatabase);
    const restoredProfile = await restoredService.getProfileDraft("enterprise-nebula");
    const restoredRisk = await restoredService.getRiskDraft("enterprise-nebula");
    expect(Object.keys(restoredDatabase.read().profileDraftsByEnterpriseId)).toEqual(["enterprise-nebula"]);
    expect(Object.keys(restoredDatabase.read().riskDraftsByEnterpriseId)).toEqual(["enterprise-nebula"]);
    expect(restoredProfile.ok && restoredProfile.data.fields.employeeCount).toMatchObject({ status: "known", value: 32 });
    expect(restoredRisk.ok && restoredRisk.data.answersByQuestionId.penalty).toBe("penalty-2");
  });
});
