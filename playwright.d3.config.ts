import { defineConfig, devices } from "@playwright/test";

/**
 * D3 browser E2E — Journeys F–K + public booking.
 *
 * Requires local Supabase + API (:4000) + website (:3000).
 * Controlled fixtures only — never real employee/customer data.
 *
 * Install: pnpm --filter telepizza-pakistan exec playwright install chromium
 * Run:     pnpm exec playwright test --config=playwright.d3.config.ts
 */
export default defineConfig({
  testDir: "./e2e/d3",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "docs/testing/acceptance-evidence/d3-playwright-results.json" }]],
  timeout: 120_000,
  use: {
    // Prefer localhost for Origin/CORS match with API_CORS_ORIGIN.
    // API requests in helpers use 127.0.0.1 to avoid Windows ::1 ECONNREFUSED.
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 15_000 },
  // Journey-heavy files before long multi-login dashboard smoke.
  testMatch: [
    /journey-[f-k]\.spec\.ts/,
    /public-booking\.spec\.ts/,
    /failure-states\.spec\.ts/,
    /northern-bypass-isolated\.spec\.ts/,
    /dashboard-smoke\.spec\.ts/,
  ],
});
