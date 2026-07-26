import { test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import {
  API,
  apiJson,
  browserLogin,
  d3Account,
  d4Account,
  enterpriseAccount,
  expect,
  getBrowserAccessToken,
  writeEvidence,
} from "./helpers";

type Row = { role: string; path: string; result: "PASS" | "FAIL"; note?: string; requestId?: string };

const FORGED_BRANCH = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const PK_MOBILE = /(?:\+?92|0)\s*3\d{2}[\s-]?\d{7}|Contact\s*Phone/i;

const matrix: Row[] = [];

async function withFreshPage<T>(browser: Browser, fn: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

async function visit(
  page: Page,
  role: string,
  emailLookup: () => { email: string; password: string },
  path: string,
  expectText?: RegExp,
  extraAssert?: (text: string) => void,
) {
  await page.goto("/admin/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => undefined);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Email$/i).waitFor({ state: "visible", timeout: 60_000 });

  const acct = emailLookup();
  await browserLogin(page, acct.email, acct.password);
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  const text = await page.locator("body").innerText();
  const lower = text.toLowerCase();
  const looksFake = /lorem ipsum|fake production|sample kpi 999999/i.test(text);
  const matched = expectText ? expectText.test(lower) : text.length > 40;
  expect(looksFake, `${role}: fake data`).toBeFalsy();
  expect(matched, `${role}: expected text missing on ${path}`).toBeTruthy();
  if (extraAssert) extraAssert(text);
  matrix.push({ role, path, result: "PASS", note: "rendered" });
}

test.describe.serial("D4 role matrix", () => {
  test.setTimeout(900_000);

  test("every required role home PASSes", async ({ browser, request }) => {
    // 1–2 Super Admin / Owner
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "super_admin",
        () => enterpriseAccount("admin@telepizza.pk"),
        "/admin/dashboard",
        /system health|today|orders|operations/,
      ),
    );
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "owner",
        () => enterpriseAccount("admin@telepizza.pk"),
        "/admin/dashboard",
        /orders|sales|operations|table/,
      ),
    );

    // 3 Configuration-authorized
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "configuration",
        () => d4Account("config"),
        "/admin/home/config",
        /configuration|settings|menu|floor|staff|readiness/,
      ),
    );

    // 4 Assigned-Branches Manager
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "assigned_branches_manager",
        () => d4Account("assigned_manager"),
        "/admin/branch",
        /opening readiness|branch|assigned|orders|readiness/,
      ),
    );

    // 5 Royal Orchard Branch Manager
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "branch_manager_ro",
        () => enterpriseAccount("branch.manager@telepizza.pk"),
        "/admin/branch",
        /opening readiness|branch|orders|readiness/,
      ),
    );

    // 6 Northern Bypass setup-only manager — readiness / coming soon, not live sales primary
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "northern_bypass_bm",
        () => d4Account("northern_bypass_bm"),
        "/admin/branch",
        /coming soon|opening readiness|readiness|complete opening/,
        (text) => {
          const comingSoon = /coming soon|complete opening readiness|opening readiness/i.test(text);
          expect(comingSoon, "NB BM should show readiness / coming-soon").toBeTruthy();
          expect(text.toLowerCase()).not.toMatch(/live gross sales|today's live sales primary/i);
        },
      ),
    );

    // 7 Cashier
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "cashier",
        () => enterpriseAccount("cashier@telepizza.pk"),
        "/admin/home/cashier",
        /cashier|pos/,
      ),
    );

    // 8 Host
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "host",
        () => {
          try {
            return d4Account("host");
          } catch {
            return d3Account("host");
          }
        },
        "/admin/home/host",
        /host|reservation|waitlist|floor/,
      ),
    );

    // 9 Waiter
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "waiter",
        () => {
          try {
            return d4Account("waiter");
          } catch {
            return d3Account("waiter");
          }
        },
        "/admin/home/waiter",
        /waiter|session|floor|pos/,
      ),
    );

    // 10 Kitchen — assert no guest phone PII pattern when possible
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "kitchen",
        () => enterpriseAccount("kitchen.manager@telepizza.pk"),
        "/admin/kitchen-dashboard",
        /kitchen|ticket|board/,
        (text) => {
          expect(text, "kitchen must not show Contact Phone / PK mobile").not.toMatch(PK_MOBILE);
        },
      ),
    );

    // 11 Delivery
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "delivery",
        () => enterpriseAccount("rider@telepizza.pk"),
        "/admin/home/delivery",
        /delivery|dispatch|rider/,
      ),
    );

    // 12 General Staff
    await withFreshPage(browser, (page) =>
      visit(
        page,
        "general_staff",
        () => enterpriseAccount("support@telepizza.pk"),
        "/admin/home/staff",
        /staff home|account|role|support|permitted/,
      ),
    );

    // Companion checks: forged branch denied + NB coming-soon via API
    let forgedStatus = 0;
    let forgedRequestId: string | undefined;
    await withFreshPage(browser, async (page) => {
      await page.goto("/admin/login");
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => undefined);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByLabel(/^Email$/i).waitFor({ state: "visible", timeout: 60_000 });

      const bm = enterpriseAccount("branch.manager@telepizza.pk");
      await browserLogin(page, bm.email, bm.password);
      const token = await getBrowserAccessToken(page);

      const forged = await apiJson(
        request,
        "GET",
        `/api/v1/admin/dashboard/opening-readiness?branchId=${FORGED_BRANCH}`,
        { token },
      );
      forgedStatus = forged.status;
      forgedRequestId = forged.requestId ?? undefined;
      expect(forged.status, "forged branch must be denied").toBe(403);
    });
    matrix.push({
      role: "forged_branch_denial",
      path: `/api/v1/admin/dashboard/opening-readiness?branchId=${FORGED_BRANCH}`,
      result: "PASS",
      note: `status=${forgedStatus}`,
      requestId: forgedRequestId,
    });

    const branchesRes = await request.get(`${API}/api/v1/branches`, { failOnStatusCode: false });
    expect(branchesRes.status()).toBe(200);
    const branchesJson = (await branchesRes.json()) as {
      data?: Array<{ code?: string; status?: string }>;
    };
    const nb = (branchesJson.data ?? []).find((b) => b.code === "northern-bypass");
    expect(nb?.status, "northern-bypass must remain coming-soon").toBe("coming-soon");
    matrix.push({
      role: "northern_bypass_status",
      path: "/api/v1/branches",
      result: "PASS",
      note: `northern-bypass=${nb?.status}`,
    });

    const failed = matrix.filter((r) => r.result !== "PASS");
    const overall = failed.length === 0 ? "PASS" : "FAIL";
    writeEvidence("d4-role-matrix.json", {
      result: overall,
      matrix,
      northernBypass: "coming-soon",
      forgedBranchDenied: forgedStatus === 403,
      kitchenPiiAbsent: true,
      commitAuthorization: "NOT AUTHORIZED",
    });

    expect(failed, `roles not PASS: ${failed.map((f) => f.role).join(", ")}`).toEqual([]);
    expect(overall).toBe("PASS");
  });
});
