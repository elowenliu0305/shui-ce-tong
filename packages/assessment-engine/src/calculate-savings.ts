import { readProfilePath } from "./evaluate-policy";
import type { CompanyProfileDraft, PolicyMatch, PolicyRuleDefinition, SavingsEstimate } from "./types";

type Formula = (inputs: Record<string, number>) => number;

const formulaRegistry: Record<string, Formula> = {
  "rd-saving-demo": (inputs) => Math.round((inputs["researchInvestment.amountYuan"] ?? 0) * 0.25),
  "small-profit-saving-demo": (inputs) => Math.round((inputs["taxableIncome.amountYuan"] ?? 0) * 0.05),
};

export interface SavingsCalculation {
  estimates: SavingsEstimate[];
  totalYuan: number | null;
}

export function calculateSavings(profile: CompanyProfileDraft, matches: PolicyMatch[], rules: PolicyRuleDefinition[]): SavingsCalculation {
  const ruleByPolicy = new Map(rules.map((rule) => [rule.policyVersionId, rule]));
  const estimates = matches.map<SavingsEstimate>((match) => {
    const rule = ruleByPolicy.get(match.policyVersionId);
    if (!rule || match.status === "ineligible" || !rule.formulaId || !formulaRegistry[rule.formulaId]) {
      return { policyVersionId: match.policyVersionId, status: "excluded", formulaId: rule?.formulaId ?? null, formulaVersion: rule?.formulaVersion ?? null, inputValues: {}, amountYuan: null, missingFieldPaths: [], overlapGroup: rule?.overlapGroup ?? null };
    }
    const values = Object.fromEntries(rule.formulaInputPaths.map((path) => [path, readProfilePath(profile, path)]));
    const missingFieldPaths = Object.entries(values).filter(([, value]) => value.status !== "known" || typeof value.value !== "number").map(([path]) => path);
    const inputValues = Object.fromEntries(Object.entries(values).filter(([, value]) => value.status === "known").map(([path, value]) => [path, value.value]));
    if (match.status === "pending" || missingFieldPaths.length) {
      return { policyVersionId: match.policyVersionId, status: "pending", formulaId: rule.formulaId, formulaVersion: rule.formulaVersion, inputValues, amountYuan: null, missingFieldPaths: [...new Set([...missingFieldPaths, ...match.missing.map((item) => item.fieldPath)])], overlapGroup: rule.overlapGroup };
    }
    return { policyVersionId: match.policyVersionId, status: "computed", formulaId: rule.formulaId, formulaVersion: rule.formulaVersion, inputValues, amountYuan: formulaRegistry[rule.formulaId](inputValues as Record<string, number>), missingFieldPaths: [], overlapGroup: rule.overlapGroup };
  });

  const computedGroups = new Map<string, number[]>();
  estimates.forEach((estimate, index) => {
    if (estimate.status === "computed" && estimate.overlapGroup) computedGroups.set(estimate.overlapGroup, [...(computedGroups.get(estimate.overlapGroup) ?? []), index]);
  });
  for (const indices of computedGroups.values()) {
    if (indices.length < 2) continue;
    const winner = [...indices].sort((a, b) => (ruleByPolicy.get(estimates[b].policyVersionId)?.overlapPriority ?? 0) - (ruleByPolicy.get(estimates[a].policyVersionId)?.overlapPriority ?? 0))[0];
    for (const index of indices) if (index !== winner) estimates[index] = { ...estimates[index], status: "excluded", amountYuan: null };
  }

  const computed = estimates.filter((item) => item.status === "computed" && item.amountYuan !== null);
  return { estimates, totalYuan: computed.length ? computed.reduce((sum, item) => sum + (item.amountYuan ?? 0), 0) : null };
}
