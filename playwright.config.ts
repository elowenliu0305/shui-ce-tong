import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: process.env.E2E_SCREENSHOTS === "1" ? "on" : "off"
  },
  projects: [
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } } },
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 360, height: 800 } } },
    { name: "mobile-430", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 430, height: 932 } } }
  ],
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true
  }
});
