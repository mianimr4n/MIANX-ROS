import { defineConfig, devices } from "@playwright/test";

/**
 * D4 browser role matrix — local Supabase + API + website only.
 * Install: pnpm --filter telepizza-pakistan exec playwright install chromium
 * Run:     pnpm exec playwright test --config=playwright.d4.config.ts
 */
export default defineConfig({
  testDir: "./e2e/d4",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "docs/testing/acceptance-evidence/d4-playwright-results.json" }]],
  timeout: 120_000,
  use: {
    baseURL: process.env.D4_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 15_000 },
  testMatch: [/role-matrix\.spec\.ts/, /responsive\.spec\.ts/, /accessibility\.spec\.ts/],
});
