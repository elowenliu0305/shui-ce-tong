import type { AssessmentResult, PolicyRuleDefinition, RiskQuestion, RiskQuestionnaireDraft } from "../../domain/assessment";
import type { CompanyProfileDraft, Enterprise } from "../../domain/enterprise";
import type { ReportSnapshot } from "../../domain/report";
import { known, unset } from "../../domain/shared";
import { calculateSavings } from "../../domain/rules/calculate-savings";
import { evaluatePolicies } from "../../domain/rules/evaluate-policy";
import { evaluateRisk } from "../../domain/rules/evaluate-risk";
import { withProfileCompleteness } from "../../domain/rules/profile-completeness";
import type { AssessmentService } from "../contracts/assessment-service";
import { failure, success } from "../contracts/service-result";
import { getSupabaseClient } from "./client";
import type { ServerErrorEnvelope } from "./types";
import { toAppError } from "./types";

interface DraftRow {
  id: string;
  enterprise_id: string;
  answers: CompanyProfileDraft["fields"] | RiskQuestionnaireDraft["answersByQuestionId"];
  completion_percent?: number;
  question_set_release_id?: string;
  revision: number;
  updated_at: string;
}

interface CatalogRow {
  id: string;
  version: string;
  engine_release_id: string;
  question_set_release_id: string;
  policy_rule_ids: string[];
}

function databaseError(error: { code?: string; message: string }) {
  if (error.code === "40001" || error.message.includes("conflict")) return { code: "CONFLICT" as const, message: "草稿已在其他设备更新，请刷新后重试", retryable: false };
  if (error.code === "P0002") return { code: "NOT_FOUND" as const, message: "企业不存在或已删除", retryable: false };
  return { code: "UNKNOWN" as const, message: "体检服务暂时不可用，请稍后重试", retryable: true };
}

function mapEnterprise(row: Record<string, unknown>): Enterprise {
  return {
    id: String(row.id),
    accountId: String(row.owner_id),
    name: String(row.name),
    regionProvince: String(row.region_province),
    regionCity: String(row.region_city),
    industry: String(row.industry),
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseAssessmentService implements AssessmentService {
  private readonly client = getSupabaseClient();
  private readonly profileRevisions = new Map<string, number>();
  private readonly questionnaireRevisions = new Map<string, number>();
  private readonly questionReleaseIds = new Map<string, string>();
  private readonly completionKeys = new Map<string, string>();

  private async enterprise(enterpriseId: string) {
    const { data, error } = await this.client.from("enterprises").select("*").eq("id", enterpriseId).maybeSingle();
    return error || !data ? null : mapEnterprise(data as Record<string, unknown>);
  }

  private async activeCatalog(): Promise<CatalogRow | null> {
    const { data, error } = await this.client.from("catalog_releases").select("*").eq("status", "active").maybeSingle();
    return error ? null : data as CatalogRow | null;
  }

  async getProfileDraft(enterpriseId: string) {
    const { data, error } = await this.client.from("company_profile_drafts").select("*").eq("enterprise_id", enterpriseId).maybeSingle();
    if (error) return failure(databaseError(error));
    if (data) {
      const row = data as DraftRow;
      this.profileRevisions.set(enterpriseId, row.revision);
      return success({ id: row.id, enterpriseId, schemaVersion: 2 as const, fields: row.answers as CompanyProfileDraft["fields"], completionPercent: row.completion_percent ?? 0, updatedAt: row.updated_at });
    }
    const enterprise = await this.enterprise(enterpriseId);
    if (!enterprise) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    const updatedAt = new Date().toISOString();
    this.profileRevisions.set(enterpriseId, 0);
    return success(withProfileCompleteness({
      id: `profile-${enterpriseId}`,
      enterpriseId,
      schemaVersion: 2,
      completionPercent: 0,
      updatedAt,
      fields: {
        companyName: known(enterprise.name, "seed", updatedAt),
        region: known({ province: enterprise.regionProvince, city: enterprise.regionCity }, "seed", updatedAt),
        industry: known(enterprise.industry, "seed", updatedAt),
        unifiedSocialCreditCode: unset("user", updatedAt), establishedDate: unset("user", updatedAt),
        taxpayerType: unset("user", updatedAt), dataYear: unset("user", updatedAt), annualRevenue: unset("user", updatedAt),
        totalAssets: unset("user", updatedAt), employeeCount: unset("user", updatedAt), taxableIncome: unset("user", updatedAt),
        researchInvestment: unset("user", updatedAt), enjoyedTaxIncentives: unset("user", updatedAt),
      },
    }));
  }

  async saveProfileDraft(draft: CompanyProfileDraft) {
    const next = withProfileCompleteness({ ...draft, updatedAt: new Date().toISOString() });
    const expectedRevision = this.profileRevisions.get(draft.enterpriseId) ?? 0;
    const { data, error } = await this.client.rpc("save_company_profile_draft", {
      p_enterprise_id: draft.enterpriseId,
      p_expected_revision: expectedRevision,
      p_answers: next.fields,
      p_completion_percent: next.completionPercent,
      p_mutation_id: crypto.randomUUID(),
    });
    if (error) return failure(databaseError(error));
    const row = (Array.isArray(data) ? data[0] : data) as DraftRow;
    this.profileRevisions.set(draft.enterpriseId, row.revision);
    return success({ ...next, id: row.id, updatedAt: row.updated_at });
  }

  async getRiskDraft(enterpriseId: string) {
    const { data, error } = await this.client.from("questionnaire_drafts").select("*").eq("enterprise_id", enterpriseId).maybeSingle();
    if (error) return failure(databaseError(error));
    if (data) {
      const row = data as DraftRow;
      this.questionnaireRevisions.set(enterpriseId, row.revision);
      this.questionReleaseIds.set(enterpriseId, row.question_set_release_id ?? "");
      return success({ id: row.id, enterpriseId, answersByQuestionId: row.answers as Record<string, string>, updatedAt: row.updated_at });
    }
    const catalog = await this.activeCatalog();
    if (!catalog) return failure({ code: "UNKNOWN", message: "当前没有可用题目版本", retryable: true });
    this.questionnaireRevisions.set(enterpriseId, 0);
    this.questionReleaseIds.set(enterpriseId, catalog.question_set_release_id);
    return success({ id: `risk-${enterpriseId}`, enterpriseId, answersByQuestionId: {}, updatedAt: new Date().toISOString() });
  }

  async saveRiskDraft(draft: RiskQuestionnaireDraft) {
    let questionReleaseId = this.questionReleaseIds.get(draft.enterpriseId);
    if (!questionReleaseId) {
      const catalog = await this.activeCatalog();
      questionReleaseId = catalog?.question_set_release_id;
    }
    if (!questionReleaseId) return failure({ code: "UNKNOWN", message: "当前没有可用题目版本", retryable: true });
    const expectedRevision = this.questionnaireRevisions.get(draft.enterpriseId) ?? 0;
    const { data, error } = await this.client.rpc("save_questionnaire_draft", {
      p_enterprise_id: draft.enterpriseId,
      p_expected_revision: expectedRevision,
      p_question_set_release_id: questionReleaseId,
      p_answers: draft.answersByQuestionId,
      p_mutation_id: crypto.randomUUID(),
    });
    if (error) return failure(databaseError(error));
    const row = (Array.isArray(data) ? data[0] : data) as DraftRow;
    this.questionnaireRevisions.set(draft.enterpriseId, row.revision);
    return success({ ...draft, id: row.id, updatedAt: row.updated_at });
  }

  private async loadRules(catalog: CatalogRow) {
    const questionResult = await this.client.from("question_set_releases").select("version, questions").eq("id", catalog.question_set_release_id).single();
    if (questionResult.error) return null;
    if (!catalog.policy_rule_ids.length) return { questions: questionResult.data.questions as RiskQuestion[], rules: [] as PolicyRuleDefinition[] };
    const policyResult = await this.client.from("policy_rule_releases").select("*").in("id", catalog.policy_rule_ids);
    if (policyResult.error) return null;
    const rules = policyResult.data.map((row: Record<string, unknown>) => {
      const formula = row.formula as { id?: string; version?: string; inputPaths?: string[] } | null;
      return {
        id: String(row.id), version: String(row.version), policyVersionId: `${String(row.policy_version_key)}@${String(row.version)}`,
        title: String(row.title), conditions: row.eligibility as PolicyRuleDefinition["conditions"],
        formulaId: formula?.id ?? null, formulaVersion: formula?.version ?? null, formulaInputPaths: formula?.inputPaths ?? [],
        overlapGroup: row.exclusion_group ? String(row.exclusion_group) : null, overlapPriority: Number(row.overlap_priority),
        citation: row.citation as PolicyRuleDefinition["citation"],
      } satisfies PolicyRuleDefinition;
    });
    return { questions: questionResult.data.questions as RiskQuestion[], rules };
  }

  async preview(enterpriseId: string) {
    const [profile, questionnaire, catalog] = await Promise.all([this.getProfileDraft(enterpriseId), this.getRiskDraft(enterpriseId), this.activeCatalog()]);
    if (!profile.ok) return profile;
    if (!questionnaire.ok) return questionnaire;
    if (!catalog) return failure({ code: "UNKNOWN", message: "规则目录暂时不可用", retryable: true });
    const releases = await this.loadRules(catalog);
    if (!releases) return failure({ code: "UNKNOWN", message: "规则版本暂时不可用", retryable: true });
    const evaluatedAt = new Date().toISOString();
    const riskSummary = evaluateRisk(releases.questions, questionnaire.data.answersByQuestionId);
    const policyMatches = evaluatePolicies(releases.rules, profile.data, evaluatedAt);
    const savings = calculateSavings(profile.data, policyMatches, releases.rules);
    const visible = policyMatches.filter((item) => item.status !== "ineligible");
    const result: AssessmentResult = {
      profileCompleteness: profile.data.completionPercent,
      riskSummary,
      policyMatches,
      savingsEstimates: savings.estimates,
      estimatedTotalSavingYuan: savings.totalYuan,
      priorityActions: [riskSummary.confirmedRiskCount ? "优先复核已确认的异常答案并留存处理证据" : "保持当前税务管理流程并按季度复查", visible.some((item) => item.status === "pending") ? "补充政策匹配所需的未知经营资料" : releases.rules.length ? "复核可适用政策的申报与留存备查要求" : "资料库尚无已核验政策规则，暂不输出政策金额结论"],
      citations: releases.rules.filter((rule) => visible.some((match) => match.policyVersionId === rule.policyVersionId)).map((rule) => rule.citation),
    };
    return success(result);
  }

  async complete(enterpriseId: string) {
    const profile = await this.getProfileDraft(enterpriseId);
    const questionnaire = await this.getRiskDraft(enterpriseId);
    if (!profile.ok) return profile;
    if (!questionnaire.ok) return questionnaire;
    const asOfDate = new Date().toISOString().slice(0, 10);
    const completionKey = `${enterpriseId}:${this.profileRevisions.get(enterpriseId)}:${this.questionnaireRevisions.get(enterpriseId)}:${asOfDate}`;
    const idempotencyKey = this.completionKeys.get(completionKey) ?? crypto.randomUUID();
    this.completionKeys.set(completionKey, idempotencyKey);
    const { data, error } = await this.client.functions.invoke<{ reportId: string } | ServerErrorEnvelope>("complete-assessment", {
      body: {
        enterpriseId,
        profileRevision: this.profileRevisions.get(enterpriseId),
        questionnaireRevision: this.questionnaireRevisions.get(enterpriseId),
        asOfDate,
        idempotencyKey,
      },
    });
    if (error || !data) return failure({ code: "UNKNOWN", message: "报告生成失败，请稍后重试", retryable: true });
    if ("error" in data) return failure(toAppError(data));
    const report = await this.getReport(data.reportId);
    if (report.ok) this.completionKeys.delete(completionKey);
    return report;
  }

  async getReport(reportId: string) {
    const { data, error } = await this.client.from("report_snapshots").select("report").eq("id", reportId).maybeSingle();
    if (error) return failure(databaseError(error));
    return data ? success(data.report as ReportSnapshot) : failure({ code: "NOT_FOUND", message: "报告不存在", retryable: false });
  }

  async listReports(enterpriseId: string) {
    const { data, error } = await this.client.from("report_snapshots").select("report").eq("enterprise_id", enterpriseId).order("created_at", { ascending: false });
    return error ? failure(databaseError(error)) : success(data.map((row) => row.report as ReportSnapshot));
  }
}
