/**
 * RC5-QA-01 — Owner critical smoke (local / CI-ephemeral only).
 * Paths: /admin/login → authenticated session; /admin/dashboard shell.
 * Read-only: no order/menu/inventory/finance mutations.
 */
import { expect, test, type Page } from "@playwright/test";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const OWNER_EMAIL = "admin@telepizza.pk";
const DASHBOARD = "/admin/dashboard";

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
    // Ignore optional third-party noise; fail on app/API/auth 5xx.
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

test.describe("RC5-QA-01 Owner critical smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("A: Owner login establishes authenticated session", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    const account = enterpriseAccount(OWNER_EMAIL);

    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });

    await browserLogin(page, account.email, account.password);

    await expect(page).not.toHaveURL(/\/admin\/login/);
    await expect(page).toHaveURL(/\/admin(?!\/login)/);
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Super Admin/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();
    // Confirm session did not bounce back to login.
    await expect(page).not.toHaveURL(/\/admin\/login/);
    guards.assertClean();
  });

  test("B: Owner dashboard loads without blank screen", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    const account = enterpriseAccount(OWNER_EMAIL);

    await browserLogin(page, account.email, account.password);
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(new RegExp(`${DASHBOARD.replace("/", "\\/")}`));
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator("header h1")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("header h1")).toContainText(/Owner Command Center|Executive|Dashboard/i);

    const main = page.locator("#admin-main");
    await expect(main).toBeVisible();
    const text = (await main.innerText()).trim();
    expect(text.length, "dashboard main should not be empty").toBeGreaterThan(40);
    expect(text, "no fake placeholder copy").not.toMatch(/lorem ipsum|fake production/i);

    await expect(page.getByText(/failed to load updated assets|unexpected error occurred/i)).toHaveCount(
      0,
    );
    guards.assertClean();
  });
});
