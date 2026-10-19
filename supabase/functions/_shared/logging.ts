const forbiddenKeys = /password|secret|token|authorization|private.?key|file.?content|full.?prompt/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, forbiddenKeys.test(key) ? "[REDACTED]" : sanitize(child)]),
  );
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const payload = JSON.stringify({ level, event, ...sanitize(fields), timestamp: new Date().toISOString() });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
