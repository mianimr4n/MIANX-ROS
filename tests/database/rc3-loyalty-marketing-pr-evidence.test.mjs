import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const migrations = [
  "20260730240000_loyalty_foundation.sql",
  "20260730250000_coupons_foundation.sql",
  "20260731090000_loyalty_ledger_complete.sql",
  "20260731100000_coupon_redemptions.sql",
  "20260731110000_marketing_campaigns_consent.sql",
].map((name) => ({
  name,
  sql: readFileSync(join(root, "supabase/migrations", name), "utf8"),
}));

const byName = Object.fromEntries(migrations.map((m) => [m.name, m.sql]));

describe("RC3 loyalty-marketing PR evidence", () => {
  it("documents migration application order (foundation then RC3)", () => {
    const order = migrations.map((m) => m.name);
    assert.deepEqual(order, [
      "20260730240000_loyalty_foundation.sql",
      "20260730250000_coupons_foundation.sql",
      "20260731090000_loyalty_ledger_complete.sql",
      "20260731100000_coupon_redemptions.sql",
      "20260731110000_marketing_campaigns_consent.sql",
    ]);
  });

  it("enables RLS on consent/suppression and redemption tables", () => {
    assert.match(byName["20260731100000_coupon_redemptions.sql"], /enable row level security/);
    assert.match(
      byName["20260731100000_coupon_redemptions.sql"],
      /Staff select coupon redemptions/,
    );
    assert.match(byName["20260731110000_marketing_campaigns_consent.sql"], /marketing_suppressions/);
    assert.match(
      byName["20260731110000_marketing_campaigns_consent.sql"],
      /enable row level security/,
    );
    assert.match(
      byName["20260731110000_marketing_campaigns_consent.sql"],
      /Staff select marketing suppressions/,
    );
  });

  it("blocks duplicate coupon redemption per order and burn idempotency", () => {
    assert.match(byName["20260731100000_coupon_redemptions.sql"], /unique \(order_id\)/);
    assert.match(
      byName["20260731090000_loyalty_ledger_complete.sql"],
      /uq_loyalty_txn_idempotency/,
    );
    assert.match(
      byName["20260731090000_loyalty_ledger_complete.sql"],
      /uq_loyalty_txn_reverse_once/,
    );
  });

  it("supports refund reversal via loyalty_reverse_atomic once", () => {
    assert.match(byName["20260731090000_loyalty_ledger_complete.sql"], /loyalty_reverse_atomic/);
    assert.match(byName["20260731090000_loyalty_ledger_complete.sql"], /ALREADY_REVERSED/);
    assert.match(byName["20260731090000_loyalty_ledger_complete.sql"], /CANNOT_REVERSE_A_REVERSAL/);
  });

  it("provider submission statuses never include delivered", () => {
    const sql = byName["20260731110000_marketing_campaigns_consent.sql"];
    assert.match(sql, /'provider_accepted'/);
    assert.match(sql, /'provider_rejected'/);
    assert.doesNotMatch(sql, /status in \([\s\S]*'delivered'/);
  });

  it("checkout discount reconcile path uses validate RPC + redemption row", () => {
    const orders = readFileSync(join(root, "backend/api/src/services/orders/supabase.ts"), "utf8");
    assert.match(orders, /coupon_validate_discount/);
    assert.match(orders, /coupon_redemptions/);
    assert.match(orders, /discount_applied/);
    assert.match(orders, /discountAmount: coupon\.discountAmount/);
  });
});
