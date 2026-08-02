/**
 * RC5-A11Y-01 — Public marketing home axe + operable chrome.
 * Does not disable color-contrast or link-name rules.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WEB = process.env.D3_E2E_BASE_URL ?? "http://localhost:3000";

async function analyzeHome(page: Page) {
  await page.goto(`${WEB}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Popular Categories|Today/i }).first()).toBeVisible({
    timeout: 60_000,
  });
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
}

function criticalSerious(violations: { impact?: string | null; id: string }[]) {
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  expect(overflow, "horizontal overflow").toBeFalsy();
}

test.describe("RC5-A11Y-01 public home", () => {
  test("desktop @1440: axe 0 critical/serious + named chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const axe = await analyzeHome(page);
    const bad = criticalSerious(axe.violations);
    expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, impact: v.impact })))).toEqual([]);
    expect(axe.violations.some((v) => v.id === "color-contrast")).toBeFalsy();
    expect(axe.violations.some((v) => v.id === "link-name")).toBeFalsy();

    const banner = page.getByRole("banner");
    await expect(page.getByRole("link", { name: /View All/i }).first()).toBeVisible();
    await expect(banner.getByRole("link", { name: /^Order Now$/i })).toBeVisible();
    await expect(banner.getByRole("link", { name: /^My Telepizza$/i })).toBeVisible();
    await expect(banner.getByRole("button", { name: /cart|open cart/i })).toBeVisible();
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: /Telepizza Pakistan on Facebook/i })).toBeVisible();
    await assertNoOverflow(page);
  });

  test("mobile @390: axe 0 critical/serious + menu operable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await analyzeHome(page);
    const bad = criticalSerious(axe.violations);
    expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, impact: v.impact })))).toEqual([]);
    expect(axe.violations.some((v) => v.id === "color-contrast")).toBeFalsy();
    expect(axe.violations.some((v) => v.id === "link-name")).toBeFalsy();

    await expect(page.getByRole("button", { name: /Open menu/i })).toBeVisible();
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(page.getByRole("link", { name: /^Menu$/i }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: /Telepizza Pakistan on Instagram/i })).toBeVisible();
    await assertNoOverflow(page);
  });
});
