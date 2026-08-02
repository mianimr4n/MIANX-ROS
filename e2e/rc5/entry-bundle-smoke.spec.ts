/**
 * RC5-PERF-01 — critical-route smoke after entry-bundle residual reduction.
 * No Production credentials. Verifies lazy routes render without blank screens.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WEB = process.env.D3_E2E_BASE_URL ?? "http://localhost:3000";

async function assertNoBlankMain(page: Page) {
  await expect(page.locator("main")).toBeVisible({ timeout: 60_000 });
  const text = (await page.locator("main").innerText()).trim();
  expect(text.length, "main should not be empty").toBeGreaterThan(0);
}

async function assertNoChunkCrash(page: Page) {
  const crash = page.getByText(/failed to load updated assets|unexpected error occurred/i);
  await expect(crash).toHaveCount(0);
}

test.describe("RC5-PERF-01 critical route smoke", () => {
  test("direct load / renders home chrome", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Popular Categories|Today/i }).first()).toBeVisible({
      timeout: 60_000,
    });
    await assertNoBlankMain(page);
    await assertNoChunkCrash(page);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  });

  test("direct load /menu + refresh keeps menu usable", async ({ page }) => {
    await page.goto(`${WEB}/menu`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /menu/i }).first()).toBeVisible({ timeout: 60_000 });
    await assertNoBlankMain(page);
    await assertNoChunkCrash(page);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /menu/i }).first()).toBeVisible({ timeout: 60_000 });
    await assertNoChunkCrash(page);
  });

  test("direct load /admin/login + axe spot-check", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel(/^Password$/i)).toBeVisible();
    await assertNoChunkCrash(page);

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const bad = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, impact: v.impact })))).toEqual([]);
  });

  test("lazy /reset-password renders without chunk crash", async ({ page }) => {
    await page.goto(`${WEB}/reset-password`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // Without a recovery session the honest expired-link surface is expected.
    await expect(
      page
        .getByRole("heading", { name: /reset link expired|choose a new password|reset password/i })
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await assertNoChunkCrash(page);
  });

  test("navigation / → /menu → /admin/login works", async ({ page }) => {
    await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("link", { name: /^Menu$/i }).first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("link", { name: /^Menu$/i }).first().click();
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.getByRole("heading", { name: /menu/i }).first()).toBeVisible({ timeout: 60_000 });

    await page.goto(`${WEB}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });
    await assertNoChunkCrash(page);
  });
});
