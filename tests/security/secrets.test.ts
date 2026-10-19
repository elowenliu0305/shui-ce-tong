import { describe, expect, it } from "vitest";

import { scanText } from "../../scripts/secret-scan-lib.mjs";

describe("secret scanner", () => {
  it("allows documented empty values and browser publishable placeholders", () => {
    expect(
      scanText('MODEL_API_KEY=""\nVITE_SUPABASE_PUBLISHABLE_KEY="replace-me"'),
    ).toEqual([]);
  });

  it.each([
    ["OpenAI-style secret", `sk-${"a".repeat(24)}`],
    ["Supabase secret key", `sb_secret_${"b".repeat(24)}`],
    ["Supabase service-role value", `SUPABASE_SERVICE_ROLE_KEY="${"c".repeat(32)}"`],
    ["embedded API key", `MODEL_API_KEY="${"d".repeat(32)}"`],
    ["private key", "-----BEGIN PRIVATE KEY-----"],
  ])("detects %s", (label, sample) => {
    expect(scanText(sample)).toEqual([
      expect.objectContaining({ label }),
    ]);
  });
});
