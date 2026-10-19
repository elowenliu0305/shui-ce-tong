import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "tests/{unit,integration,security}/**/*.{test,spec}.{ts,tsx}",
      "packages/*/tests/**/*.{test,spec}.{ts,tsx}",
      "scripts/knowledge/tests/**/*.{test,spec}.{ts,tsx}",
      "supabase/functions/**/*.test.ts"
    ]
  }
});
