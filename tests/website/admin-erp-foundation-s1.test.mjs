/**
 * Admin ERP Foundation S1 — static wiring + permission contract checks.
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

describe("Admin ERP Foundation S1 (static)", () => {
  it("wires admin routes without customer chrome", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /\/admin\/login/);
    assert.match(app, /\/admin\/dashboard/);
    assert.match(app, /\/admin\/orders\/:orderId/);
    assert.match(app, /\/admin\/unauthorized/);
    assert.match(app, /path\.startsWith\("\/admin"\)/);
    assert.match(app, /AdminBranchProvider/);
  });

  it("keeps reserved modules honest as coming soon", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /\/admin\/kitchen/);
    assert.match(app, /\/admin\/ai-command-center/);
    assert.match(app, /AdminComingSoon/);
    const soon = read("apps/website/client/src/pages/admin/AdminComingSoon.tsx");
    assert.match(soon, /not available in Foundation S1/i);
    assert.doesNotMatch(soon, /fake|mock revenue|autonomous/i);
  });

  it("defines centralized admin permission helpers from DB permission codes", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdmin/);
    assert.match(access, /canAccessAdminOrdersApi/);
    assert.match(access, /order\.manage/);
    assert.match(access, /canViewAllBranches/);
    assert.doesNotMatch(access, /@gmail\.com|email\.includes/);
  });

  it("exposes admin dashboard API with order.manage gate", () => {
    const dashboard = read("backend/api/src/modules/admin/dashboard.ts");
    assert.match(dashboard, /\/operations/);
    assert.match(dashboard, /requirePermission\("order\.manage"\)/);
    const routes = read("backend/api/src/modules/admin/routes.ts");
    assert.match(routes, /\/dashboard/);
    assert.match(routes, /createAdminDashboardRouter/);
  });

  it("orders list accepts branch/source/number filters", () => {
    const orders = read("backend/api/src/modules/admin/orders.ts");
    assert.match(orders, /orderSource/);
    assert.match(orders, /orderNumber/);
    const management = read("backend/api/src/services/orders/management.ts");
    assert.match(management, /getOperationsDashboard/);
    assert.match(management, /Asia\/Karachi/);
    assert.match(management, /PENDING_TOO_LONG/);
  });

  it("admin login is separate from customer marketing chrome", () => {
    const login = read("apps/website/client/src/pages/admin/AdminLogin.tsx");
    assert.match(login, /Telepizza Admin/);
    assert.match(login, /Powered by Mianx\.ai/);
    assert.doesNotMatch(login, /Google|Facebook|SSO/);
  });

  it("orders module remains read-only in S1 UI", () => {
    const detail = read("apps/website/client/src/pages/admin/AdminOrderDetail.tsx");
    assert.match(detail, /read-only/i);
    assert.doesNotMatch(detail, /transitionOpsOrder|confirm\(|preparing\(/);
    const list = read("apps/website/client/src/pages/admin/AdminOrders.tsx");
    assert.match(list, /Read-only/);
  });
});
