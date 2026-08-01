import { defineConfig, devices } from "@playwright/test";

/**
 * Password recovery public route + axe.
 * Requires website on :3000 (no API required for missing-session UI).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: process.env.D3_E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 15_000 },
  testMatch: [/password-recovery\.spec\.ts/],
});
