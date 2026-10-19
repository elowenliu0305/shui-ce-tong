import type { AssessmentResult, AssessmentRun, CompanyProfileDraft, Enterprise, ReportSnapshot, RiskQuestionnaireDraft } from "./types";

export interface BuildAssessmentArtifactsInput {
  runId: string;
  reportId: string;
  enterprise: Enterprise;
  profile: CompanyProfileDraft;
  riskDraft: RiskQuestionnaireDraft;
  result: AssessmentResult;
  asOfDate: string;
  createdAt: string;
  versions: { engine: string; ruleSet: string; catalog: string };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function buildAssessmentArtifacts(input: BuildAssessmentArtifactsInput): { run: Readonly<AssessmentRun>; report: Readonly<ReportSnapshot> } {
  const run: AssessmentRun = {
    id: input.runId,
    enterpriseId: input.enterprise.id,
    status: "completed",
    asOfDate: input.asOfDate,
    createdAt: input.createdAt,
    completedAt: input.createdAt,
    engineVersion: input.versions.engine,
    ruleSetVersion: input.versions.ruleSet,
    catalogVersion: input.versions.catalog,
    profileSnapshot: clone(input.profile),
    riskAnswersSnapshot: clone(input.riskDraft),
    result: clone(input.result),
  };
  const visibleResult: AssessmentResult = {
    ...clone(input.result),
    policyMatches: input.result.policyMatches.filter((item) => item.status !== "ineligible").map(clone),
    savingsEstimates: input.result.savingsEstimates.filter((item) => item.status !== "excluded").map(clone),
  };
  const report: ReportSnapshot = {
    id: input.reportId,
    assessmentRunId: input.runId,
    enterpriseId: input.enterprise.id,
    enterpriseDisplay: { name: input.enterprise.name, region: `${input.enterprise.regionProvince}${input.enterprise.regionCity}`, industry: input.enterprise.industry },
    profileSnapshot: clone(input.profile),
    riskAnswersSnapshot: clone(input.riskDraft),
    result: visibleResult,
    createdAt: input.createdAt,
    versions: clone(input.versions),
  };
  return { run: deepFreeze(run), report: deepFreeze(report) };
}
