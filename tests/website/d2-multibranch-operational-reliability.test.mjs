/**
 * D2 — Multi-branch opening readiness & operational reliability (static contract).
 *
 * Verifies the shared status model, reliability client behavior, branch-scope
 * propagation, role dashboards, and honest state semantics from source.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("D2 — canonical operational status model", () => {
  it("defines all nine canonical states in one shared module", () => {
    const src = read("apps/website/client/src/lib/op-status.ts");
    for (const state of [
      '"LOADING"',
      '"LIVE"',
      '"DERIVED"',
      '"EMPTY"',
      '"STALE"',
      '"OFFLINE"',
      '"ERROR"',
      '"FOUNDATION"',
      '"UNAVAILABLE"',
    ]) {
      assert.match(src, new RegExp(state.replace(/"/g, '"')), `missing state ${state}`);
    }
  });

  it("keeps failures from becoming zero and empty distinct from error", () => {
    const src = read("apps/website/client/src/lib/op-status.ts");
    assert.match(src, /A failed request must never present prior\/default values as current LIVE data/);
    assert.match(src, /EMPTY, not ERROR/);
    // STALE requires prior success and keeps lastSuccessAt.
    assert.match(src, /lastSuccessAt/);
    assert.match(src, /error != null && data != null\) return "STALE"/);
    assert.match(src, /error != null && data == null/);
  });

  it("distinguishes unauthorized, forbidden, network, timeout, and server failures", () => {
    const src = read("apps/website/client/src/lib/op-status.ts");
    assert.match(src, /statusCode === 401\) return "auth"/);
    assert.match(src, /statusCode === 403\) return "forbidden"/);
    assert.match(src, /statusCode === 0\) return "network"/);
    assert.match(src, /"TIMEOUT"\) return "timeout"/);
    assert.match(src, /statusCode >= 500\) return "server"/);
  });

  it("bounds automatic retries to transient read failures only", () => {
    const src = read("apps/website/client/src/lib/op-status.ts");
    assert.match(src, /isRetryableRead/);
    assert.match(src, /"network" \|\| category === "timeout" \|\| category === "server"/);
    assert.match(src, /readRetries/);
  });

  it("cancels obsolete requests on dependency change and unmount", () => {
    const src = read("apps/website/client/src/lib/op-status.ts");
    assert.match(src, /AbortController/);
    assert.match(src, /controller\.abort\(\)/);
  });
});

describe("D2 — shared API reliability client", () => {
  it("supports bounded timeout, correlation id, and network error normalization", () => {
    const api = read("apps/website/client/src/lib/api.ts");
    assert.match(api, /timeoutMs\?: number/);
    assert.match(api, /X-Client-Request-Id/);
    assert.match(api, /"TIMEOUT"/);
    assert.match(api, /"NETWORK"/);
    assert.match(api, /bearerHeaders/);
  });

  it("admin reads carry signal + timeout; writes are never auto-retried", () => {
    const adminApi = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(adminApi, /ADMIN_READ_TIMEOUT_MS/);
    assert.match(adminApi, /ADMIN_WRITE_TIMEOUT_MS/);
    assert.match(adminApi, /signal: opts\?\.signal/);
    assert.match(adminApi, /Writes are never auto-retried/);
  });

  it("ops client propagates branch scope on all operational reads", () => {
    const opsApi = read("apps/website/client/src/lib/ops-api.ts");
    for (const fn of ["listOpsOrders", "listKitchenTickets", "listDeliveryAssignments", "listRiderRoster"]) {
      assert.match(opsApi, new RegExp(fn), `missing ${fn}`);
    }
    // Branch scope is available on every list function including ops orders.
    assert.match(opsApi, /branchId\?: string \| null/);
  });
});

describe("D2 — branch scope on opening-critical surfaces", () => {
  const surfaces = [
    "apps/website/client/src/pages/admin/AdminDashboard.tsx",
    "apps/website/client/src/pages/admin/AdminOrders.tsx",
    "apps/website/client/src/pages/admin/AdminKitchen.tsx",
    "apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx",
    "apps/website/client/src/pages/admin/AdminDelivery.tsx",
    "apps/website/client/src/pages/admin/AdminBranchManager.tsx",
    "apps/website/client/src/pages/admin/AdminReports.tsx",
  ];

  for (const rel of surfaces) {
    it(`${rel.split("/").pop()} uses the shared reliability hook with branch scope`, () => {
      const src = read(rel);
      assert.match(src, /useOperationalData/);
      assert.match(src, /useAdminBranch/);
      assert.match(src, /branchId/);
    });
  }

  it("wired surfaces expose retry with visible stale/error banner", () => {
    for (const rel of surfaces) {
      const src = read(rel);
      assert.match(src, /OperationalStatusBanner/, `${rel} missing status banner`);
      assert.match(src, /\.retry|retry\}/, `${rel} missing retry action`);
    }
  });
});

describe("D2 — dashboards never render failure as zero", () => {
  it("Branch Manager KPIs pass null values when the payload is missing", () => {
    const src = read("apps/website/client/src/pages/admin/AdminBranchManager.tsx");
    assert.match(src, /value=\{data \? String\(data\.kpis\.todayOrders\) : null\}/);
    assert.doesNotMatch(src, /String\(data\?\.kpis\.todayOrders \?\? 0\)/);
    assert.match(src, /state=\{kpiCardState\}/);
  });

  it("Reports queue counts render only from a successful payload", () => {
    const src = read("apps/website/client/src/pages/admin/AdminReports.tsx");
    assert.doesNotMatch(src, /kitchenWaiting=\{data\?\.kpis\.kitchenWaiting \?\? 0\}/);
    assert.match(src, /\{data \? \(/);
  });

  it("KPI card supports a distinct stale state that keeps the last value visible", () => {
    const src = read("apps/website/client/src/components/admin/AdminKpiCard.tsx");
    assert.match(src, /\| "stale"/);
    assert.match(src, /stale: "Earlier data"/);
  });
});

describe("D2 — role dashboards and staff homes", () => {
  it("cashier-only staff land on POS, rider-only staff on Delivery", () => {
    const redirect = read("apps/website/client/src/pages/admin/AdminIndexRedirect.tsx");
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(redirect, /resolveStaffHome/);
    assert.match(access, /isCashierOnly/);
    assert.match(access, /isRiderOnly/);
    assert.match(access, /\/admin\/home\/cashier/);
    assert.match(access, /\/admin\/home\/delivery/);
  });

  it("Executive dashboard redirects staff-only roles away from owner metrics", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /resolveStaffHome/);
    assert.match(dashboard, /home !== "\/admin\/dashboard"/);
  });

  it("staff shells hide owner modules for cashier-only and rider-only roles", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /export function isCashierOnly/);
    assert.match(access, /export function isRiderOnly/);
    assert.match(access, /D4 cashier home is `\/admin\/home\/cashier`/);
    assert.match(access, /D4 rider home is `\/admin\/home\/delivery`/);
  });

  it("owner cross-branch drill-down opens the scoped branch dashboard", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /onSelectBranch/);
    assert.match(dashboard, /setSelection\(\{ mode: "branch", branchId \}\)/);
    assert.match(dashboard, /\/admin\/branch/);
  });

  it("assigned-branches aggregate selector is available to verified multi-branch staff", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /export function canViewMultipleAssignedBranches/);
    assert.doesNotMatch(access, /export function canViewAllBranches/);
    assert.match(access, /branchIds\?\.length \?\? 0\) > 1/);
    const ctx = read("apps/website/client/src/contexts/AdminBranchContext.tsx");
    assert.match(ctx, /canViewMultipleAssignedBranches/);
    assert.match(ctx, /Assigned Branches/);
    assert.match(ctx, /branchIdFilter=null/);
  });

  it("POS uses authenticated admin create, not public orderSource=pos", () => {
    const pos = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    assert.match(pos, /createAdminPosOrder/);
    assert.doesNotMatch(pos, /createOrderWithIdempotency/);
    const api = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(api, /\/admin\/pos\/orders/);
    const routes = read("backend/api/src/modules/orders/routes.ts");
    assert.match(routes, /POS_AUTH_REQUIRED/);
  });
});

describe("D2 — backend cross-branch comparison authorization", () => {
  it("branch performance is scope-verified (super-admin or multi-branch membership)", () => {
    const mgmt = read("backend/api/src/services/orders/management.ts");
    assert.match(mgmt, /new Set\(scope\.branchIds\)\.size/);
    assert.match(mgmt, /scope\.isSuperAdmin \|\| uniqueAssignedBranches > 1/);
    assert.match(mgmt, /assertBranchInScope/);
    assert.match(mgmt, /resolveScopedBranchIds/);
  });

  it("negative isolation tests exist for reads, writes, and forged branch IDs", () => {
    const tests = read("backend/api/tests/multibranch-isolation.d2.test.ts");
    assert.match(tests, /cross-branch read denial/);
    assert.match(tests, /cross-branch write denial/);
    assert.match(tests, /ORDER_ACCESS_DENIED/);
    assert.match(tests, /successful zero is not an error/);
    assert.match(tests, /branch selector value alone never widens scope/);
  });
});
