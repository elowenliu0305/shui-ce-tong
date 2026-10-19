import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } } },
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 360, height: 800 } } }
  ],
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true
  }
});
