import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/dashboard-ux",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/testing/acceptance-evidence/dashboard-ux-playwright-results.json" }],
  ],
  use: {
    baseURL: process.env.DASHBOARD_UX_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
