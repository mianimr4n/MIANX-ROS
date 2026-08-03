import { defineConfig, devices } from "@playwright/test";

/**
 * POLISH-QA headed certification — local / CI-ephemeral only.
 * Never targets Production.
 */
const baseURL = process.env.D3_E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

function assertLocalBaseUrl(url: string) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`POLISH-QA: invalid baseURL: ${url}`);
  }
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`POLISH-QA: baseURL must be loopback, got host=${host}`);
  }
  if (/onrender\.com|vercel\.app|supabase\.co/i.test(url)) {
    throw new Error("POLISH-QA: Production/cloud baseURL refused");
  }
}

assertLocalBaseUrl(baseURL);

export default defineConfig({
  testDir: "./e2e/polish-qa",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 30_000 },
  testMatch: [/certification\.spec\.ts/, /multi-role\.spec\.ts/],
});
