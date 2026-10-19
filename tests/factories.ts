import type { CompanyProfileDraft, CompanyProfileFields, Enterprise } from "../src/domain/enterprise";
import { known, unknown } from "../src/domain/shared";

export function makeEnterprise(): Enterprise {
  return { id: "enterprise-test", accountId: "account-test", name: "测试科技有限公司", regionProvince: "浙江省", regionCity: "杭州市", industry: "软件和信息技术服务业", revision: 1, createdAt: "2026-10-15T00:00:00.000Z", updatedAt: "2026-10-15T00:00:00.000Z" };
}

export function makeProfile(overrides: Partial<CompanyProfileFields> = {}): CompanyProfileDraft {
  const fields: CompanyProfileFields = {
    companyName: known("测试科技有限公司"),
    region: known({ province: "浙江省", city: "杭州市" }),
    industry: known("软件和信息技术服务业"),
    unifiedSocialCreditCode: unknown(),
    establishedDate: unknown(),
    taxpayerType: known("一般纳税人"),
    dataYear: known(2025),
    annualRevenue: known({ amountYuan: 6_800_000, currency: "CNY", dataYear: 2025 }),
    totalAssets: known({ amountYuan: 12_000_000, currency: "CNY", dataYear: 2025 }),
    employeeCount: known(32),
    taxableIncome: known({ amountYuan: 1_000_000, currency: "CNY", dataYear: 2025 }),
    researchInvestment: known({ amountYuan: 800_000, currency: "CNY", dataYear: 2025 }),
    enjoyedTaxIncentives: known([]),
    ...overrides
  };
  return { id: "profile-test", enterpriseId: "enterprise-test", schemaVersion: 2, fields, completionPercent: 85, updatedAt: "2026-10-15T00:00:00.000Z" };
}
