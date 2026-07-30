import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

describe("Final launch gap migrations", () => {
  it("kitchen recipe consume uses atomic preparing RPC and sale movements", () => {
    const sql = read("supabase/migrations/20260730230000_kitchen_recipe_stock_consume.sql");
    assert.match(sql, /menu_item_inventory_components/);
    assert.match(sql, /kitchen_ticket_set_preparing_atomic/);
    assert.match(sql, /Insufficient stock for/);
    assert.match(sql, /movement_type[\s\S]*'sale'/);
    const tickets = read("backend/api/src/services/kitchen/tickets.ts");
    assert.match(tickets, /kitchen_ticket_set_preparing_atomic/);
    assert.match(tickets, /INSUFFICIENT_STOCK/);
  });

  it("loyalty foundation tables and earn API exist", () => {
    const sql = read("supabase/migrations/20260730240000_loyalty_foundation.sql");
    assert.match(sql, /loyalty_accounts/);
    assert.match(sql, /loyalty_transactions/);
    assert.match(sql, /loyalty_earn_for_order_atomic/);
    assert.match(sql, /floor\(coalesce\(v_order\.total_amount, 0\) \/ 100\)/);
    const router = read("backend/api/src/modules/admin/loyalty.ts");
    assert.match(router, /\/loyalty\/earn/);
    assert.match(router, /\/loyalty\/accounts/);
  });

  it("coupons foundation and marketing APIs exist", () => {
    const sql = read("supabase/migrations/20260730250000_coupons_foundation.sql");
    assert.match(sql, /create table if not exists public\.coupons/);
    assert.match(sql, /discount_type/);
    const router = read("backend/api/src/modules/admin/marketing.ts");
    assert.match(router, /\/marketing\/coupons/);
    const page = read("apps/website/client/src/pages/admin/AdminMarketing.tsx");
    assert.match(page, /createMarketingCoupon/);
    assert.doesNotMatch(page, /Coming Soon.*[Cc]oupon/);
  });
});
