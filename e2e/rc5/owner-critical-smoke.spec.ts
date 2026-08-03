/**
 * RC6-QA-02 / RC5-QA-01 — Owner critical smoke (local / CI-ephemeral only).
 * Paths: login → dashboard → readonly ops shells → session refresh → logout redirect.
 * Optional: authenticated dashboard axe spot-check (not full admin a11y certification).
 * Read-only: no order/menu/inventory/finance mutations.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const OWNER_EMAIL = "admin@telepizza.pk";
const DASHBOARD = "/admin/dashboard";

/** Readonly Owner shells asserted in CI (stable headings only; no volatile counts). */
const READONLY_SHELLS: Array<{
  path: string;
  title: RegExp;
  /** When true, page uses KitchenManagerShell instead of AdminShell. */
  kitchenShell?: boolean;
}> = [
  { path: "/admin/branch", title: /Branch dashboard/i },
  { path: "/admin/orders", title: /Orders Management/i },
  { path: "/admin/kitchen", title: /Kitchen ERP|Kitchen Display System/i },
  { path: "/admin/delivery", title: /Delivery Management/i },
  {
    path: "/admin/kitchen-dashboard",
    title: /Kitchen Display System|Kitchen operations board/i,
    kitchenShell: true,
  },
  { path: "/admin/reports", title: /Reports & Business Intelligence/i },
];

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

async function assertNoFatalUi(page: Page) {
  await expect(page.getByText(/failed to load updated assets|unexpected error occurred/i)).toHaveCount(
    0,
  );
}

async function assertAdminShellRoute(page: Page, path: string, title: RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page).not.toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("navigation", { name: /Admin modules/i })).toBeVisible({
    timeout: 60_000,
  });
  // Prefer role+name: some pages nest a second h1 inside #admin-main.
  await expect(page.getByRole("heading", { name: title, level: 1 }).first()).toBeVisible({
    timeout: 60_000,
  });
  const main = page.locator("#admin-main");
  await expect(main).toBeVisible();
  const text = (await main.innerText()).trim();
  expect(text.length, `${path} main should not be empty`).toBeGreaterThan(20);
  await assertNoFatalUi(page);
}

async function assertKitchenShellRoute(page: Page, path: string, title: RegExp) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page).not.toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/Telepizza · Kitchen Display System/i)).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("navigation", { name: /Kitchen views/i })).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /^Logout$/i })).toBeVisible();
  await assertNoFatalUi(page);
}

test.describe("RC6-QA-02 Owner critical smoke", () => {
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
    await expect(
      page.getByRole("heading", { name: /Owner Command Center|Executive|Dashboard/i, level: 1 }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const main = page.locator("#admin-main");
    await expect(main).toBeVisible();
    const text = (await main.innerText()).trim();
    expect(text.length, "dashboard main should not be empty").toBeGreaterThan(40);
    expect(text, "no fake placeholder copy").not.toMatch(/lorem ipsum|fake production/i);

    await expect(page.getByTestId("exception-center")).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByTestId("exception-center").getByRole("heading", { name: /^Needs Attention Now$/i }),
    ).toBeVisible();
    // Read-only foundation: no acknowledge / snooze mutation controls.
    await expect(page.getByTestId("exception-center").getByRole("button", { name: /acknowledge|snooze/i })).toHaveCount(0);

    await assertNoFatalUi(page);
    guards.assertClean();
  });

  test("C: Readonly Owner ops paths load shells without login redirect", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    const account = enterpriseAccount(OWNER_EMAIL);

    await browserLogin(page, account.email, account.password);

    for (const route of READONLY_SHELLS) {
      if (route.kitchenShell) {
        await assertKitchenShellRoute(page, route.path, route.title);
      } else {
        await assertAdminShellRoute(page, route.path, route.title);
      }
    }

    guards.assertClean();
  });

  test("D: Session persists across protected-route refresh", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    const account = enterpriseAccount(OWNER_EMAIL);

    await browserLogin(page, account.email, account.password);
    await assertAdminShellRoute(page, "/admin/orders", /Orders Management/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/orders/);
    await expect(page).not.toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: /Orders Management/i, level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();
    await assertNoFatalUi(page);
    guards.assertClean();
  });

  test("E: Sign out clears session and protects dashboard", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    const account = enterpriseAccount(OWNER_EMAIL);

    await browserLogin(page, account.email, account.password);
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible({ timeout: 60_000 });

    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 60_000 });
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });

    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    // Product gate: signed-out users see login or AdminShell "Staff access required"
    // (URL may settle on /admin/login or /admin/home/staff — not the authenticated shell).
    await expect(
      page
        .getByLabel(/^Email$/i)
        .or(page.getByRole("heading", { name: /Staff access required/i })),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Owner Command Center/i, level: 1 }),
    ).toHaveCount(0);
    guards.assertClean();
  });

  test("F: Authenticated dashboard axe spot-check (critical/serious)", async ({ page }) => {
    assertLocalWeb();
    const guards = attachGuards(page);
    const account = enterpriseAccount(OWNER_EMAIL);

    await browserLogin(page, account.email, account.password);
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Owner Command Center|Executive|Dashboard/i, level: 1 }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#admin-main")).toBeVisible();

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = axe.violations.filter((v) => v.impact === "critical");
    const serious = axe.violations.filter((v) => v.impact === "serious");
    expect(
      critical,
      JSON.stringify(critical.map((v) => ({ id: v.id, impact: v.impact }))),
    ).toEqual([]);
    expect(
      serious,
      JSON.stringify(serious.map((v) => ({ id: v.id, impact: v.impact }))),
    ).toEqual([]);

    guards.assertClean();
  });
});
