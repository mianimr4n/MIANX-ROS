import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/opening",
  testMatch: /opening-scope-full\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 900_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/testing/acceptance-evidence/opening-readiness-final-browser-results.json" }],
  ],
  use: {
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
