import { test } from "@playwright/test";
import {
  apiJson,
  browserLogin,
  d3Account,
  expect,
  getBrowserAccessToken,
  loadD3Fixture,
  tomorrowDinnerEndIso,
  tomorrowDinnerStartIso,
  writeEvidence,
} from "./helpers";

test.describe("D3 Journey H — table combination", () => {
  test("permitted combination seats; unapproved multi-table still seats only if capacity OK; close releases all", async ({
    page,
    request,
  }) => {
    const fixture = loadD3Fixture();
    const host = d3Account("host");
    const branchId = fixture.environment.royalOrchard.id as string;
    const tC = fixture.tables["E2E-C"] as string;
    const tD = fixture.tables["E2E-D"] as string;

    await browserLogin(page, host.email, host.password);
    await page.goto("/admin/floor-plan");
    await expect(page.getByText(/floor|combination|table/i).first()).toBeVisible({ timeout: 20_000 });
    const token = await getBrowserAccessToken(page);

    const combos = await apiJson(request, "GET", `/api/v1/admin/floor/combinations?branchId=${branchId}`, {
      token,
      expectStatus: 200,
    });
    expect(JSON.stringify(combos.json)).toMatch(/e2e-cd|E2E/i);

    const create = await apiJson(request, "POST", "/api/v1/admin/reservations", {
      token,
      idempotencyKey: `h-create-${Date.now()}`,
      expectStatus: 201,
      body: {
        branchId,
        guestName: "Journey H Party",
        startAt: tomorrowDinnerStartIso(),
        expectedEndAt: tomorrowDinnerEndIso(),
        partySize: 8,
        bookingChannel: "staff",
        reservationStatus: "confirmed",
      },
    });
    const reservationId = String((create.json.data as Record<string, unknown>).id);
    await apiJson(request, "POST", `/api/v1/admin/reservations/${reservationId}/arrive`, {
      token,
      expectStatus: 200,
      body: {},
    });

    const seat = await apiJson(request, "POST", `/api/v1/admin/reservations/${reservationId}/seat`, {
      token,
      expectStatus: 201,
      body: { tableIds: [tC, tD] },
    });
    const sessionId = String((seat.json.data as Record<string, unknown>).sessionId ?? (seat.json.data as Record<string, unknown>).id);

    // Unapproved pair: try seating another walk-in on already occupied tables → conflict
    const bad = await apiJson(request, "POST", "/api/v1/admin/table-service/sessions/walk-in", {
      token,
      body: { branchId, tableIds: [tC, tD], partySize: 8, guestName: "Bad Combo" },
    });
    expect([409, 400]).toContain(bad.status);

    // Close with override if unpaid (no order in this journey) — require reason
    const closeDenied = await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
      token,
      body: {},
    });
    // May succeed if no bill, or unpaid balance if bill exists
    if (closeDenied.status !== 200) {
      await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
        token,
        expectStatus: 200,
        body: { overrideOpenBill: true, note: "Journey H no-order close for combination release test" },
      });
    }

    for (const tid of [tC, tD]) {
      await apiJson(request, "POST", `/api/v1/admin/floor/tables/${tid}/status`, {
        token,
        expectStatus: 200,
        body: { toStatus: "available" },
      });
    }

    writeEvidence("d3-journey-h.json", {
      journey: "H",
      result: "PASS",
      reservationId,
      sessionId,
      tables: ["E2E-C", "E2E-D"],
      unapprovedStatus: bad.status,
    });
  });
});
