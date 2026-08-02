/**
 * RC6-QA-03 — Integrated Owner Command Center journey (local / CI-ephemeral only).
 * Read-only: no business mutations. Never targets Production.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const OWNER_EMAIL = "admin@telepizza.pk";
const DASHBOARD = "/admin/dashboard";

const COMMAND_MODES = [
  { id: "PRE_OPEN", urlToken: "pre-open", label: /Pre-open/i },
  { id: "LIVE_OPERATIONS", urlToken: "live", label: /Live Operations/i },
  { id: "CLOSING", urlToken: "closing", label: /Closing/i },
] as const;

function assertLocalWeb() {
  const host = new URL(WEB).hostname;
  expect(host === "localhost" || host === "127.0.0.1", `non-local WEB=${WEB}`).toBeTruthy();
  expect(/onrender\.com|vercel\.app|supabase\.co/i.test(WEB)).toBeFalsy();
}

function attachGuards(page: Page) {
  const pageErrors: string[] = [];
  const networkFaults: string[] = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status < 500) return;
    let pathname = res.url();
    try {
      pathname = new URL(res.url()).pathname;
    } catch {
      /* keep raw */
    }
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/auth/") ||
      pathname.includes("/admin") ||
      pathname === "/readyz" ||
      pathname === "/healthz"
    ) {
      networkFaults.push(`${res.request().method()} ${pathname} → ${status}`);
    }
  });

  return {
    assertClean() {
      expect(pageErrors, pageErrors.join("\n")).toEqual([]);
      expect(networkFaults, networkFaults.join("\n")).toEqual([]);
    },
  };
}

async function loginOwner(page: Page) {
  const account = enterpriseAccount(OWNER_EMAIL);
  await browserLogin(page, account.email, account.password);
}

async function openDashboard(page: Page) {
  await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(DASHBOARD.replace("/", "\\/")));
  await expect(page.getByTestId("owner-command-center")).toBeVisible({ timeout: 60_000 });
}

async function assertCorePanels(page: Page) {
  await expect(page.getByTestId("what-changed-panel")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("exception-center")).toBeVisible();
  await expect(page.getByTestId("approval-inbox")).toBeVisible();
  await expect(page.getByTestId("branch-health-panel")).toBeVisible();
  await expect(page.getByTestId("profitability-truth-panel")).toBeVisible();
  await expect(page.getByTestId("eod-pack-panel")).toBeVisible();
  await expect(page.getByTestId("operational-timeline")).toBeVisible();

  const since = page.getByTestId("what-changed-since");
  await expect(since).toBeVisible();
  const sinceText = await since.innerText();
  expect(sinceText).not.toMatch(/since your last login/i);
  expect(sinceText).toMatch(
    /Since your last review on this device|Changes during the selected business window/i,
  );

  await expect(page.getByTestId("eod-pack-nonfinal")).toBeVisible();
  await expect(page.getByText(/Accounting Posted|Operational Estimate/i).first()).toBeVisible();
}

async function selectCommandMode(page: Page, mode: (typeof COMMAND_MODES)[number]) {
  await expect(page.getByTestId("command-mode-selector")).toBeVisible();
  // Click the visible label (radio input is sr-only and can be pointer-intercepted).
  await page
    .locator('[data-testid="command-mode-selector"] label')
    .filter({ hasText: mode.label })
    .click();
  await expect(page.getByTestId("owner-command-center")).toHaveAttribute(
    "data-selected-command-mode",
    mode.id,
    { timeout: 30_000 },
  );
  await expect(page).toHaveURL(new RegExp(`commandMode=${mode.urlToken}`));
  await expect(page.getByRole("radio", { name: mode.label })).toBeChecked();
}

test.describe("RC6-QA-03 Owner Command Center integration", () => {
  test.describe.configure({ mode: "serial" });

  test("A: Owner journey — login, panels, modes, EOD, What Changed, logout", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);

    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await loginOwner(page);
    await openDashboard(page);
    await assertCorePanels(page);

    // Reset What Changed baseline (device-local) — safe no-mutation.
    await page.getByTestId("what-changed-reset-baseline").click();
    await expect(page.getByTestId("what-changed-since")).toContainText(
      /Changes during the selected business window|Since your last review on this device/i,
    );

    // Timeline filters
    await page.getByTestId("timeline-domain-filter").selectOption("kitchen");
    await page.getByTestId("timeline-severity-filter").selectOption("all");

    // Mode sweep — panels remain present; values may change emphasis only.
    for (const mode of COMMAND_MODES) {
      await selectCommandMode(page, mode);
      await assertCorePanels(page);
    }

    // EOD export controls present (download handlers are local; no assert of file content in CI).
    await expect(page.getByTestId("eod-pack-download-csv")).toBeVisible();
    await expect(page.getByTestId("eod-pack-download-json")).toBeVisible();
    await expect(page.getByTestId("eod-pack-print")).toBeVisible();

    // KPI drill-down + browser Back (from dashboard URL stack — not polluted by full reloads)
    await page.goto(`${DASHBOARD}?commandMode=live`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("owner-command-center")).toBeVisible({ timeout: 60_000 });
    const kpi = page.getByTestId(/kpi-drilldown-/).first();
    await expect(kpi).toBeVisible({ timeout: 30_000 });
    await kpi.click();
    await expect(page).not.toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("owner-command-center")).toBeVisible({ timeout: 60_000 });

    // Refresh protected dashboard
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("owner-command-center")).toBeVisible({ timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/admin\/login/);

    // Sign out + gate
    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(
      page
        .getByLabel(/^Email$/i)
        .or(page.getByRole("heading", { name: /Staff access required/i })),
    ).toBeVisible({ timeout: 60_000 });
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("owner-command-center")).toHaveCount(0);

    guards.assertClean();
  });

  test("B: Authenticated dashboard axe across command modes", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    await loginOwner(page);

    for (const mode of COMMAND_MODES) {
      await page.goto(`${DASHBOARD}?commandMode=${mode.urlToken}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("owner-command-center")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("owner-command-center")).toHaveAttribute(
        "data-selected-command-mode",
        mode.id,
      );

      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const critical = axe.violations.filter((v) => v.impact === "critical");
      const serious = axe.violations.filter((v) => v.impact === "serious");
      expect(
        critical,
        `${mode.id} critical: ${JSON.stringify(critical.map((v) => v.id))}`,
      ).toEqual([]);
      expect(
        serious,
        `${mode.id} serious: ${JSON.stringify(serious.map((v) => v.id))}`,
      ).toEqual([]);
    }

    guards.assertClean();
  });

  test("C: Mobile dashboard smoke without horizontal overflow", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginOwner(page);
    await openDashboard(page);
    await assertCorePanels(page);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow, "dashboard should not force horizontal overflow").toBeFalsy();
    guards.assertClean();
  });
});
