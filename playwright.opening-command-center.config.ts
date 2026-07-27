import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/opening",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/testing/acceptance-evidence/opening-owner-command-center-playwright-results.json" }],
  ],
  use: {
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
