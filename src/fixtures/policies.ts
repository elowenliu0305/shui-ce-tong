import type { PolicyRuleDefinition } from "../domain/assessment";

export const policyRules: PolicyRuleDefinition[] = [
  {
    id: "rule-rd-deduction",
    version: "demo-2026.1",
    policyVersionId: "doc-rd-deduction@demo-2026.1",
    title: "研发费用加计扣除（演示规则）",
    conditions: [
      { id: "rd-known", fieldPath: "researchInvestment", operator: "isKnown", expected: true, basisRefs: ["source-rd-policy"], required: true },
      { id: "rd-positive", fieldPath: "researchInvestment.amountYuan", operator: "gte", expected: 1, basisRefs: ["source-rd-policy"], required: true }
    ],
    formulaId: "rd-saving-demo",
    formulaVersion: "1",
    formulaInputPaths: ["researchInvestment.amountYuan"],
    overlapGroup: null,
    overlapPriority: 10,
    citation: { documentId: "doc-rd-deduction", sourceId: "source-rd-policy", title: "研发费用税前加计扣除政策指引", docNo: null, locator: "演示规则来源", excerpt: "正式适用条件与比例需以后端核验政策版本为准。" }
  },
  {
    id: "rule-small-profit",
    version: "demo-2026.1",
    policyVersionId: "doc-small-profit@demo-2026.1",
    title: "小型微利企业所得税优惠（演示规则）",
    conditions: [
      { id: "income-limit", fieldPath: "taxableIncome.amountYuan", operator: "lte", expected: 3_000_000, basisRefs: ["source-small-profit"], required: true },
      { id: "assets-limit", fieldPath: "totalAssets.amountYuan", operator: "lte", expected: 50_000_000, basisRefs: ["source-small-profit"], required: true },
      { id: "employees-limit", fieldPath: "employeeCount", operator: "lte", expected: 300, basisRefs: ["source-small-profit"], required: true }
    ],
    formulaId: "small-profit-saving-demo",
    formulaVersion: "1",
    formulaInputPaths: ["taxableIncome.amountYuan"],
    overlapGroup: "enterprise-income-tax-demo",
    overlapPriority: 20,
    citation: { documentId: "doc-small-profit", sourceId: "source-small-profit", title: "小型微利企业所得税优惠政策摘要", docNo: "财税演示〔2026〕01号", locator: "演示条件", excerpt: "本条目仅用于前端规则演示，不构成正式税务结论。" }
  }
];
