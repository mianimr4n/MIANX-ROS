import { defineConfig, devices } from "@playwright/test";

/**
 * Canonical menu corrective Playwright journey — local Supabase + API + website only.
 * Run: pnpm exec playwright test --config=playwright.menu.config.ts
 */
export default defineConfig({
  testDir: "./e2e/menu",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/testing/acceptance-evidence/canonical-menu-playwright-results.json" }],
  ],
  timeout: 420_000,
  use: {
    baseURL: process.env.MENU_E2E_BASE_URL ?? process.env.D4_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 20_000 },
  testMatch: [/canonical-menu-price-journey\.spec\.ts/, /admin-menu-ui-review\.spec\.ts/],
});
