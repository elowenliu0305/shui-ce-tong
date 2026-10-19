import { describe, expect, it, vi } from "vitest";

import { requestStructuredModelAnswer } from "./model-provider.ts";

const env = (name: string) => ({
  MODEL_API_BASE_URL: "https://model.example/v1",
  MODEL_API_KEY: "local-test-key",
  MODEL_NAME: "test-model",
})[name];

describe("可替换模型客户端", () => {
  it("缺少本地模型配置时安全失败且不发请求", async () => {
    const fetcher = vi.fn();
    await expect(requestStructuredModelAnswer([], { fetcher, env: () => undefined })).rejects.toThrow("model_not_configured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("发送 OpenAI 兼容请求并解析纯 JSON 或代码块 JSON", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: "```json\n{\"answer\":\"先做现金流表\",\"citationIds\":[\"c1\"],\"suggestedQuestions\":[\"下一步？\"]}\n```" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const result = await requestStructuredModelAnswer([{ role: "user", content: "怎么改善现金流？" }], { fetcher, env, retries: 0 });
    expect(result).toEqual({ answer: "先做现金流表", citationIds: ["c1"], suggestedQuestions: ["下一步？"] });
    expect(fetcher).toHaveBeenCalledWith("https://model.example/v1/chat/completions", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer local-test-key" }),
    }));
  });

  it("对限流进行有界重试，并拒绝非结构化或超长回答", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "{\"answer\":\"恢复成功\"}" } }] }), { status: 200 }));
      const pending = requestStructuredModelAnswer([], { fetcher, env, retries: 1 });
      await vi.runAllTimersAsync();
      await expect(pending).resolves.toMatchObject({ answer: "恢复成功" });
      expect(fetcher).toHaveBeenCalledTimes(2);

      const invalid = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "不是 JSON" } }] }), { status: 200 }));
      await expect(requestStructuredModelAnswer([], { fetcher: invalid, env, retries: 0 })).rejects.toThrow();

      const oversized = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "长".repeat(20_001) }) } }] }), { status: 200 }));
      await expect(requestStructuredModelAnswer([], { fetcher: oversized, env, retries: 0 })).rejects.toThrow("model_invalid_payload");
    } finally {
      vi.useRealTimers();
    }
  });
});
