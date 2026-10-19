import { describe, expect, it } from "vitest";

import { calculateSavings } from "../../src/domain/rules/calculate-savings";
import { evaluatePolicy } from "../../src/domain/rules/evaluate-policy";
import { unknown } from "../../src/domain/shared";
import { policyRules } from "../../src/fixtures/policies";
import { makeProfile } from "../factories";

const time = "2026-10-15T00:00:00.000Z";

describe("calculateSavings", () => {
  it("keeps a policy pending when a formula input is missing", () => {
    const profile = makeProfile({ taxableIncome: unknown() });
    const match = evaluatePolicy(policyRules[1], profile, time);
    const result = calculateSavings(profile, [match], policyRules);
    expect(result.estimates[0].status).toBe("pending");
    expect(result.estimates[0].missingFieldPaths).toContain("taxableIncome.amountYuan");
    expect(result.totalYuan).toBeNull();
  });

  it("rejects formula identifiers outside the whitelist", () => {
    const rule = { ...policyRules[0], formulaId: "untrusted-expression" };
    const result = calculateSavings(makeProfile(), [evaluatePolicy(rule, makeProfile(), time)], [rule]);
    expect(result.estimates[0].status).toBe("excluded");
  });

  it("does not double count policies in one overlap group", () => {
    const profile = makeProfile();
    const first = { ...policyRules[1], policyVersionId: "policy-a", overlapPriority: 10 };
    const second = { ...policyRules[1], id: "rule-b", policyVersionId: "policy-b", overlapPriority: 20 };
    const matches = [evaluatePolicy(first, profile, time), evaluatePolicy(second, profile, time)];
    const result = calculateSavings(profile, matches, [first, second]);
    expect(result.estimates.filter((item) => item.status === "computed")).toHaveLength(1);
    expect(result.estimates.filter((item) => item.status === "excluded")).toHaveLength(1);
    expect(result.totalYuan).toBe(50_000);
  });
});
