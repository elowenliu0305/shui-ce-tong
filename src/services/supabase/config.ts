export type DataBackend = "mock" | "supabase";

export interface SupabaseBrowserConfig {
  url: string;
  publishableKey: string;
}

function readEnv(name: keyof ImportMetaEnv): string {
  return (import.meta.env[name] ?? "").trim();
}

export function getDataBackend(): DataBackend {
  const value = readEnv("VITE_DATA_BACKEND");
  if (!value || value === "mock") return "mock";
  if (value === "supabase") return "supabase";
  throw new Error(`VITE_DATA_BACKEND 必须是 mock 或 supabase，当前为 ${value}`);
}

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
  const url = readEnv("VITE_SUPABASE_URL");
  const publishableKey = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!url || !publishableKey || publishableKey.startsWith("replace-")) {
    throw new Error("Supabase 模式缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("VITE_SUPABASE_URL 不是有效 URL");
  }

  const isLocal = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error("生产 Supabase URL 必须使用 HTTPS；仅本机可使用 HTTP");
  }

  return { url: parsed.toString().replace(/\/$/, ""), publishableKey };
}
