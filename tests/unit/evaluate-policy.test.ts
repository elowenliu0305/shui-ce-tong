import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../../src/domain/rules/evaluate-policy";
import { known, unknown } from "../../src/domain/shared";
import { policyRules } from "../../src/fixtures/policies";
import { makeProfile } from "../factories";

describe("evaluatePolicy", () => {
  const time = "2026-10-15T00:00:00.000Z";

  it("returns eligible when every required condition passes", () => {
    expect(evaluatePolicy(policyRules[1], makeProfile(), time).status).toBe("eligible");
  });

  it("returns ineligible when a required condition fails", () => {
    const profile = makeProfile({ employeeCount: known(301) });
    const result = evaluatePolicy(policyRules[1], profile, time);
    expect(result.status).toBe("ineligible");
    expect(result.failed.map((item) => item.id)).toContain("employees-limit");
  });

  it("returns pending when a condition input is unknown", () => {
    const profile = makeProfile({ totalAssets: unknown() });
    const result = evaluatePolicy(policyRules[1], profile, time);
    expect(result.status).toBe("pending");
    expect(result.missing.map((item) => item.fieldPath)).toContain("totalAssets.amountYuan");
  });
});
