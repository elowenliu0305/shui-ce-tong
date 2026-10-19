import { describe, expect, it } from "vitest";

import type { AssessmentResult } from "../../src/domain/assessment";
import { buildAssessmentArtifacts } from "../../src/domain/rules/build-report";
import { known } from "../../src/domain/shared";
import { riskQuestions } from "../../src/fixtures/risk-questions";
import { makeEnterprise, makeProfile } from "../factories";

describe("buildAssessmentArtifacts", () => {
  it("deep-copies, freezes and preserves version references", () => {
    const profile = makeProfile();
    const result: AssessmentResult = {
      profileCompleteness: 85,
      riskSummary: { confirmedRiskCount: 0, pendingVerificationCount: 0, level: "low", healthPercent: 100, items: [], pendingItems: [] },
      policyMatches: [], savingsEstimates: [], estimatedTotalSavingYuan: null, priorityActions: ["保持复查"], citations: []
    };
    const artifacts = buildAssessmentArtifacts({
      runId: "run-1", reportId: "report-1", enterprise: makeEnterprise(), profile,
      riskDraft: { id: "risk-1", enterpriseId: "enterprise-test", answersByQuestionId: Object.fromEntries(riskQuestions.map((q) => [q.id, q.options[0].id])), updatedAt: "2026-10-15T00:00:00.000Z" },
      result, asOfDate: "2026-10-15", createdAt: "2026-10-15T00:00:00.000Z",
      versions: { engine: "engine-1", ruleSet: "rules-1", catalog: "catalog-1" }
    });

    profile.fields.companyName = known("已修改名称");
    result.priorityActions.push("新建议");
    expect(artifacts.report.profileSnapshot.fields.companyName).toMatchObject({ value: "测试科技有限公司" });
    expect(artifacts.report.result.priorityActions).toEqual(["保持复查"]);
    expect(artifacts.report.versions.ruleSet).toBe("rules-1");
    expect(Object.isFrozen(artifacts.report.result)).toBe(true);
  });
});
