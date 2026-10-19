import type { Enterprise, EnterpriseDeletionSummary, EnterpriseInput } from "../../domain/enterprise";
import type { AppError } from "../../domain/shared";
import type { EnterpriseService } from "../contracts/enterprise-service";
import { failure, success } from "../contracts/service-result";
import { getSupabaseClient } from "./client";
import type { ServerErrorEnvelope } from "./types";
import { toAppError } from "./types";

interface EnterpriseRow {
  id: string;
  owner_id: string;
  name: string;
  region_province: string;
  region_city: string;
  industry: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: EnterpriseRow): Enterprise {
  return {
    id: row.id,
    accountId: row.owner_id,
    name: row.name,
    regionProvince: row.region_province,
    regionCity: row.region_city,
    industry: row.industry,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validate(input: EnterpriseInput): AppError | null {
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "请输入企业名称";
  if (input.name.trim().length > 100) fieldErrors.name = "企业名称不能超过 100 个字符";
  if (!input.regionProvince.trim()) fieldErrors.regionProvince = "请选择省份";
  if (!input.regionCity.trim()) fieldErrors.regionCity = "请选择城市";
  if (!input.industry.trim()) fieldErrors.industry = "请选择行业";
  return Object.keys(fieldErrors).length
    ? { code: "VALIDATION_ERROR", message: "请完善必填信息", fieldErrors, retryable: false }
    : null;
}

function mapDatabaseError(error: { code?: string; message: string }): AppError {
  if (error.code === "40001" || error.message === "conflict") {
    return { code: "CONFLICT", message: "企业资料已在其他设备更新，请刷新后重试", retryable: false };
  }
  if (error.code === "P0002" || error.message === "not_found") {
    return { code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false };
  }
  if (error.message === "idempotency_mismatch") {
    return { code: "CONFLICT", message: "重复请求内容不一致，请刷新后重试", retryable: false };
  }
  return { code: "UNKNOWN", message: "企业数据服务暂时不可用，请稍后重试", retryable: true };
}

function inputJson(input: EnterpriseInput) {
  return {
    name: input.name.trim(),
    regionProvince: input.regionProvince.trim(),
    regionCity: input.regionCity.trim(),
    industry: input.industry.trim(),
  };
}

export class SupabaseEnterpriseService implements EnterpriseService {
  private readonly client = getSupabaseClient();

  async list(_accountId: string) {
    const { data, error } = await this.client.from("enterprises").select("*").order("created_at", { ascending: true });
    return error ? failure(mapDatabaseError(error)) : success((data as EnterpriseRow[]).map(mapRow));
  }

  async getCurrentEnterpriseId(): Promise<string | null> {
    const { data, error } = await this.client.from("account_profiles").select("current_enterprise_id").maybeSingle();
    if (error) throw new Error(mapDatabaseError(error).message);
    return (data as { current_enterprise_id: string | null } | null)?.current_enterprise_id ?? null;
  }

  async get(enterpriseId: string) {
    const { data, error } = await this.client.from("enterprises").select("*").eq("id", enterpriseId).maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    return data ? success(mapRow(data as EnterpriseRow)) : failure({ code: "NOT_FOUND", message: "企业不存在或已删除", retryable: false });
  }

  async create(_accountId: string, input: EnterpriseInput) {
    const invalid = validate(input);
    if (invalid) return failure(invalid);
    const { data, error } = await this.client.rpc("create_enterprise", {
      p_input: inputJson(input),
      p_mutation_id: crypto.randomUUID(),
    });
    return error ? failure(mapDatabaseError(error)) : success(mapRow(data as EnterpriseRow));
  }

  async update(enterpriseId: string, input: EnterpriseInput) {
    const invalid = validate(input);
    if (invalid) return failure(invalid);
    const current = await this.get(enterpriseId);
    if (!current.ok) return current;
    const { data, error } = await this.client.rpc("update_enterprise", {
      p_enterprise_id: enterpriseId,
      p_expected_revision: current.data.revision,
      p_input: inputJson(input),
      p_mutation_id: crypto.randomUUID(),
    });
    return error ? failure(mapDatabaseError(error)) : success(mapRow(data as EnterpriseRow));
  }

  async switchActive(_accountId: string, enterpriseId: string) {
    const { data, error } = await this.client.rpc("switch_current_enterprise", { p_enterprise_id: enterpriseId });
    return error ? failure(mapDatabaseError(error)) : success(mapRow(data as EnterpriseRow));
  }

  async delete(_accountId: string, enterpriseId: string) {
    const { data, error } = await this.client.functions.invoke<EnterpriseDeletionSummary | ServerErrorEnvelope>("delete-enterprise", {
      body: { enterpriseId, confirmation: "DELETE" },
    });
    if (error || !data) return failure({ code: "STORAGE_ERROR", message: "企业删除失败，请稍后重试", retryable: true });
    if ("error" in data) return failure(toAppError(data));
    return success(data);
  }
}
