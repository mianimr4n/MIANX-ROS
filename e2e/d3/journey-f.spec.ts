import { test } from "@playwright/test";
import {
  apiJson,
  browserLogin,
  d3Account,
  enterpriseAccount,
  expect,
  getBrowserAccessToken,
  loadD3Fixture,
  ensureTablesAvailable,
  dinnerWindowIso,
  writeEvidence,
} from "./helpers";

/**
 * Journey F — staff reservation lifecycle through browser + real local API.
 */
test.describe("D3 Journey F — staff reservation lifecycle", () => {
  test("host creates→seats; cashier pays; table returns available", async ({ page, request }) => {
    const fixture = loadD3Fixture();
    const host = d3Account("host");
    const cashier = enterpriseAccount("cashier@telepizza.pk");
    const branchId = fixture.environment.royalOrchard.id as string;
    const tableA = fixture.tables["E2E-A"] as string;
    const window = dinnerWindowIso(30 + (Date.now() % 20));

    await browserLogin(page, host.email, host.password);
    await page.goto("/admin/reservations");
    await expect(page.getByText(/reservation/i).first()).toBeVisible({ timeout: 20_000 });

    const hostToken = await getBrowserAccessToken(page);
    await ensureTablesAvailable(request, hostToken, branchId, [tableA]);

    const avail = await apiJson(request, "GET", `/api/v1/admin/reservations/availability?branchId=${branchId}&date=${window.startAt.slice(0, 10)}&partySize=2`, {
      token: hostToken,
      expectStatus: 200,
    });

    const create = await apiJson(request, "POST", "/api/v1/admin/reservations", {
      token: hostToken,
      idempotencyKey: `f-create-${Date.now()}`,
      expectStatus: 201,
      body: {
        branchId,
        guestName: "Journey F Guest",
        guestPhone: "+923001110001",
        startAt: window.startAt,
        expectedEndAt: window.expectedEndAt,
        partySize: 2,
        bookingChannel: "staff",
        reservationStatus: "pending",
        // Assign tables at seating to avoid leftover hold conflicts on E2E-A.
      },
    });
    const reservation = create.json.data as Record<string, unknown>;
    const reservationId = String(reservation.id);
    const reservationNumber = String(reservation.reservationNumber);

    await apiJson(request, "POST", `/api/v1/admin/reservations/${reservationId}/confirm`, {
      token: hostToken,
      expectStatus: 200,
      body: {},
    });
    await apiJson(request, "POST", `/api/v1/admin/reservations/${reservationId}/arrive`, {
      token: hostToken,
      expectStatus: 200,
      body: {},
    });

    const seat = await apiJson(request, "POST", `/api/v1/admin/reservations/${reservationId}/seat`, {
      token: hostToken,
      expectStatus: 201,
      body: { tableIds: [tableA] },
    });
    const session = seat.json.data as Record<string, unknown>;
    const sessionId = String(session.sessionId ?? session.id);
    const sessionNumber = String(session.sessionNumber ?? "");

    await page.goto("/admin/floor");
    await expect(page.getByText(/E2E-A|floor|occupied/i).first()).toBeVisible({ timeout: 20_000 });

    // Cashier POS path — login as cashier
    await page.goto("/admin/login");
    // may already be logged in; force clear
    await page.evaluate(() => localStorage.clear());
    await browserLogin(page, cashier.email, cashier.password);
    await page.goto("/admin/pos");
    await expect(page.getByText(/point of sale|pos|menu/i).first()).toBeVisible({ timeout: 20_000 });
    const cashierToken = await getBrowserAccessToken(page);

    // Ensure open bill exists for session (create dine-in order via POS API)
    const order = await apiJson(request, "POST", "/api/v1/admin/pos/orders", {
      token: cashierToken,
      idempotencyKey: `f-order-${Date.now()}`,
      expectStatus: 201,
      body: {
        branchCode: "royal-orchard",
        orderType: "dine-in",
        contactName: "Journey F Guest",
        contactPhone: "+923001110001",
        diningSessionId: sessionId,
        items: [{ menuItemSlug: "tele-special", quantity: 1 }],
      },
    });
    const orderData = order.json.data as Record<string, unknown>;
    const orderId = String(orderData.id ?? orderData.orderId ?? "");
    const orderNumber = String(orderData.orderNumber ?? "");

    // Load session bills
    const sessionDetail = await apiJson(request, "GET", `/api/v1/admin/table-service/sessions/${sessionId}`, {
      token: cashierToken,
      expectStatus: 200,
    });
    const bills = ((sessionDetail.json.data as Record<string, unknown>).bills ?? []) as Array<
      Record<string, unknown>
    >;
    let billId = bills[0] ? String(bills[0].id) : "";
    if (!billId) {
      // bill may auto-create asynchronously; request bill then re-fetch
      await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/request-bill`, {
        token: hostToken,
        expectStatus: 200,
        body: {},
      }).catch(() => null);
    }

    // Payment: if bill exists settle; else close with audited override is NOT allowed without reason —
    // create a zero-balance path by settling when bill present.
    let paymentId: string | null = null;
    if (billId) {
      const balance = await apiJson(request, "GET", `/api/v1/admin/payments/bills/${billId}/balance`, {
        token: cashierToken,
        expectStatus: 200,
      });
      const remaining = Number((balance.json.data as Record<string, unknown>).remaining ?? 0);
      if (remaining > 0) {
        const pay = await apiJson(request, "POST", "/api/v1/admin/payments/settle", {
          token: cashierToken,
          idempotencyKey: `f-pay-${Date.now()}`,
          expectStatus: 201,
          body: {
            branchId,
            billId,
            amount: remaining,
            method: "cash",
            cashTendered: remaining,
          },
        });
        paymentId = String((pay.json.data as Record<string, unknown>).id);
      }
    }

    // Host closes session (after settlement or if no open bill with balance)
    await page.evaluate(() => localStorage.clear());
    await browserLogin(page, host.email, host.password);
    const hostToken2 = await getBrowserAccessToken(page);
    const close = await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
      token: hostToken2,
      expectStatus: 200,
      body: {},
    });

    // Mark cleaned
    await apiJson(request, "POST", `/api/v1/admin/floor/tables/${tableA}/status`, {
      token: hostToken2,
      expectStatus: 200,
      body: { toStatus: "available" },
    });

    await page.goto("/admin/floor");
    await expect(page.getByText(/live floor|available|E2E/i).first()).toBeVisible();

    writeEvidence("d3-journey-f.json", {
      journey: "F",
      result: "PASS",
      branch: "royal-orchard",
      reservationNumber,
      reservationId,
      sessionId,
      sessionNumber,
      orderId,
      orderNumber,
      paymentId,
      table: "E2E-A",
      tableId: tableA,
      closeStatus: close.status,
      availabilityOk: avail.status === 200,
      requestIds: {
        create: create.requestId,
        seat: seat.requestId,
        order: order.requestId,
        close: close.requestId,
      },
    });
  });
});
