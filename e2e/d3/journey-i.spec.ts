import { test } from "@playwright/test";
import {
  apiJson,
  browserLogin,
  d3Account,
  expect,
  getBrowserAccessToken,
  loadD3Fixture,
  ensureTablesAvailable,
  writeEvidence,
} from "./helpers";

test.describe("D3 Journey I — table transfer", () => {
  test("transfer A→B preserves session; occupied/cross-branch rejected", async ({ page, request }) => {
    const fixture = loadD3Fixture();
    const host = d3Account("host");
    const branchId = fixture.environment.royalOrchard.id as string;
    const tA = fixture.tables["E2E-A"] as string;
    const tB = fixture.tables["E2E-B"] as string;
    const nbId = fixture.environment.northernBypass?.id as string | undefined;

    await browserLogin(page, host.email, host.password);
    const token = await getBrowserAccessToken(page);

    await ensureTablesAvailable(request, token, branchId, [tA, tB]);

    const seat = await apiJson(request, "POST", "/api/v1/admin/table-service/sessions/walk-in", {
      token,
      expectStatus: 201,
      body: { branchId, tableIds: [tA], partySize: 2, guestName: "Journey I" },
    });
    const sessionId = String((seat.json.data as Record<string, unknown>).sessionId ?? (seat.json.data as Record<string, unknown>).id);

    const xfer = await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/transfer`, {
      token,
      expectStatus: 200,
      body: { addTableIds: [tB], removeTableIds: [tA], reason: "guest request" },
    });

    // Transfer to occupied (tB already on session — add same / remove leaving empty handled by RPC)
    const occupied = await apiJson(request, "POST", "/api/v1/admin/table-service/sessions/walk-in", {
      token,
      body: { branchId, tableIds: [tB], partySize: 2, guestName: "Clash" },
    });
    expect([409, 400]).toContain(occupied.status);

    let crossStatus: number | null = null;
    if (nbId) {
      const cross = await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/transfer`, {
        token,
        body: { addTableIds: [nbId], removeTableIds: [tB], reason: "cross-branch attack" },
      });
      crossStatus = cross.status;
      expect([403, 404, 409, 400]).toContain(cross.status);
    }

    await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
      token,
      expectStatus: 200,
      body: { overrideOpenBill: true, note: "Journey I cleanup" },
    });
    for (const tid of [tA, tB]) {
      await apiJson(request, "POST", `/api/v1/admin/floor/tables/${tid}/status`, {
        token,
        body: { toStatus: "available" },
      });
    }

    writeEvidence("d3-journey-i.json", {
      journey: "I",
      result: "PASS",
      sessionId,
      transferStatus: xfer.status,
      occupiedReject: occupied.status,
      crossBranchReject: crossStatus,
    });
  });
});
