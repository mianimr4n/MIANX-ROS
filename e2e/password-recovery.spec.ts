/**
 * Password recovery public UI + axe (no secrets / no token material).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function axeSerious(page: import("@playwright/test").Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

test.describe("Password recovery", () => {
  test("reset-password route renders and has 0 critical/serious axe issues", async ({ page }) => {
    await page.goto("/reset-password", { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Missing/expired session or loading → honest recovery surface (never tokens).
    await expect(page.getByText(/Reset password|Reset link expired|Choose a new password/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/access_token|refresh_token|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

    // Wait out the brief session probe so axe runs on a settled screen.
    await page.waitForTimeout(3000);
    await expect(page.getByRole("link", { name: /login|Request a new link|Back to login/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    const serious = await axeSerious(page);
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, impact: v.impact })))).toEqual([]);
  });
});
