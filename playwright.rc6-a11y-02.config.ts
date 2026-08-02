import { defineConfig, devices } from "@playwright/test";

/**
 * RC6-A11Y-02 — public accessibility regression (Chromium).
 * Local website only. No Production credentials.
 */
export default defineConfig({
  testDir: "./e2e/rc6",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 30_000 },
  testMatch: [/a11y-02-public\.spec\.ts/],
});
