import { logEvent } from "./logging.ts";

export type StableErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "idempotency_mismatch"
  | "dependency_unavailable"
  | "rate_limited"
  | "internal_error";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: StableErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function requestId(request: Request): string {
  const supplied = request.headers.get("x-request-id");
  return supplied && /^[0-9a-f-]{36}$/i.test(supplied) ? supplied : crypto.randomUUID();
}

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin") ?? "";
  const configured = Deno.env.get("ALLOWED_WEB_ORIGINS")?.split(",").map((item) => item.trim()) ?? [];
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
  return local || configured.includes(origin) ? origin : "null";
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "X-Request-Id, Server-Timing",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function jsonResponse(request: Request, value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { ...corsHeaders(request), "Cache-Control": "no-store" },
  });
}

export async function handleRequest(
  request: Request,
  handler: (context: { requestId: string }) => Promise<unknown>,
): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  const id = requestId(request);
  const startedAt = performance.now();

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > 65_536) {
      throw new HttpError(413, "validation_failed", "请求内容过大。", false);
    }
    const response = jsonResponse(request, await handler({ requestId: id }));
    const durationMs = Math.round(performance.now() - startedAt);
    response.headers.set("X-Request-Id", id);
    response.headers.set("Server-Timing", `edge;dur=${durationMs}`);
    logEvent("info", "edge.request.completed", {
      requestId: id,
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
      durationMs,
    });
    return response;
  } catch (error) {
    const known = error instanceof HttpError
      ? error
      : new HttpError(500, "internal_error", "服务暂时不可用，请稍后重试。", true);
    const durationMs = Math.round(performance.now() - startedAt);
    logEvent(known.status >= 500 ? "error" : "warn", "edge.request.failed", {
      requestId: id,
      method: request.method,
      path: new URL(request.url).pathname,
      status: known.status,
      code: known.code,
      retryable: known.retryable,
      durationMs,
    });
    const response = jsonResponse(request, {
      error: {
        code: known.code,
        message: known.message,
        requestId: id,
        retryable: known.retryable,
        ...(known.details ? { details: known.details } : {}),
      },
    }, known.status);
    response.headers.set("X-Request-Id", id);
    response.headers.set("Server-Timing", `edge;dur=${durationMs}`);
    return response;
  }
}

