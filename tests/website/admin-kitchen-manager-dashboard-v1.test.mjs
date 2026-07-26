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
    assert.match(shell, /Kitchen Display System/);
    assert.doesNotMatch(shell, /AI Command Center/);
    assert.doesNotMatch(shell, /Finance/);
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
