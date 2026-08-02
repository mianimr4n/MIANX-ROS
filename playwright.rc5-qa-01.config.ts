import { defineConfig, devices } from "@playwright/test";

/**
 * RC6-QA-02 (inherits RC5-QA-01 config) — Owner critical-path Chromium smoke
 * (local / CI-ephemeral only). Never targets Production.
 * Requires seeded scripts/.tmp_pw/staff-handover.local.json.
 */
const baseURL = process.env.D3_E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

function assertLocalBaseUrl(url: string) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`RC6-QA-02: invalid baseURL: ${url}`);
  }
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`RC6-QA-02: baseURL must be loopback, got host=${host}`);
  }
  if (/onrender\.com|vercel\.app|supabase\.co/i.test(url)) {
    throw new Error("RC6-QA-02: Production/cloud baseURL refused");
  }
}

assertLocalBaseUrl(baseURL);

export default defineConfig({
  testDir: "./e2e/rc5",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never", outputFolder: "playwright-report-rc5-qa-01" }]]
    : [["list"]],
  timeout: 120_000,
  globalTimeout: process.env.CI ? 30 * 60_000 : undefined,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // Never reuse committed storage state (tokens).
    storageState: undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 30_000 },
  testMatch: [/owner-critical-smoke\.spec\.ts/, /owner-smoke-readonly\.guard\.spec\.ts/],
  outputDir: "test-results/rc5-qa-01",
});
