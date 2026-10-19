import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseBrowserConfig } from "./config";

let singleton: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (singleton) return singleton;

  const { url, publishableKey } = getSupabaseBrowserConfig();
  singleton = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: "shuicetong.auth",
    },
    global: {
      headers: { "X-Client-Info": "shuicetong-web/0.1.0" },
    },
  });

  return singleton;
}

export function resetSupabaseClientForTests(): void {
  singleton = null;
}
