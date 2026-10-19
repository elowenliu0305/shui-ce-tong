import { describe, expect, it } from "vitest";

import { enforceRateLimit, resetRateLimitsForTests } from "../../supabase/functions/_shared/rate-limit.ts";

describe("Edge 限流", () => {
  it("在窗口内拒绝超限请求并在新窗口恢复", () => {
    resetRateLimitsForTests();
    enforceRateLimit("agent:user-a", { limit: 2, windowMs: 1_000 }, 0);
    enforceRateLimit("agent:user-a", { limit: 2, windowMs: 1_000 }, 10);
    expect(() => enforceRateLimit("agent:user-a", { limit: 2, windowMs: 1_000 }, 20)).toThrow("请求过于频繁");
    expect(() => enforceRateLimit("agent:user-a", { limit: 2, windowMs: 1_000 }, 1_001)).not.toThrow();
  });

  it("不同账号和功能使用独立桶", () => {
    resetRateLimitsForTests();
    enforceRateLimit("search:user-a", { limit: 1, windowMs: 1_000 }, 0);
    expect(() => enforceRateLimit("search:user-b", { limit: 1, windowMs: 1_000 }, 1)).not.toThrow();
    expect(() => enforceRateLimit("agent:user-a", { limit: 1, windowMs: 1_000 }, 1)).not.toThrow();
  });
});
