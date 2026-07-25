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
  writeEvidence,
} from "./helpers";

test.describe("D3 Journey G — walk-in waitlist lifecycle", () => {
  test("waitlist → notify → seat → pay → close; duplicate seat rejected", async ({ page, request }) => {
    const fixture = loadD3Fixture();
    const host = d3Account("host");
    const cashier = enterpriseAccount("cashier@telepizza.pk");
    const branchId = fixture.environment.royalOrchard.id as string;
    const tableB = fixture.tables["E2E-B"] as string;

    await browserLogin(page, host.email, host.password);
    await page.goto("/admin/waitlist");
    await expect(page.getByText(/waitlist/i).first()).toBeVisible({ timeout: 20_000 });
    const hostToken = await getBrowserAccessToken(page);
    await ensureTablesAvailable(request, hostToken, branchId, [tableB]);

    const add = await apiJson(request, "POST", "/api/v1/admin/waitlist", {
      token: hostToken,
      expectStatus: 201,
      body: {
        branchId,
        guestName: "Journey G Guest",
        guestPhone: "+923001110002",
        partySize: 2,
        quotedWaitMinutes: 15,
      },
    });
    const waitlistId = String((add.json.data as Record<string, unknown>).id);

    await apiJson(request, "POST", `/api/v1/admin/waitlist/${waitlistId}/notify`, {
      token: hostToken,
      expectStatus: 200,
    });
    await apiJson(request, "POST", `/api/v1/admin/waitlist/${waitlistId}/arrive`, {
      token: hostToken,
      expectStatus: 200,
    });

    const seat = await apiJson(request, "POST", `/api/v1/admin/waitlist/${waitlistId}/seat`, {
      token: hostToken,
      expectStatus: 201,
      body: { tableIds: [tableB] },
    });
    const sessionId = String((seat.json.data as Record<string, unknown>).sessionId ?? (seat.json.data as Record<string, unknown>).id);

    const dup = await apiJson(request, "POST", `/api/v1/admin/waitlist/${waitlistId}/seat`, {
      token: hostToken,
      body: { tableIds: [tableB] },
    });
    expect([409, 400]).toContain(dup.status);

    await page.evaluate(() => localStorage.clear());
    await browserLogin(page, cashier.email, cashier.password);
    const cashierToken = await getBrowserAccessToken(page);
    const order = await apiJson(request, "POST", "/api/v1/admin/pos/orders", {
      token: cashierToken,
      idempotencyKey: `g-order-${Date.now()}`,
      expectStatus: 201,
      body: {
        branchCode: "royal-orchard",
        orderType: "dine-in",
        contactName: "Journey G Guest",
        contactPhone: "+923001110002",
        diningSessionId: sessionId,
        items: [{ menuItemSlug: "tele-special", quantity: 1 }],
      },
    });

    const sessionDetail = await apiJson(request, "GET", `/api/v1/admin/table-service/sessions/${sessionId}`, {
      token: cashierToken,
      expectStatus: 200,
    });
    const bills = ((sessionDetail.json.data as Record<string, unknown>).bills ?? []) as Array<Record<string, unknown>>;
    const billId = bills[0] ? String(bills[0].id) : null;
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
          idempotencyKey: `g-pay-${Date.now()}`,
          expectStatus: 201,
          body: { branchId, billId, amount: remaining, method: "cash", cashTendered: remaining },
        });
        paymentId = String((pay.json.data as Record<string, unknown>).id);
      }
    }

    await page.evaluate(() => localStorage.clear());
    await browserLogin(page, host.email, host.password);
    const hostToken2 = await getBrowserAccessToken(page);
    await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
      token: hostToken2,
      expectStatus: 200,
      body: {},
    });
    await apiJson(request, "POST", `/api/v1/admin/floor/tables/${tableB}/status`, {
      token: hostToken2,
      expectStatus: 200,
      body: { toStatus: "available" },
    });

    writeEvidence("d3-journey-g.json", {
      journey: "G",
      result: "PASS",
      waitlistId,
      sessionId,
      orderId: (order.json.data as Record<string, unknown>).id,
      paymentId,
      duplicateSeatStatus: dup.status,
      table: "E2E-B",
    });
  });
});
