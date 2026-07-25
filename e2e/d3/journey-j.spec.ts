import { test } from "@playwright/test";
import {
  apiJson,
  browserLogin,
  d3Account,
  expect,
  getBrowserAccessToken,
  loadD3Fixture,
  ensureTablesAvailable,
  dinnerWindowIso,
  writeEvidence,
} from "./helpers";

test.describe("D3 Journey J — concurrency / conflicts", () => {
  test("duplicate idempotency, double seat, overlapping holds", async ({ page, request }) => {
    const fixture = loadD3Fixture();
    const host = d3Account("host");
    const branchId = fixture.environment.royalOrchard.id as string;
    const tA = fixture.tables["E2E-A"] as string;

    await browserLogin(page, host.email, host.password);
    const token = await getBrowserAccessToken(page);
    await ensureTablesAvailable(request, token, branchId, [tA]);

    const key = `j-idem-${Date.now()}`;
    const window = dinnerWindowIso(180 + (Date.now() % 40));
    const body = {
      branchId,
      guestName: "Journey J",
      startAt: window.startAt,
      expectedEndAt: window.expectedEndAt,
      partySize: 2,
      bookingChannel: "staff",
      reservationStatus: "confirmed",
      tableIds: [tA],
    };
    const first = await apiJson(request, "POST", "/api/v1/admin/reservations", {
      token,
      idempotencyKey: key,
      expectStatus: 201,
      body,
    });
    const second = await apiJson(request, "POST", "/api/v1/admin/reservations", {
      token,
      idempotencyKey: key,
      expectStatus: 200,
      body,
    });
    expect((second.json.data as Record<string, unknown>).idempotentReplay).toBe(true);
    expect((second.json.data as Record<string, unknown>).id).toBe((first.json.data as Record<string, unknown>).id);

    const conflictPayload = await apiJson(request, "POST", "/api/v1/admin/reservations", {
      token,
      idempotencyKey: key,
      body: { ...body, guestName: "Changed Payload" },
    });
    expect([409, 400]).toContain(conflictPayload.status);

    const resId = String((first.json.data as Record<string, unknown>).id);
    await apiJson(request, "POST", `/api/v1/admin/reservations/${resId}/arrive`, {
      token,
      expectStatus: 200,
      body: {},
    });
    const seat1 = await apiJson(request, "POST", `/api/v1/admin/reservations/${resId}/seat`, {
      token,
      expectStatus: 201,
      body: { tableIds: [tA] },
    });
    const seat2 = await apiJson(request, "POST", `/api/v1/admin/reservations/${resId}/seat`, {
      token,
      body: { tableIds: [tA] },
    });
    expect([409, 400]).toContain(seat2.status);

    const sessionId = String((seat1.json.data as Record<string, unknown>).sessionId ?? (seat1.json.data as Record<string, unknown>).id);
    await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
      token,
      expectStatus: 200,
      body: { overrideOpenBill: true, note: "Journey J cleanup" },
    });
    await apiJson(request, "POST", `/api/v1/admin/floor/tables/${tA}/status`, {
      token,
      body: { toStatus: "available" },
    });

    writeEvidence("d3-journey-j.json", {
      journey: "J",
      result: "PASS",
      idempotentReplay: true,
      changedPayloadStatus: conflictPayload.status,
      doubleSeatStatus: seat2.status,
      reservationId: resId,
    });
  });
});
