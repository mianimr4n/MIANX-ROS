/**

 * D4 — Role dashboards static contract (node:test).

 * Complements Vitest backend suites; not string-only evidence for all gates.

 */

import assert from "node:assert/strict";

import { readFileSync, existsSync } from "node:fs";

import { describe, it } from "node:test";

import { fileURLToPath } from "node:url";

import { dirname, join } from "node:path";



const root = join(dirname(fileURLToPath(import.meta.url)), "../..");



function read(rel) {

  return readFileSync(join(root, rel), "utf8");

}



function exists(rel) {

  return existsSync(join(root, rel));

}



describe("D4 role dashboards (static)", () => {

  it("registers role home routes", () => {

    const app = read("apps/website/client/src/App.tsx");

    assert.match(app, /\/admin\/home\/cashier/);

    assert.match(app, /\/admin\/home\/host/);

    assert.match(app, /\/admin\/home\/waiter/);

    assert.match(app, /\/admin\/home\/delivery/);

    assert.match(app, /\/admin\/home\/staff/);

    assert.match(app, /\/admin\/home\/config/);

  });



  it("resolveStaffHome maps repository roles", () => {

    const access = read("apps/website/client/src/lib/admin-access.ts");

    assert.match(access, /export function resolveStaffHome/);

    assert.match(access, /export function canAccessConfigurationHome/);

    assert.match(access, /isConfigurationHomeCandidate/);

    assert.match(access, /\/admin\/home\/cashier/);

    assert.match(access, /\/admin\/home\/host/);

    assert.match(access, /\/admin\/home\/waiter/);

    assert.match(access, /\/admin\/home\/delivery/);

    assert.match(access, /\/admin\/home\/config/);

    assert.match(access, /\/admin\/kitchen-dashboard/);

    assert.match(access, /\/admin\/branch/);

    assert.match(access, /\/admin\/dashboard/);

  });



  it("config home uses canAccessConfigurationHome", () => {

    const config = read("apps/website/client/src/pages/admin/AdminConfigHome.tsx");

    assert.match(config, /canAccessConfigurationHome/);

    assert.match(config, /const allowed = canAccessConfigurationHome\(principal\)/);

  });



  it("shared dashboard primitives exist", () => {

    assert.ok(exists("apps/website/client/src/components/admin/dashboard/DashboardActionCard.tsx"));

    assert.ok(exists("apps/website/client/src/components/admin/dashboard/OpeningReadinessSummary.tsx"));

    assert.ok(exists("apps/website/client/src/components/admin/dashboard/RoleHomeShell.tsx"));

    const readiness = read("apps/website/client/src/components/admin/dashboard/OpeningReadinessSummary.tsx");

    assert.match(readiness, /READY_WITH_LIMITATIONS|BLOCKED|NOT_VERIFIED/);

    assert.match(readiness, /Complete opening readiness/i);

    assert.doesNotMatch(readiness, /todayGrossSales|fake sales/i);

  });



  it("API clients cover D4 dashboard contracts", () => {

    const api = read("apps/website/client/src/lib/admin-api.ts");

    assert.match(api, /fetchTableServiceDashboard/);

    assert.match(api, /fetchSystemHealth/);

    assert.match(api, /fetchOpeningReadiness/);

    assert.match(api, /\/admin\/dashboard\/table-service/);

    assert.match(api, /\/admin\/dashboard\/system-health/);

    assert.match(api, /includeOccupancyComparison/);

    assert.match(api, /occupancyByBranch/);

  });



  it("ops command center uses real dashboard APIs", () => {

    const ops = read("apps/website/client/src/pages/ops/OpsDashboard.tsx");

    assert.match(ops, /fetchAdminOperationsDashboard/);

    assert.match(ops, /fetchTableServiceDashboard/);

    assert.match(ops, /OperationalStatusBanner/);

    assert.match(ops, /\/ops\/orders/);

    assert.match(ops, /\/ops\/kitchen/);

    assert.match(ops, /\/ops\/dispatch/);

  });



  it("does not invent standalone /pos or /kds routes", () => {

    const app = read("apps/website/client/src/App.tsx");

    assert.doesNotMatch(app, /path="\/pos"/);

    assert.doesNotMatch(app, /path="\/kds"/);

  });



  it("waiter home is assigned-only and omits guestName fallback", () => {

    const waiter = read("apps/website/client/src/pages/admin/AdminWaiterHome.tsx");

    assert.match(waiter, /Your assigned tables/);

    assert.match(waiter, /No tables are assigned to you right now/);

    assert.match(waiter, /primaryServerUserId === userId/);

    assert.doesNotMatch(waiter, /showing branch active sessions/);

    assert.doesNotMatch(waiter, /guestName/);

  });



  it("kitchen detail UI strips guest phone and private notes", () => {

    const details = read("apps/website/client/src/components/admin/kitchen/KitchenDetailsPanel.tsx");

    assert.doesNotMatch(details, /contactPhone/);

    assert.doesNotMatch(details, /detail\.notes/);

    const card = read("apps/website/client/src/components/admin/kitchen/KitchenCard.tsx");

    assert.doesNotMatch(card, /enrichment\?\.notes/);

  });



  it("status panels refuse failed-zero counts", () => {

    const panels = read("apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx");

    assert.match(panels, /failed/);

    assert.match(panels, /Counts are not shown as zero/);

    const dash = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");

    assert.match(dash, /failed=\{opsFailed\}/);

    const branch = read("apps/website/client/src/pages/admin/AdminBranchManager.tsx");

    assert.match(branch, /failed=\{opsFailed\}/);

  });



  it("branch aggregate is labeled Assigned Branches for non-SA", () => {

    const shell = read("apps/website/client/src/pages/admin/AdminShell.tsx");

    assert.match(shell, /Assigned Branches/);

    const ctx = read("apps/website/client/src/contexts/AdminBranchContext.tsx");

    assert.match(ctx, /isSuperAdmin \? "All Branches" : "Assigned Branches"/);

    const bm = read("apps/website/client/src/pages/admin/AdminBranchManager.tsx");

    assert.match(bm, /isAggregateScope/);

    assert.match(bm, /Assigned Branches/);

  });



  it("config home gates system-health to super-admin", () => {

    const config = read("apps/website/client/src/pages/admin/AdminConfigHome.tsx");

    assert.match(config, /isSuperAdmin && isApiConfigured/);

    assert.match(config, /isSuperAdmin && healthOp\.data/);

  });



  it("owner dashboard requests occupancy comparison honestly", () => {

    const dash = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");

    assert.match(dash, /includeOccupancyComparison/);

    assert.match(dash, /occupancyByBranch/);

    assert.match(dash, /averageWaitMinutes == null/);

    assert.match(dash, /averageTableTurnMinutes == null/);

  });

});
