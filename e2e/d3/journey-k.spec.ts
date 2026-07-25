import { test } from "@playwright/test";
import {
  apiJson,
  browserLogin,
  d3Account,
  expect,
  getBrowserAccessToken,
  loadD3Fixture,
  writeEvidence,
} from "./helpers";

test.describe("D3 Journey K — cross-branch denial", () => {
  test("royal-orchard host cannot operate northern-bypass resources", async ({ page, request }) => {
    const fixture = loadD3Fixture();
    const host = d3Account("host");
    const nbId = fixture.environment.northernBypass?.id as string | undefined;
    test.skip(!nbId, "northern-bypass branch missing locally");

    await browserLogin(page, host.email, host.password);
    const token = await getBrowserAccessToken(page);

    const floorRead = await apiJson(request, "GET", `/api/v1/admin/floor/configuration?branchId=${nbId}`, {
      token,
    });
    const resList = await apiJson(request, "GET", `/api/v1/admin/reservations?branchId=${nbId}`, {
      token,
    });
    const waitlist = await apiJson(request, "POST", "/api/v1/admin/waitlist", {
      token,
      body: { branchId: nbId, guestName: "Attack", partySize: 2 },
    });
    const walkIn = await apiJson(request, "POST", "/api/v1/admin/table-service/sessions/walk-in", {
      token,
      body: {
        branchId: nbId,
        tableIds: [fixture.tables["E2E-A"]],
        partySize: 2,
        guestName: "Attack",
      },
    });
    const floorState = await apiJson(request, "GET", `/api/v1/admin/table-service/floor-state?branchId=${nbId}`, {
      token,
    });

    for (const r of [floorRead, resList, waitlist, walkIn, floorState]) {
      expect([403, 409, 404]).toContain(r.status);
    }

    // UI: host should not gain NB access merely by URL — page may load shell but API fails
    await page.goto("/admin/reservations");
    await expect(page.getByText(/reservation/i).first()).toBeVisible();

    writeEvidence("d3-journey-k.json", {
      journey: "K",
      result: "PASS",
      statuses: {
        floorRead: floorRead.status,
        resList: resList.status,
        waitlist: waitlist.status,
        walkIn: walkIn.status,
        floorState: floorState.status,
      },
      note: "Server-side denial verified; northern-bypass remains coming-soon in production truth.",
    });
  });
});
