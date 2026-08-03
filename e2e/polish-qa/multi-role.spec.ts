/**
 * POLISH-QA — multi-role local certification (seeded enterprise accounts only).
 * Host/waiter/HR/finance/supplier covered where fixtures exist; otherwise documented residual.
 */
import { expect, test, type Page } from "@playwright/test";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

function assertLocalWeb() {
  const host = new URL(WEB).hostname;
  expect(host === "localhost" || host === "127.0.0.1", `non-local WEB=${WEB}`).toBeTruthy();
}

async function loginFresh(page: Page, email: string) {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const account = enterpriseAccount(email);
  await browserLogin(page, account.email, account.password);
}

async function signOut(page: Page) {
  const button = page.getByRole("button", { name: /Sign out|Logout/i });
  await expect(button.first()).toBeVisible({ timeout: 60_000 });
  await button.first().click();
  await expect(page).toHaveURL(/\/admin\/login/, { timeout: 60_000 });
  await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });
}

const ROLES: Array<{
  email: string;
  role: string;
  landing: RegExp;
  permitted: string;
  forbidden: string;
}> = [
  {
    email: "admin@telepizza.pk",
    role: "super-admin",
    landing: /Owner Command Center|Executive|Dashboard|Orders/i,
    permitted: "/admin/dashboard",
    forbidden: "/admin/login",
  },
  {
    email: "branch.manager@telepizza.pk",
    role: "branch-manager",
    landing: /Opening|Branch|Orders|Dashboard|readiness/i,
    permitted: "/admin/orders",
    forbidden: "/admin/finance",
  },
  {
    email: "kitchen.manager@telepizza.pk",
    role: "kitchen",
    landing: /Kitchen|KDS|Tickets|board/i,
    permitted: "/admin/kitchen-dashboard",
    forbidden: "/admin/finance",
  },
  {
    email: "cashier@telepizza.pk",
    role: "cashier",
    landing: /Cashier|POS|Point of Sale/i,
    permitted: "/admin/home/cashier",
    forbidden: "/admin/hr",
  },
  {
    email: "rider@telepizza.pk",
    role: "rider",
    landing: /Delivery|Rider|Dispatch|Orders/i,
    permitted: "/admin/delivery",
    forbidden: "/admin/hr",
  },
  {
    email: "support@telepizza.pk",
    role: "customer-support",
    landing: /CRM|Customer|Support|Orders/i,
    permitted: "/admin/crm",
    forbidden: "/admin/finance",
  },
];

test.describe("POLISH-QA multi-role certification", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  for (const row of ROLES) {
    test(`${row.role}: login, permitted route, forbidden denial, logout`, async ({ page }) => {
      assertLocalWeb();
      await loginFresh(page, row.email);
      await expect(page).not.toHaveURL(/\/admin\/login/);
      await expect(page.getByText(row.landing).first()).toBeVisible({ timeout: 60_000 });

      await page.goto(row.permitted, { waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/admin\/login/);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 60_000 });

      if (row.role !== "super-admin") {
        await page.goto(row.forbidden, { waitUntil: "domcontentloaded" });
        // Must not show Owner finance/HR primary workspace for restricted roles.
        await expect(page.getByRole("heading", { name: /Owner Command Center/i, level: 1 })).toHaveCount(0);
        // Return to a signed-in shell that exposes Sign out before logout.
        await page.goto(row.permitted, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: /Sign out|Logout/i })).toBeVisible({
          timeout: 60_000,
        });
      }

      await signOut(page);
      await page.goto(row.permitted, { waitUntil: "domcontentloaded" });
      await expect(
        page
          .getByLabel(/^Email$/i)
          .or(page.getByRole("heading", { name: /Staff access required/i }))
          .first(),
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByRole("navigation", { name: /Admin modules/i })).toHaveCount(0);
    });
  }
});
