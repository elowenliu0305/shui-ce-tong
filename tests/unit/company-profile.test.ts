import { describe, expect, it } from "vitest";

import type { CompanyProfileFields } from "../../src/domain/enterprise";
import { validateProfile } from "../../src/domain/rules/profile-completeness";
import { known, unknown, unset } from "../../src/domain/shared";

function fields(): CompanyProfileFields {
  return {
    companyName: known("杭州新悦科技有限公司"),
    region: known({ province: "浙江省", city: "杭州市" }),
    industry: known("软件和信息技术服务业"),
    unifiedSocialCreditCode: unknown(),
    establishedDate: unset(),
    taxpayerType: known("一般纳税人"),
    dataYear: known(2025),
    annualRevenue: known({ amountYuan: 0, currency: "CNY", dataYear: 2025 }),
    totalAssets: unknown(),
    employeeCount: known(0),
    taxableIncome: unset(),
    researchInvestment: known({ amountYuan: 860_000, currency: "CNY", dataYear: 2025 }),
    enjoyedTaxIncentives: known([])
  };
}

describe("validateProfile", () => {
  it("distinguishes known zero, unknown and unset", () => {
    const result = validateProfile(fields());
    expect(result.valid).toBe(true);
    expect(result.knownCount).toBe(9);
    expect(result.unknownCount).toBe(2);
    expect(result.unsetCount).toBe(2);
    expect(result.completionPercent).toBe(69);
  });

  it("validates required values and money in integer yuan", () => {
    const input = fields();
    input.companyName = unset();
    input.annualRevenue = known({ amountYuan: -1, currency: "CNY", dataYear: 2025 });
    const result = validateProfile(input);
    expect(result.errors.companyName).toBeTruthy();
    expect(result.errors.annualRevenue).toContain("人民币整数元");
  });
});
