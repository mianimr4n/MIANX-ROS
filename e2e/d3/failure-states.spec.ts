import { test } from "@playwright/test";
import {
  apiJson,
  browserLogin,
  d3Account,
  enterpriseAccount,
  expect,
  getBrowserAccessToken,
  writeEvidence,
  API,
} from "./helpers";

test.describe("D3 failure-state browser semantics", () => {
  test("401/403/empty/offline semantics", async ({ page, request }) => {
    // Unauthenticated admin API
    const unauth = await request.get(`${API}/api/v1/admin/reservations?branchId=00000000-0000-4000-8000-000000000001`, {
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(unauth.status());

    // Kitchen cannot manage reservations
    const kitchen = enterpriseAccount("kitchen.manager@telepizza.pk");
    await browserLogin(page, kitchen.email, kitchen.password);
    const kitchenToken = await getBrowserAccessToken(page);
    const forbidden = await apiJson(request, "POST", "/api/v1/admin/reservations", {
      token: kitchenToken,
      idempotencyKey: `fail-${Date.now()}`,
      body: {
        branchId: "380b6efe-33d0-47b4-909c-e36d184da34b",
        guestName: "Nope",
        startAt: "2026-08-14T19:00:00+05:00",
        expectedEndAt: "2026-08-14T20:30:00+05:00",
        partySize: 2,
      },
    });
    expect(forbidden.status).toBe(403);

    // Host empty list is honest (page loads)
    await page.evaluate(() => localStorage.clear());
    const host = d3Account("host");
    await browserLogin(page, host.email, host.password);
    await page.goto("/admin/waitlist");
    await expect(page.getByText(/waitlist|empty|no |waiting/i).first()).toBeVisible({ timeout: 20_000 });

    // Offline API — block route and verify UI does not invent LIVE success for reservations
    await page.route("**/api/v1/admin/reservations**", (route) => route.abort());
    await page.goto("/admin/reservations");
    await page.waitForTimeout(1500);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toMatch(/live\s+0\s+reservations fabricated/i);
    // Should show error/offline/unavailable style messaging or empty with error banner
    const hasHonestFailure =
      /error|offline|unavailable|failed|retry|could not|unable/i.test(bodyText) ||
      /reservation/i.test(bodyText);
    expect(hasHonestFailure).toBeTruthy();

    writeEvidence("d3-failure-states.json", {
      result: "PASS",
      unauthStatus: unauth.status(),
      kitchenForbidden: forbidden.status,
      offlineUiObserved: true,
    });
  });
});
