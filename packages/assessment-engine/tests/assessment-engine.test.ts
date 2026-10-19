import { describe, expect, it } from "vitest";

import {
  buildAssessmentArtifacts,
  calculateSavings,
  evaluatePolicy,
  evaluateRisk,
  validateProfile,
  type CompanyProfileDraft,
  type PolicyRuleDefinition,
  type RiskQuestion,
} from "../src/index";

const at = "2026-10-19T00:00:00.000Z";
const known = <T>(value: T) => ({ status: "known" as const, value, source: "user" as const, updatedAt: at });
const unknown = () => ({ status: "unknown" as const, source: "user" as const, updatedAt: at });

function profile(): CompanyProfileDraft {
  return {
    id: "profile-1",
    enterpriseId: "enterprise-1",
    schemaVersion: 2,
    completionPercent: 0,
    updatedAt: at,
    fields: {
      companyName: known("测试企业"),
      region: known({ province: "浙江省", city: "杭州市" }),
      industry: known("软件业"),
      unifiedSocialCreditCode: unknown(),
      establishedDate: unknown(),
      taxpayerType: known("一般纳税人"),
      dataYear: known(2025),
      annualRevenue: known({ amountYuan: 6_000_000, currency: "CNY", dataYear: 2025 }),
      totalAssets: known({ amountYuan: 10_000_000, currency: "CNY", dataYear: 2025 }),
      employeeCount: known(20),
      taxableIncome: known({ amountYuan: 1_000_000, currency: "CNY", dataYear: 2025 }),
      researchInvestment: known({ amountYuan: 800_000, currency: "CNY", dataYear: 2025 }),
      enjoyedTaxIncentives: known([]),
    },
  };
}

const questions: RiskQuestion[] = Array.from({ length: 10 }, (_, index) => ({
  id: `q-${index + 1}`,
  order: index + 1,
  title: `问题 ${index + 1}`,
  help: "",
  options: [
    { id: `q-${index + 1}-safe`, label: "安全", effect: "safe", riskPoints: 0 },
    { id: `q-${index + 1}-risk`, label: "异常", effect: "risk", riskPoints: 1 },
    { id: `q-${index + 1}-unknown`, label: "不清楚", effect: "unknown", riskPoints: 0 },
  ],
}));

const rule: PolicyRuleDefinition = {
  id: "rule-1",
  version: "1",
  policyVersionId: "policy-1",
  title: "小型微利企业演示规则",
  conditions: [{ id: "income", fieldPath: "taxableIncome.amountYuan", operator: "lte", expected: 3_000_000, basisRefs: ["source-1"] }],
  formulaId: "small-profit-saving-demo",
  formulaVersion: "1",
  formulaInputPaths: ["taxableIncome.amountYuan"],
  overlapGroup: "income-tax",
  overlapPriority: 10,
  citation: { documentId: "doc-1", sourceId: "source-1", title: "演示政策", docNo: null, locator: "第一条", excerpt: null },
};

describe("shared assessment engine", () => {
  it.each([[0, "low"], [2, "low"], [3, "medium"], [5, "medium"], [6, "high"], [10, "high"]] as const)(
    "maps %i confirmed risks to %s",
    (riskCount, level) => {
      const answers = Object.fromEntries(questions.map((question, index) => [question.id, question.options[index < riskCount ? 1 : 0].id]));
      const result = evaluateRisk(questions, answers);
      expect(result.level).toBe(level);
      expect(result.healthPercent).toBe((10 - riskCount) * 10);
    },
  );

  it("keeps unknown answers at zero points and creates verification items", () => {
    const answers = Object.fromEntries(questions.map((question) => [question.id, question.options[0].id]));
    answers[questions[4].id] = questions[4].options[2].id;
    const result = evaluateRisk(questions, answers);
    expect(result.confirmedRiskCount).toBe(0);
    expect(result.pendingVerificationCount).toBe(1);
    expect(result.healthPercent).toBe(100);
  });

  it("distinguishes unknown fields and blocks numeric output until inputs exist", () => {
    const input = profile();
    input.fields.taxableIncome = unknown();
    const match = evaluatePolicy(rule, input, at);
    const savings = calculateSavings(input, [match], [rule]);
    expect(match.status).toBe("pending");
    expect(savings.estimates[0].amountYuan).toBeNull();
    expect(savings.totalYuan).toBeNull();
  });

  it("uses the whitelist and excludes overlapping lower-priority estimates", () => {
    const input = profile();
    const higher = { ...rule, id: "rule-2", policyVersionId: "policy-2", overlapPriority: 20 };
    const matches = [evaluatePolicy(rule, input, at), evaluatePolicy(higher, input, at)];
    const result = calculateSavings(input, matches, [rule, higher]);
    expect(result.estimates.filter((item) => item.status === "computed")).toHaveLength(1);
    expect(result.totalYuan).toBe(50_000);
  });

  it("validates profile values and creates an immutable versioned snapshot", () => {
    const input = profile();
    expect(validateProfile(input.fields).valid).toBe(true);
    const risk = evaluateRisk(questions, Object.fromEntries(questions.map((question) => [question.id, question.options[0].id])));
    const result = {
      profileCompleteness: 85,
      riskSummary: risk,
      policyMatches: [],
      savingsEstimates: [],
      estimatedTotalSavingYuan: null,
      priorityActions: ["保持复查"],
      citations: [],
    };
    const artifacts = buildAssessmentArtifacts({
      runId: "run-1",
      reportId: "report-1",
      enterprise: { id: "enterprise-1", accountId: "account-1", name: "测试企业", regionProvince: "浙江省", regionCity: "杭州市", industry: "软件业", revision: 1, createdAt: at, updatedAt: at },
      profile: input,
      riskDraft: { id: "risk-1", enterpriseId: "enterprise-1", answersByQuestionId: {}, updatedAt: at },
      result,
      asOfDate: "2026-10-19",
      createdAt: at,
      versions: { engine: "engine-1", ruleSet: "rules-1", catalog: "catalog-1" },
    });
    result.priorityActions.push("later");
    expect(artifacts.report.result.priorityActions).toEqual(["保持复查"]);
    expect(Object.isFrozen(artifacts.report.result)).toBe(true);
    expect(artifacts.report.versions.catalog).toBe("catalog-1");
  });
});
