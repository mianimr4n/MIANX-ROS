/**
 * RC6-A11Y-02 — focused public accessibility regression suite.
 * Asserts 0 critical / 0 serious axe on home + menu + login; does not claim zero total findings.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WEB = process.env.D3_E2E_BASE_URL ?? "http://localhost:3000";

function criticalSerious(violations: { impact?: string | null; id: string }[]) {
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

async function analyze(page: Page, path: string) {
  await page.goto(`${WEB}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (path === "/admin/login") {
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });
  } else if (path === "/menu") {
    await expect(page.getByRole("heading", { name: /Our Menu/i, level: 1 })).toBeVisible({
      timeout: 60_000,
    });
  } else {
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
  }
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  expect(overflow, "horizontal overflow").toBeFalsy();
}

test.describe("RC6-A11Y-02 public accessibility", () => {
  test("home desktop: 0 critical/serious + brand h1 + cart name", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const axe = await analyze(page, "/");
    expect(criticalSerious(axe.violations), JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })))).toEqual([]);
    await expect(page.getByRole("heading", { name: /Telepizza/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cart/i })).toBeVisible();
    await assertNoOverflow(page);
  });

  test("home mobile: menu toggle name/state + axe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await analyze(page, "/");
    expect(criticalSerious(axe.violations), JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })))).toEqual([]);
    const toggle = page.getByRole("button", { name: /Open menu/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("link", { name: /^Menu$/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Open menu/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Open menu/i })).toHaveAttribute("aria-expanded", "false");
    await assertNoOverflow(page);
  });

  test("menu desktop: 0 critical/serious + product h2 under Our Menu", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const axe = await analyze(page, "/menu");
    expect(criticalSerious(axe.violations), JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })))).toEqual([]);
    await expect(page.getByRole("heading", { name: /Our Menu/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    // Favorites control must expose an accessible name (no unnamed nested button).
    await expect(page.getByRole("link", { name: /Sign in to save .+ to favorites/i }).first()).toBeVisible();
    await assertNoOverflow(page);
  });

  test("menu mobile: category chip pressed + axe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await analyze(page, "/menu");
    expect(criticalSerious(axe.violations), JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })))).toEqual([]);
    const chip = page.getByRole("button", { pressed: true }).first();
    await expect(chip).toBeVisible();
    await assertNoOverflow(page);
  });

  test("admin login: 0 critical/serious", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const axe = await analyze(page, "/admin/login");
    expect(criticalSerious(axe.violations), JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })))).toEqual([]);
    await expect(page.getByRole("heading", { name: /Sign in/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
  });
});
