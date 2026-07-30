/**
 * Loyalty & Rewards V1 — composition and honesty wiring (static).
 * Points ledger is LIVE; Rewards Catalog remains Planned for Phase 2.
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
  it("composes /admin/loyalty with live accounts list and rewards Planned for Phase 2", () => {
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.match(page, /listLoyaltyAccounts/);
    assert.match(page, /RewardCatalogue/);
    assert.match(page, /canAccessAdminLoyalty/);
    assert.match(page, /LIVE accounts/);
    assert.doesNotMatch(page, /Foundation \+ Derived|FOUNDATION/);
  });

  it("does not invent points in the browser", () => {
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.match(page, /No loyalty accounts yet|pointsBalance/);
    assert.doesNotMatch(page, /Math\.random|localStorage|getLoyaltyPoints/);
  });

  it("keeps Rewards Catalog as Planned for Phase 2", () => {
    const catalogue = read("apps/website/client/src/components/admin/loyalty/RewardCatalogue.tsx");
    assert.match(catalogue, /Rewards Catalog — Planned for Phase 2/);
    assert.match(catalogue, /Planned for Phase 2 — no sample rewards/i);
  });

  it("gates /admin/loyalty with canAccessAdminLoyalty", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminLoyalty/);
    assert.match(access, /loyalty\.manage/);
    assert.match(access, /href: "\/admin\/loyalty"/);
    assert.match(access, /requiresLoyalty: true/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminLoyalty/);
    assert.match(app, /path="\/admin\/loyalty"/);
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("does not use client localStorage loyalty points for admin", () => {
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.doesNotMatch(page, /getLoyaltyPoints|LOYALTY_POINTS_KEY|localStorage/);
  });
});
