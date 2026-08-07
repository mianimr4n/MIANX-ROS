import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.IDENTITY_01_WEB_URL ?? "http://localhost:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("IDENTITY-01 Playwright refuses non-loopback targets");

export default defineConfig({
  expect: { timeout: 30_000 },
  testDir: "./e2e/identity-01",
  testMatch: /onboarding\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 240_000,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: "off", storageState: undefined },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  outputDir: "test-results/identity-01",
});
