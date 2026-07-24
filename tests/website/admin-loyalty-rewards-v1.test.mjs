/**
 * Loyalty & Rewards V1 — composition and honesty wiring (static).
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

describe("Loyalty & Rewards V1 (static)", () => {
  it("composes /admin/loyalty from reusable loyalty components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.match(page, /LoyaltyHeader/);
    assert.match(page, /LoyaltyProgramBanner/);
    assert.match(page, /LoyaltyKPIs/);
    assert.match(page, /LoyaltyFilters/);
    assert.match(page, /LoyaltyCustomerTable/);
    assert.match(page, /LoyaltyCustomerDrawer/);
    assert.match(page, /RewardCatalogue/);
    assert.match(page, /TierOverview/);
    assert.match(page, /LoyaltyActivity/);
    assert.match(page, /LoyaltyInsights/);
    assert.match(page, /canAccessAdminLoyalty/);
    assert.match(page, /listAdminOrders/);
  });

  it("does not fabricate points or tiers when no ledger exists", () => {
    const helper = read("apps/website/client/src/lib/admin-loyalty.ts");
    assert.match(helper, /classifyCustomer/);
    assert.match(helper, /buildLoyaltyKpis/);
    assert.doesNotMatch(helper, /Bronze|Silver|Gold|Platinum|pointsBalance|Math\.random/);
    const table = read("apps/website/client/src/components/admin/loyalty/LoyaltyCustomerTable.tsx");
    assert.match(table, /Unavailable/);
    assert.match(table, /Order-derived/);
    assert.doesNotMatch(table, /Bronze|Silver|Gold|pointsBalance|\d+\s*pts/i);
    const kpis = read("apps/website/client/src/components/admin/loyalty/LoyaltyKPIs.tsx");
    assert.match(kpis, /Points issued/);
    assert.match(kpis, /UNAVAILABLE/);
    assert.match(kpis, /Reward liability/);
  });

  it("labels reward catalogue and tier overview as Foundation", () => {
    const catalogue = read("apps/website/client/src/components/admin/loyalty/RewardCatalogue.tsx");
    assert.match(catalogue, /Reward Catalogue Foundation/);
    assert.match(catalogue, /no sample pizza rewards/i);
    const tiers = read("apps/website/client/src/components/admin/loyalty/TierOverview.tsx");
    assert.match(tiers, /Tier management · Foundation/);
    assert.match(tiers, /not assigned to tiers/i);
  });

  it("labels repeat classifications and Mianx insights as rule-based only", () => {
    const drawer = read("apps/website/client/src/components/admin/loyalty/LoyaltyCustomerDrawer.tsx");
    assert.match(drawer, /Rule-based classification/);
    assert.match(drawer, /Points ledger unavailable/);
    const insights = read("apps/website/client/src/components/admin/loyalty/LoyaltyInsights.tsx");
    assert.match(insights, /Mianx\.ai Loyalty Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous|churn prediction/i);
  });

  it("gates /admin/loyalty with canAccessAdminLoyalty (order.manage)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminLoyalty/);
    assert.match(access, /canAccessAdminOrdersApi/);
    assert.match(access, /href: "\/admin\/loyalty"/);
    assert.match(access, /requiresOrdersApi: true/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminLoyalty/);
    assert.match(app, /path="\/admin\/loyalty"/);
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("links CRM drawer to loyalty view and preserves CRM routes", () => {
    const drawer = read("apps/website/client/src/components/admin/crm/CustomerDrawer.tsx");
    assert.match(drawer, /\/admin\/loyalty\?selected=/);
    const loyaltyDrawer = read("apps/website/client/src/components/admin/loyalty/LoyaltyCustomerDrawer.tsx");
    assert.match(loyaltyDrawer, /\/admin\/crm\?selected=/);
    assert.match(loyaltyDrawer, /\/admin\/orders/);
    assert.match(loyaltyDrawer, /Escape/);
    assert.match(loyaltyDrawer, /returnFocusRef/);
  });

  it("does not use client localStorage loyalty points for admin", () => {
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.doesNotMatch(page, /getLoyaltyPoints|LOYALTY_POINTS_KEY|localStorage/);
    const helper = read("apps/website/client/src/lib/admin-loyalty.ts");
    assert.doesNotMatch(helper, /localStorage|getLoyaltyPoints/);
  });
});
