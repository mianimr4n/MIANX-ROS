import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PHASE2_04_WEB_URL ?? "http://localhost:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) {
  throw new Error("PHASE2-04 Playwright refuses non-loopback targets");
}

export default defineConfig({
  expect: { timeout: 30_000 }, testDir: "./e2e/phase2-04", testMatch: /branch-readiness\.spec\.ts/,
  fullyParallel: false, workers: 1, retries: 0, reporter: [["list"]], timeout: 180_000,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: "off", storageState: undefined },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  outputDir: "test-results/phase2-04",
});
