const forbiddenKeys = /password|secret|token|authorization|private.?key|file.?content|full.?prompt/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, forbiddenKeys.test(key) ? "[REDACTED]" : sanitize(child)]),
  );
}

const SAFE_STAGE_PATTERN = /^[a-z0-9_.:-]{1,64}$/i;

/**
 * 把任意异常收敛为可检索的稳定错误阶段标识。
 * 优先使用 HttpError.code（如 unauthorized、retrieval_unavailable 经 code 暴露）；
 * 其次使用函数内部抛出的短标识 Error message（如 "retrieval_unavailable"）；
 * 其余一律归为 unhandled，不记录原始 message，避免泄露内部细节。
 */
export function errorStageOf(error: unknown): string {
  if (!error || typeof error !== "object") return "unhandled";
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && SAFE_STAGE_PATTERN.test(code)) return code;
  if (error instanceof Error && typeof error.message === "string" && SAFE_STAGE_PATTERN.test(error.message)) {
    return error.message;
  }
  return "unhandled";
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const payload = JSON.stringify({ level, event, ...(sanitize(fields) as Record<string, unknown>), timestamp: new Date().toISOString() });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
