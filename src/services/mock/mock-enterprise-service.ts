import type { Enterprise, EnterpriseInput } from "../../domain/enterprise";
import type { EnterpriseService } from "../contracts/enterprise-service";
import { failure, success } from "../contracts/service-result";
import type { MockDatabase } from "./mock-database";

function id() {
  return `enterprise-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function validate(input: EnterpriseInput) {
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "请输入企业名称";
  if (input.name.trim().length > 100) fieldErrors.name = "企业名称不能超过 100 个字符";
  if (!input.regionProvince.trim()) fieldErrors.regionProvince = "请选择省份";
  if (!input.regionCity.trim()) fieldErrors.regionCity = "请选择城市";
  if (!input.industry.trim()) fieldErrors.industry = "请选择行业";
  return fieldErrors;
}

export class MockEnterpriseService implements EnterpriseService {
  constructor(private readonly database: MockDatabase) {}

  async list(accountId: string) {
    return success(Object.values(this.database.read().enterprisesById).filter((item) => item.accountId === accountId));
  }

  async get(enterpriseId: string) {
    const enterprise = this.database.read().enterprisesById[enterpriseId];
    return enterprise ? success(enterprise) : failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
  }

  async create(accountId: string, input: EnterpriseInput) {
    const fieldErrors = validate(input);
    if (Object.keys(fieldErrors).length) return failure({ code: "VALIDATION_ERROR", message: "请完善必填信息", fieldErrors, retryable: false });
    const now = new Date().toISOString();
    const enterprise: Enterprise = {
      id: id(),
      accountId,
      name: input.name.trim(),
      regionProvince: input.regionProvince.trim(),
      regionCity: input.regionCity.trim(),
      industry: input.industry.trim(),
      revision: 1,
      createdAt: now,
      updatedAt: now
    };
    this.database.transact((draft) => {
      draft.enterprisesById[enterprise.id] = enterprise;
      draft.activeEnterpriseId = enterprise.id;
    });
    return success(enterprise);
  }

  async update(enterpriseId: string, input: EnterpriseInput) {
    const fieldErrors = validate(input);
    if (Object.keys(fieldErrors).length) return failure({ code: "VALIDATION_ERROR", message: "请完善必填信息", fieldErrors, retryable: false });
    const current = this.database.read().enterprisesById[enterpriseId];
    if (!current) return failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
    const enterprise = { ...current, ...input, name: input.name.trim(), revision: current.revision + 1, updatedAt: new Date().toISOString() };
    this.database.transact((draft) => { draft.enterprisesById[enterpriseId] = enterprise; });
    return success(enterprise);
  }

  async switchActive(accountId: string, enterpriseId: string) {
    const enterprise = this.database.read().enterprisesById[enterpriseId];
    if (!enterprise || enterprise.accountId !== accountId) return failure({ code: "NOT_FOUND", message: "无法切换到该企业", retryable: false });
    this.database.transact((draft) => { draft.activeEnterpriseId = enterpriseId; });
    return success(enterprise);
  }

  async delete(accountId: string, enterpriseId: string) {
    const snapshot = this.database.read();
    const enterprise = snapshot.enterprisesById[enterpriseId];
    if (!enterprise || enterprise.accountId !== accountId) return failure({ code: "NOT_FOUND", message: "企业不存在或无权删除", retryable: false });

    const reportIds = Object.values(snapshot.reportSnapshotsById).filter((item) => item.enterpriseId === enterpriseId).map((item) => item.id);
    const runIds = Object.values(snapshot.assessmentRunsById).filter((item) => item.enterpriseId === enterpriseId).map((item) => item.id);
    const conversationIds = Object.values(snapshot.agentConversationsById).filter((item) => item.enterpriseId === enterpriseId).map((item) => item.id);
    const fileIds = Object.values(snapshot.fileAnalysisRecordsById).filter((item) => item.enterpriseId === enterpriseId).map((item) => item.id);
    const hasProfile = Number(Boolean(snapshot.profileDraftsByEnterpriseId[enterpriseId]));
    const hasRisk = Number(Boolean(snapshot.riskDraftsByEnterpriseId[enterpriseId]));
    const remaining = Object.values(snapshot.enterprisesById).filter((item) => item.accountId === accountId && item.id !== enterpriseId);
    const activeEnterpriseId = snapshot.activeEnterpriseId === enterpriseId ? remaining[0]?.id ?? null : snapshot.activeEnterpriseId;

    this.database.transact((draft) => {
      delete draft.enterprisesById[enterpriseId];
      delete draft.profileDraftsByEnterpriseId[enterpriseId];
      delete draft.riskDraftsByEnterpriseId[enterpriseId];
      for (const targetId of runIds) delete draft.assessmentRunsById[targetId];
      for (const targetId of reportIds) delete draft.reportSnapshotsById[targetId];
      for (const targetId of conversationIds) delete draft.agentConversationsById[targetId];
      for (const targetId of fileIds) delete draft.fileAnalysisRecordsById[targetId];
      draft.activeEnterpriseId = activeEnterpriseId;
    });

    return success({
      enterpriseId,
      deletedProfileDrafts: hasProfile,
      deletedRiskDrafts: hasRisk,
      deletedReports: reportIds.length,
      deletedConversations: conversationIds.length,
      deletedFileRecords: fileIds.length,
      preservedFavorites: Object.values(snapshot.favoritesById).filter((item) => item.accountId === accountId).length,
      activeEnterpriseId
    });
  }
}
