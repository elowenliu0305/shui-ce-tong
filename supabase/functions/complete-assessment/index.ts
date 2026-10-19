import {
  buildAssessmentArtifacts,
  calculateSavings,
  evaluatePolicies,
  evaluateRisk,
  type CompanyProfileDraft,
  type Enterprise,
  type PolicyRuleDefinition,
  type RiskQuestion,
  type RiskQuestionnaireDraft,
} from "../../../packages/assessment-engine/src/index.ts";

import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { handleRequest, HttpError } from "../_shared/http.ts";
import { logEvent } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

interface CompleteAssessmentRequest {
  enterpriseId?: string;
  profileRevision?: number;
  questionnaireRevision?: number;
  asOfDate?: string;
  idempotencyKey?: string;
}

interface SubmissionRow {
  id: string;
  owner_id: string;
  enterprise_id: string;
  catalog_release_id: string;
  input_snapshot: {
    enterprise: Enterprise;
    profile: CompanyProfileDraft;
    questionnaire: RiskQuestionnaireDraft;
  };
  input_hash: string;
}

interface PolicyRow {
  id: string;
  version: string;
  policy_version_key: string;
  title: string;
  effective_from: string | null;
  effective_to: string | null;
  eligibility: PolicyRuleDefinition["conditions"];
  formula: { id?: string; version?: string; inputPaths?: string[] } | null;
  exclusion_group: string | null;
  overlap_priority: number;
  citation: PolicyRuleDefinition["citation"];
  review_status: string;
  status: string;
}

function one<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateBody(body: CompleteAssessmentRequest): asserts body is Required<CompleteAssessmentRequest> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!body.enterpriseId || !uuid.test(body.enterpriseId)
    || !Number.isInteger(body.profileRevision) || Number(body.profileRevision) < 1
    || !Number.isInteger(body.questionnaireRevision) || Number(body.questionnaireRevision) < 1
    || !body.asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.asOfDate)
    || !body.idempotencyKey || body.idempotencyKey.length < 16 || body.idempotencyKey.length > 128) {
    throw new HttpError(400, "validation_failed", "体检提交参数不完整，请刷新后重试。", false);
  }
}

Deno.serve((request) => handleRequest(request, async ({ requestId }) => {
  if (request.method !== "POST") throw new HttpError(405, "validation_failed", "仅支持 POST 请求。", false);
  const { user, client: userClient } = await requireUser(request);
  enforceRateLimit(`complete-assessment:${user.id}`, { limit: 12, windowMs: 60_000 });
  const body = await request.json() as CompleteAssessmentRequest;
  validateBody(body);

  const { data: rawSubmission, error: beginError } = await userClient.rpc("begin_assessment_submission", {
    p_enterprise_id: body.enterpriseId,
    p_profile_revision: body.profileRevision,
    p_questionnaire_revision: body.questionnaireRevision,
    p_as_of_date: body.asOfDate,
    p_idempotency_key: body.idempotencyKey,
  });
  if (beginError) {
    if (beginError.code === "40001") throw new HttpError(409, "conflict", "画像或问卷已在其他设备更新，请刷新后重试。", false);
    if (beginError.code === "23505") throw new HttpError(409, "idempotency_mismatch", "重复请求内容不一致。", false);
    if (beginError.code === "P0002") throw new HttpError(404, "not_found", "企业不存在或已删除。", false);
    if (beginError.code === "22023") throw new HttpError(400, "validation_failed", "请先完成全部 10 道风险题。", false);
    throw new HttpError(503, "dependency_unavailable", "评测输入冻结失败，请稍后重试。", true);
  }

  const submission = one(rawSubmission as SubmissionRow | SubmissionRow[]);
  if (!submission || submission.owner_id !== user.id || submission.enterprise_id !== body.enterpriseId) {
    throw new HttpError(404, "not_found", "企业不存在或已删除。", false);
  }

  const admin = createServiceClient();
  const { data: catalog, error: catalogError } = await admin.from("catalog_releases")
    .select("id, version, engine_release_id, question_set_release_id, policy_rule_ids")
    .eq("id", submission.catalog_release_id)
    .single();
  if (catalogError || !catalog) throw new HttpError(503, "dependency_unavailable", "规则目录不可用，请稍后重试。", true);

  const [engineResult, questionResult] = await Promise.all([
    admin.from("assessment_engine_releases").select("version").eq("id", catalog.engine_release_id).single(),
    admin.from("question_set_releases").select("version, questions").eq("id", catalog.question_set_release_id).single(),
  ]);
  if (engineResult.error || questionResult.error || !engineResult.data || !questionResult.data) {
    throw new HttpError(503, "dependency_unavailable", "评测规则不可用，请稍后重试。", true);
  }

  const policyIds = (catalog.policy_rule_ids ?? []) as string[];
  const policyQuery = policyIds.length
    ? await admin.from("policy_rule_releases").select("*").in("id", policyIds)
    : { data: [] as PolicyRow[], error: null };
  if (policyQuery.error) throw new HttpError(503, "dependency_unavailable", "政策规则不可用，请稍后重试。", true);

  const rules = (policyQuery.data as PolicyRow[])
    .filter((row) => row.review_status === "verified" && row.status === "active")
    .filter((row) => (!row.effective_from || row.effective_from <= body.asOfDate) && (!row.effective_to || row.effective_to >= body.asOfDate))
    .map<PolicyRuleDefinition>((row) => ({
      id: row.id,
      version: row.version,
      policyVersionId: `${row.policy_version_key}@${row.version}`,
      title: row.title,
      conditions: row.eligibility,
      formulaId: row.formula?.id ?? null,
      formulaVersion: row.formula?.version ?? null,
      formulaInputPaths: row.formula?.inputPaths ?? [],
      overlapGroup: row.exclusion_group,
      overlapPriority: row.overlap_priority,
      citation: row.citation,
    }));

  const questions = questionResult.data.questions as RiskQuestion[];
  const { enterprise, profile, questionnaire } = submission.input_snapshot;
  const riskSummary = evaluateRisk(questions, questionnaire.answersByQuestionId);
  if (riskSummary.unansweredQuestionIds.length) {
    throw new HttpError(400, "validation_failed", "请先完成全部 10 道风险题。", false);
  }
  const evaluatedAt = new Date().toISOString();
  const policyMatches = evaluatePolicies(rules, profile, evaluatedAt);
  const savings = calculateSavings(profile, policyMatches, rules);
  const visibleMatches = policyMatches.filter((match) => match.status !== "ineligible");
  const result = {
    profileCompleteness: profile.completionPercent,
    riskSummary,
    policyMatches,
    savingsEstimates: savings.estimates,
    estimatedTotalSavingYuan: savings.totalYuan,
    priorityActions: [
      riskSummary.confirmedRiskCount ? "优先复核已确认的异常答案并留存处理证据" : "保持当前税务管理流程并按季度复查",
      visibleMatches.some((match) => match.status === "pending") ? "补充政策匹配所需的未知经营资料" : rules.length ? "复核可适用政策的申报与留存备查要求" : "资料库尚无已核验政策规则，暂不输出政策金额结论",
    ],
    citations: rules.filter((rule) => visibleMatches.some((match) => match.policyVersionId === rule.policyVersionId)).map((rule) => rule.citation),
  };

  const now = new Date().toISOString();
  const artifacts = buildAssessmentArtifacts({
    runId: crypto.randomUUID(),
    reportId: crypto.randomUUID(),
    enterprise,
    profile,
    riskDraft: questionnaire,
    result,
    asOfDate: body.asOfDate,
    createdAt: now,
    versions: { engine: engineResult.data.version, ruleSet: questionResult.data.version, catalog: catalog.version },
  });
  const resultHash = await sha256(result);
  const { data: finalized, error: finalizeError } = await admin.rpc("finalize_assessment_submission", {
    p_submission_id: submission.id,
    p_expected_input_hash: submission.input_hash,
    p_computed_result: result,
    p_report_snapshot: artifacts.report,
    p_result_hash: resultHash,
  });
  if (finalizeError) {
    logEvent("error", "assessment.finalize.failed", { requestId, ownerId: user.id, enterpriseId: body.enterpriseId, code: finalizeError.code });
    throw new HttpError(503, "dependency_unavailable", "报告保存失败，使用同一请求可安全重试。", true);
  }
  logEvent("info", "assessment.completed", { requestId, ownerId: user.id, enterpriseId: body.enterpriseId, submissionId: submission.id, riskCount: riskSummary.confirmedRiskCount, policyCount: visibleMatches.length });
  return finalized;
}));
