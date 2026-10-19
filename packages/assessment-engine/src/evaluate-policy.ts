import type { CompanyProfileDraft, Condition, ConditionEvaluation, FieldValue, PolicyMatch, PolicyRuleDefinition } from "./types";

export interface ProfilePathValue {
  status: "known" | "unknown" | "unset" | "missing";
  value: unknown;
}

export function readProfilePath(profile: CompanyProfileDraft, fieldPath: string): ProfilePathValue {
  const [fieldName, ...rest] = fieldPath.replace(/^fields\./, "").split(".");
  const field = profile.fields[fieldName as keyof typeof profile.fields] as FieldValue<unknown> | undefined;
  if (!field) return { status: "missing", value: undefined };
  if (field.status !== "known") return { status: field.status, value: undefined };
  let value: unknown = field.value;
  for (const segment of rest) {
    if (!value || typeof value !== "object") return { status: "missing", value: undefined };
    value = (value as Record<string, unknown>)[segment];
  }
  return value === undefined ? { status: "missing", value } : { status: "known", value };
}

const asList = (value: unknown) => Array.isArray(value) ? value : [];

export function evaluateCondition(profile: CompanyProfileDraft, condition: Condition): ConditionEvaluation {
  const actual = readProfilePath(profile, condition.fieldPath);
  let outcome: ConditionEvaluation["outcome"] = "unknown";

  if (condition.operator === "isKnown") outcome = actual.status === "known" ? "pass" : "unknown";
  else if (condition.operator === "isUnknown") outcome = actual.status === "unknown" ? "pass" : actual.status === "known" ? "fail" : "unknown";
  else if (actual.status === "known") {
    const expected = condition.expected;
    const passed = (() => {
      switch (condition.operator) {
        case "eq": return actual.value === expected;
        case "neq": return actual.value !== expected;
        case "in": return asList(expected).includes(actual.value);
        case "notIn": return !asList(expected).includes(actual.value);
        case "gte": return Number(actual.value) >= Number(expected);
        case "lte": return Number(actual.value) <= Number(expected);
        case "between": {
          const [minimum, maximum] = asList(expected).map(Number);
          return Number(actual.value) >= minimum && Number(actual.value) <= maximum;
        }
        case "includesAny": return asList(expected).some((item) => asList(actual.value).includes(item));
        case "includesAll": return asList(expected).every((item) => asList(actual.value).includes(item));
        default: return false;
      }
    })();
    outcome = passed ? "pass" : "fail";
  }
  return { ...condition, actual: actual.value, outcome };
}

export function evaluatePolicy(rule: PolicyRuleDefinition, profile: CompanyProfileDraft, evaluatedAt: string): PolicyMatch {
  const evaluations = rule.conditions.map((condition) => evaluateCondition(profile, condition));
  const satisfied = evaluations.filter((item) => item.outcome === "pass");
  const missing = evaluations.filter((item) => item.outcome === "unknown");
  const failed = evaluations.filter((item) => item.outcome === "fail");
  return {
    policyVersionId: rule.policyVersionId,
    status: failed.length ? "ineligible" : missing.length ? "pending" : "eligible",
    satisfied,
    missing,
    failed,
    ruleId: rule.id,
    ruleVersion: rule.version,
    evaluatedAt,
  };
}

export function evaluatePolicies(rules: PolicyRuleDefinition[], profile: CompanyProfileDraft, evaluatedAt: string) {
  return rules.map((rule) => evaluatePolicy(rule, profile, evaluatedAt));
}
