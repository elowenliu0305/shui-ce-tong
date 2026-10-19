import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../../supabase/functions/_shared/http.ts";
import { errorStageOf, logEvent } from "../../supabase/functions/_shared/logging.ts";

describe("错误阶段提取", () => {
  it("优先使用 HttpError 的稳定 code", () => {
    expect(errorStageOf(new HttpError(503, "dependency_unavailable", "x", true))).toBe("dependency_unavailable");
    expect(errorStageOf(new HttpError(401, "unauthorized", "x"))).toBe("unauthorized");
  });

  it("接受函数内部抛出的短标识 Error message", () => {
    expect(errorStageOf(new Error("retrieval_unavailable"))).toBe("retrieval_unavailable");
    expect(errorStageOf(new Error("bucket_not_found"))).toBe("bucket_not_found");
  });

  it("把不可识别异常收敛为 unhandled 而不保留原文", () => {
    expect(errorStageOf(new Error("连接 10.0.0.5:5432 失败，用户 admin"))).toBe("unhandled");
    expect(errorStageOf(null)).toBe("unhandled");
    expect(errorStageOf("plain string")).toBe("unhandled");
  });

  it("接受带 SQLSTATE code 的依赖错误对象", () => {
    expect(errorStageOf({ code: "42P01", message: "relation does not exist" })).toBe("42P01");
  });
});

describe("日志脱敏与输出", () => {
  let info: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("按级别路由到对应 console 通道并携带时间戳", () => {
    logEvent("info", "edge.request.completed", { requestId: "r1" });
    logEvent("warn", "edge.request.failed", { requestId: "r1" });
    logEvent("error", "agent.persist.failed", { requestId: "r1" });
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(String(info.mock.calls[0][0]));
    expect(parsed).toMatchObject({ level: "info", event: "edge.request.completed", requestId: "r1" });
    expect(parsed.timestamp).toEqual(expect.any(String));
    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({ level: "error", event: "agent.persist.failed" });
  });

  it("递归遮蔽敏感字段名，包括嵌套对象和数组", () => {
    logEvent("error", "auth.attempt", {
      password: "plain",
      nested: { sessionToken: "plain", items: [{ authorization: "plain", safe: 1 }] },
    });
    const payload = JSON.parse(String(error.mock.calls[0][0]));
    expect(payload.password).toBe("[REDACTED]");
    expect(payload.nested.sessionToken).toBe("[REDACTED]");
    expect(payload.nested.items[0].authorization).toBe("[REDACTED]");
    expect(payload.nested.items[0].safe).toBe(1);
  });
});
