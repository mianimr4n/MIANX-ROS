/**
 * CRM & Customer Management V1 — composition and honesty wiring (static).
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

describe("CRM & Customer Management V1 (static)", () => {
  it("composes /admin/crm from reusable CRM components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminCrm.tsx");
    assert.match(page, /CRMHeader/);
    assert.match(page, /CustomerKPIs/);
    assert.match(page, /CustomerFilters/);
    assert.match(page, /CustomerTable/);
    assert.match(page, /CustomerDrawer/);
    assert.match(page, /CustomerInsights/);
    assert.match(page, /aggregateCustomersFromOrders/);
    assert.match(page, /listAdminOrders/);
    assert.match(page, /canAccessAdminOrdersApi/);
  });

  it("derives customers from orders without inventing a CRM API", () => {
    const helper = read("apps/website/client/src/lib/admin-crm.ts");
    assert.match(helper, /aggregateCustomersFromOrders/);
    assert.match(helper, /normalizePhoneKey/);
    assert.match(helper, /buildCrmKpis/);
    assert.doesNotMatch(helper, /fakeCustomers|mockVip|Math\.random/);
  });

  it("labels loyalty, marketing, VIP, export, and WhatsApp as Planned for Phase 2", () => {
    const kpis = read("apps/website/client/src/components/admin/crm/CustomerKPIs.tsx");
    assert.match(kpis, /VIP customers/);
    assert.match(kpis, /FOUNDATION/);
    assert.match(kpis, /Blocked customers/);
    assert.match(kpis, /Customer order window unavailable/);
    assert.doesNotMatch(kpis, /totalCustomers \?\? 0/);
    const page = read("apps/website/client/src/pages/admin/AdminCrm.tsx");
    assert.match(page, /snapshot=\{live \? kpis : null\}/);
    const loyalty = read("apps/website/client/src/components/admin/crm/CustomerLoyalty.tsx");
    assert.match(loyalty, /Planned for Phase 2/);
    assert.match(loyalty, /SMS opt-in/);
    assert.match(loyalty, /WhatsApp opt-in/);
    const header = read("apps/website/client/src/components/admin/crm/CRMHeader.tsx");
    assert.match(header, /Export · Planned for Phase 2/);
    const drawer = read("apps/website/client/src/components/admin/crm/CustomerDrawer.tsx");
    assert.match(drawer, /Send WhatsApp · Planned for Phase 2/);
    assert.match(drawer, /Edit · Planned for Phase 2/);
  });

  it("labels AI panel as rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/crm/CustomerInsights.tsx");
    assert.match(insights, /Mianx\.ai Customer Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous/i);
  });

  it("wires /admin/crm and /admin/customers to AdminCrm", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /href: "\/admin\/crm"/);
    assert.match(access, /requiresOrdersApi: true/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminCrm/);
    assert.match(app, /path="\/admin\/crm"/);
    assert.match(app, /path="\/admin\/customers"/);
    assert.doesNotMatch(app, /CustomersComingSoon/);
  });
});
