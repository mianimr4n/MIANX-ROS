import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Kitchen Manager Dashboard V1 (static)", () => {
  it("registers dedicated KDS route and access helpers", () => {
    const app = read("apps/website/client/src/App.tsx");
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(app, /\/admin\/kitchen-dashboard/);
    assert.match(app, /AdminKitchenDashboard/);
    assert.match(access, /canAccessKitchenManagerDashboard/);
    assert.match(access, /isKitchenOnly/);
    assert.match(access, /kitchen-home/);
  });

  it("redirects kitchen-only staff away from Owner dashboard", () => {
    const login = read("apps/website/client/src/pages/admin/AdminLogin.tsx");
    const index = read("apps/website/client/src/pages/admin/AdminIndexRedirect.tsx");
    const dash = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(login, /resolveStaffHome/);
    assert.match(index, /resolveStaffHome/);
    assert.match(access, /isKitchenOnly/);
    assert.match(access, /\/admin\/kitchen-dashboard/);
    assert.match(dash, /resolveStaffHome/);
  });

  it("uses focused kitchen shell and real ticket APIs", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx");
    const shell = read("apps/website/client/src/components/admin/kitchen/KitchenManagerShell.tsx");
    assert.match(page, /KitchenManagerShell/);
    assert.match(page, /listKitchenTickets/);
    assert.match(page, /patchKitchenTicketStatus/);
    assert.match(page, /UNAVAILABLE|unavailable/i);
    // API failure must not render LIVE queue zeros — KPIs require a successful ticket payload.
    assert.match(page, /hasTicketPayload/);
    assert.match(page, /ticketKpiState/);
    assert.match(page, /hasTicketPayload \? String\(summary\.queued\) : null/);
    assert.match(page, /OperationsWorkspaceHeader/);
    assert.match(shell, /Kitchen Display System/);
    assert.doesNotMatch(shell, /AI Command Center/);
    assert.doesNotMatch(shell, /Finance/);
  });

  it("EMPTY successful queue keeps EMPTY state and shows resolved zero KPIs", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx");
    const kpi = read("apps/website/client/src/components/admin/AdminKpiCard.tsx");
    // Collection emptiness stays honest at the ops layer.
    assert.match(page, /isEmpty:\s*\(data\)\s*=>\s*data\.length === 0/);
    assert.match(page, /ticketQueueEmpty/);
    assert.match(page, /ticketsOp\.state === "EMPTY"/);
    assert.match(page, /showResolvedZero/);
    // EMPTY KPIs must not be labeled LIVE.
    assert.match(page, /ticketQueueEmpty\s*\?\s*\("EMPTY" as const\)/);
    assert.doesNotMatch(
      page,
      /ticketKpiSource = hasTicketPayload \? \("LIVE" as const\) : \("UNAVAILABLE" as const\)/,
    );
    // Resolved zero copy — not generic "No data yet" on count cards.
    assert.match(page, /No active tickets/);
    assert.match(page, /Nothing preparing/);
    assert.match(page, /Nothing ready/);
    assert.match(page, /No delayed tickets/);
    assert.match(kpi, /showResolvedZero/);
    assert.match(kpi, /state === "empty" && showResolvedZero/);
    assert.match(kpi, /EMPTY: null/);
  });

  it("API failure still withholds invented zero KPIs", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx");
    assert.match(page, /\(ticketsOp\.state === "ERROR" \|\| ticketsOp\.state === "OFFLINE"\) && !hasTicketPayload/);
    assert.match(page, /\("error" as const\)/);
    assert.match(page, /hasTicketPayload \? String\(summary\.queued\) : null/);
    assert.doesNotMatch(
      page,
      /AdminKpiCard title="New \(queued\)" value=\{String\(summary\.queued\)\} source="LIVE"/,
    );
  });

  it("loading path still uses skeletons before the first ticket payload", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx");
    assert.match(page, /loading && !hasTicketPayload/);
    assert.match(page, /AdminKpiSkeleton/);
    assert.match(page, /\("loading" as const\)/);
  });

  it("does not invent quality_check status", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx");
    const transitions = read("backend/api/src/services/kitchen/transitions.ts");
    assert.doesNotMatch(page, /quality_check|quality-check|Quality Check.*toStatus/);
    assert.doesNotMatch(transitions, /quality/);
    assert.match(transitions, /queued/);
    assert.match(transitions, /accepted/);
    assert.match(transitions, /preparing/);
    assert.match(transitions, /ready/);
  });

  it("keeps kitchen-only nav to kitchen home", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /if \(kitchenOnly\)/);
    assert.match(access, /\["kitchen-home"\]/);
  });
});
