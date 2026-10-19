import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function required(name: "SUPABASE_TEST_URL" | "SUPABASE_TEST_PUBLISHABLE_KEY" | "SUPABASE_TEST_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Integration test requires ${name}`);
  return value;
}

export function integrationTestsConfigured(): boolean {
  return Boolean(process.env.SUPABASE_TEST_URL && process.env.SUPABASE_TEST_PUBLISHABLE_KEY);
}

export function createTestUserClient(accessToken?: string): SupabaseClient {
  return createClient(required("SUPABASE_TEST_URL"), required("SUPABASE_TEST_PUBLISHABLE_KEY"), {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createTestAdminClient(): SupabaseClient {
  return createClient(required("SUPABASE_TEST_URL"), required("SUPABASE_TEST_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
