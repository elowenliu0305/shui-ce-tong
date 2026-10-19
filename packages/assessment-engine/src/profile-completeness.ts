import type { CompanyProfileDraft, CompanyProfileFields, FieldValue, MoneyValue } from "./types";

export const profileFieldNames: (keyof CompanyProfileFields)[] = [
  "companyName", "region", "industry", "unifiedSocialCreditCode", "establishedDate", "taxpayerType", "dataYear",
  "annualRevenue", "totalAssets", "employeeCount", "taxableIncome", "researchInvestment", "enjoyedTaxIncentives",
];

export interface ProfileValidation {
  valid: boolean;
  completionPercent: number;
  knownCount: number;
  unknownCount: number;
  unsetCount: number;
  errors: Record<string, string>;
}

const isBlank = (value: unknown) => typeof value === "string" && value.trim() === "";
const isMoney = (value: unknown): value is MoneyValue => Boolean(value && typeof value === "object" && Number.isInteger((value as MoneyValue).amountYuan) && (value as MoneyValue).amountYuan >= 0 && (value as MoneyValue).currency === "CNY");

export function validateProfile(fields: CompanyProfileFields): ProfileValidation {
  const errors: Record<string, string> = {};
  let knownCount = 0;
  let unknownCount = 0;
  let unsetCount = 0;

  for (const name of profileFieldNames) {
    const field = fields[name] as FieldValue<unknown>;
    if (field.status === "known") {
      knownCount += 1;
      if (isBlank(field.value)) errors[name] = "已填写值不能为空";
      if (["annualRevenue", "totalAssets", "taxableIncome", "researchInvestment"].includes(name) && !isMoney(field.value)) errors[name] = "金额必须是大于或等于 0 的人民币整数元";
      if (name === "employeeCount" && (!Number.isInteger(field.value) || Number(field.value) < 0)) errors[name] = "人数必须是大于或等于 0 的整数";
      if (name === "dataYear" && (!Number.isInteger(field.value) || Number(field.value) < 2000 || Number(field.value) > 2100)) errors[name] = "数据年度不正确";
    } else if (field.status === "unknown") unknownCount += 1;
    else unsetCount += 1;
  }

  for (const required of ["companyName", "region", "industry"] as const) {
    if (fields[required].status !== "known") errors[required] = "该字段必须填写明确值";
  }
  return {
    valid: Object.keys(errors).length === 0,
    completionPercent: Math.round((knownCount / profileFieldNames.length) * 100),
    knownCount,
    unknownCount,
    unsetCount,
    errors,
  };
}

export function withProfileCompleteness<T extends CompanyProfileDraft>(draft: T): T {
  return { ...draft, completionPercent: validateProfile(draft.fields).completionPercent };
}
