import { defineConfig, devices } from "@playwright/test";

/**
 * RC4-7 Performance & Polish browser + axe.
 * Requires local website (:3000); admin tests need API + enterprise seeds.
 */
export default defineConfig({
  testDir: "./e2e/rc4",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: "docs/testing/acceptance-evidence/rc4-performance-polish/playwright-results.json",
      },
    ],
  ],
  timeout: 120_000,
  use: {
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 30_000 },
  testMatch: [/performance-polish\.spec\.ts/],
});
