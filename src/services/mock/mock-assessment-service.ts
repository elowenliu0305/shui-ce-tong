import type { AssessmentResult, RiskQuestionnaireDraft } from "../../domain/assessment";
import type { CompanyProfileDraft } from "../../domain/enterprise";
import { evaluateRisk } from "../../domain/rules/evaluate-risk";
import { withProfileCompleteness } from "../../domain/rules/profile-completeness";
import { evaluatePolicies } from "../../domain/rules/evaluate-policy";
import { calculateSavings } from "../../domain/rules/calculate-savings";
import { buildAssessmentArtifacts } from "../../domain/rules/build-report";
import { known, unset } from "../../domain/shared";
import { policyRules } from "../../fixtures/policies";
import { riskQuestions } from "../../fixtures/risk-questions";
import type { AssessmentService } from "../contracts/assessment-service";
import { failure, success } from "../contracts/service-result";
import { clone, type MockDatabase } from "./mock-database";

const id = (prefix: string, enterpriseId: string) => `${prefix}-${enterpriseId}`;
const uniqueId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

export function createProfileDraft(database: MockDatabase, enterpriseId: string): CompanyProfileDraft | null {
  const enterprise = database.read().enterprisesById[enterpriseId];
  if (!enterprise) return null;
  const updatedAt = new Date().toISOString();
  return withProfileCompleteness({
    id: id("profile", enterpriseId),
    enterpriseId,
    schemaVersion: 2,
    completionPercent: 0,
    updatedAt,
    fields: {
      companyName: known(enterprise.name, "seed", updatedAt),
      region: known({ province: enterprise.regionProvince, city: enterprise.regionCity }, "seed", updatedAt),
      industry: known(enterprise.industry, "seed", updatedAt),
      unifiedSocialCreditCode: unset("user", updatedAt),
      establishedDate: unset("user", updatedAt),
      taxpayerType: unset("user", updatedAt),
      dataYear: unset("user", updatedAt),
      annualRevenue: unset("user", updatedAt),
      totalAssets: unset("user", updatedAt),
      employeeCount: unset("user", updatedAt),
      taxableIncome: unset("user", updatedAt),
      researchInvestment: unset("user", updatedAt),
      enjoyedTaxIncentives: unset("user", updatedAt)
    }
  });
}

export function createRiskDraft(enterpriseId: string): RiskQuestionnaireDraft {
  return { id: id("risk", enterpriseId), enterpriseId, answersByQuestionId: {}, updatedAt: new Date().toISOString() };
}

export class MockAssessmentService implements AssessmentService {
  constructor(private readonly database: MockDatabase) {}

  async getProfileDraft(enterpriseId: string) {
    const existing = this.database.read().profileDraftsByEnterpriseId[enterpriseId];
    if (existing) return success(existing);
    const created = createProfileDraft(this.database, enterpriseId);
    return created ? success(created) : failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
  }

  async saveProfileDraft(draft: CompanyProfileDraft) {
    if (!this.database.read().enterprisesById[draft.enterpriseId]) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    const next = withProfileCompleteness({ ...draft, id: id("profile", draft.enterpriseId), schemaVersion: 2, updatedAt: new Date().toISOString() });
    this.database.transact((state) => { state.profileDraftsByEnterpriseId[draft.enterpriseId] = next; });
    return success(next);
  }

  async getRiskDraft(enterpriseId: string) {
    if (!this.database.read().enterprisesById[enterpriseId]) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    return success(this.database.read().riskDraftsByEnterpriseId[enterpriseId] ?? createRiskDraft(enterpriseId));
  }

  async saveRiskDraft(draft: RiskQuestionnaireDraft) {
    if (!this.database.read().enterprisesById[draft.enterpriseId]) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    const allowed = new Set(riskQuestions.flatMap((question) => question.options.map((option) => option.id)));
    if (Object.values(draft.answersByQuestionId).some((answer) => !allowed.has(answer))) return failure({ code: "VALIDATION_ERROR", message: "题目答案不在允许范围内", retryable: false });
    const next = { ...draft, id: id("risk", draft.enterpriseId), updatedAt: new Date().toISOString() };
    this.database.transact((state) => { state.riskDraftsByEnterpriseId[draft.enterpriseId] = next; });
    return success(next);
  }

  async preview(enterpriseId: string) {
    const profileResult = await this.getProfileDraft(enterpriseId);
    const riskResult = await this.getRiskDraft(enterpriseId);
    if (!profileResult.ok) return profileResult;
    if (!riskResult.ok) return riskResult;
    const riskSummary = evaluateRisk(riskQuestions, riskResult.data.answersByQuestionId);
    const evaluatedAt = new Date().toISOString();
    const policyMatches = evaluatePolicies(policyRules, profileResult.data, evaluatedAt);
    const savings = calculateSavings(profileResult.data, policyMatches, policyRules);
    const visibleMatches = policyMatches.filter((item) => item.status !== "ineligible");
    const result: AssessmentResult = {
      profileCompleteness: profileResult.data.completionPercent,
      riskSummary,
      policyMatches,
      savingsEstimates: savings.estimates,
      estimatedTotalSavingYuan: savings.totalYuan,
      priorityActions: [
        riskSummary.confirmedRiskCount ? "优先复核已确认的异常答案并留存处理证据" : "保持当前税务管理流程并按季度复查",
        visibleMatches.some((item) => item.status === "pending") ? "补充政策匹配所需的未知经营资料" : "复核可适用政策的申报与留存备查要求"
      ],
      citations: policyRules.filter((rule) => visibleMatches.some((match) => match.policyVersionId === rule.policyVersionId)).map((rule) => rule.citation)
    };
    return success(result);
  }

  async complete(enterpriseId: string) {
    const profile = await this.getProfileDraft(enterpriseId);
    const risk = await this.getRiskDraft(enterpriseId);
    const result = await this.preview(enterpriseId);
    const enterprise = this.database.read().enterprisesById[enterpriseId];
    if (!profile.ok) return profile;
    if (!risk.ok) return risk;
    if (!result.ok) return result;
    if (!enterprise) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    const riskEvaluation = evaluateRisk(riskQuestions, risk.data.answersByQuestionId);
    if (riskEvaluation.unansweredQuestionIds.length) return failure({ code: "VALIDATION_ERROR", message: "请先完成全部 10 道风险题", retryable: false });

    const now = new Date().toISOString();
    const artifacts = buildAssessmentArtifacts({
      runId: uniqueId("run"), reportId: uniqueId("report"), enterprise, profile: profile.data, riskDraft: risk.data,
      result: result.data, asOfDate: now.slice(0, 10), createdAt: now,
      versions: { engine: "frontend-engine-1", ruleSet: "demo-2026.1", catalog: "mock-catalog-1" }
    });
    this.database.transact((draft) => {
      draft.assessmentRunsById[artifacts.run.id] = clone(artifacts.run);
      draft.reportSnapshotsById[artifacts.report.id] = clone(artifacts.report);
    });
    return success(artifacts.report);
  }

  async getReport(reportId: string) {
    const report = this.database.read().reportSnapshotsById[reportId];
    return report ? success(report) : failure({ code: "NOT_FOUND", message: "报告不存在", retryable: false });
  }

  async listReports(enterpriseId: string) {
    return success(Object.values(this.database.read().reportSnapshotsById).filter((item) => item.enterpriseId === enterpriseId));
  }
}
