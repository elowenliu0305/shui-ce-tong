import { afterEach, describe, expect, it, vi } from "vitest";

import { getDataBackend, getSupabaseBrowserConfig } from "../../src/services/supabase/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase browser config", () => {
  it("defaults to mock without production configuration", () => {
    vi.stubEnv("VITE_DATA_BACKEND", "");
    expect(getDataBackend()).toBe("mock");
  });

  it("accepts HTTP only for localhost", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321/");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "local-publishable-key");
    expect(getSupabaseBrowserConfig().url).toBe("http://127.0.0.1:54321");
  });

  it("rejects insecure remote URLs", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://example.com");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    expect(() => getSupabaseBrowserConfig()).toThrow("必须使用 HTTPS");
  });

  it("rejects placeholder keys in Supabase mode", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "replace-with-key");
    expect(() => getSupabaseBrowserConfig()).toThrow("缺少");
  });
});
