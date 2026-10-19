import { HttpError } from "./http.ts";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface Bucket { startedAt: number; count: number }

const buckets = new Map<string, Bucket>();

/**
 * Edge isolate 内的快速保护层；正式多实例总量限制仍应由网关或共享存储承担。
 * key 只使用内部 user id，不使用邮箱、token 或请求正文。
 */
export function enforceRateLimit(key: string, options: RateLimitOptions, now = Date.now()): void {
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= options.windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= options.limit) {
    throw new HttpError(429, "rate_limited", "请求过于频繁，请稍后重试。", true, {
      retryAfterSeconds: Math.max(1, Math.ceil((options.windowMs - (now - current.startedAt)) / 1000)),
    });
  }
  current.count += 1;
  if (buckets.size > 5_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (now - bucket.startedAt >= options.windowMs) buckets.delete(bucketKey);
    }
  }
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
