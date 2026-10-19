import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

import { HttpError } from "./http.ts";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new HttpError(500, "internal_error", "服务配置不完整。", false);
  return value;
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "unauthorized", "登录状态已失效，请重新登录。", false);
  return match[1];
}

export function createUserClient(request: Request): SupabaseClient {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: `Bearer ${bearerToken(request)}` } }, auth: { persistSession: false } },
  );
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function requireUser(request: Request): Promise<{ user: User; client: SupabaseClient }> {
  const client = createUserClient(request);
  const { data, error } = await client.auth.getUser(bearerToken(request));
  if (error || !data.user) throw new HttpError(401, "unauthorized", "登录状态已失效，请重新登录。", false);
  if (!data.user.email_confirmed_at) throw new HttpError(403, "forbidden", "请先完成邮箱验证。", false);
  return { user: data.user, client };
}
