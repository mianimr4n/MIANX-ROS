import { defineConfig, devices } from "@playwright/test";

/**
 * RC5-PERF-01 — critical-route smoke + admin login axe spot-check.
 * Requires local website (:3000). No Production credentials.
 */
export default defineConfig({
  testDir: "./e2e/rc5",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: "docs/testing/acceptance-evidence/rc5-perf-01/playwright-smoke-results.json",
      },
    ],
  ],
  timeout: 90_000,
  use: {
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 30_000 },
  testMatch: [/entry-bundle-smoke\.spec\.ts/],
});
