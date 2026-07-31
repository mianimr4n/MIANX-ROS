import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const loyalty = readFileSync(
  join(root, "supabase/migrations/20260731090000_loyalty_ledger_complete.sql"),
  "utf8",
);
const coupons = readFileSync(
  join(root, "supabase/migrations/20260731100000_coupon_redemptions.sql"),
  "utf8",
);
const campaigns = readFileSync(
  join(root, "supabase/migrations/20260731110000_marketing_campaigns_consent.sql"),
  "utf8",
);

const loyaltyCompat = readFileSync(
  join(root, "supabase/migrations/20260731140000_loyalty_schema_compatibility.sql"),
  "utf8",
);
const loyaltyFoundation = readFileSync(
  join(root, "supabase/migrations/20260730240000_loyalty_foundation.sql"),
  "utf8",
);

describe("RC3 loyalty + marketing migrations", () => {
  it("foundation creates loyalty_transactions without inventing actor_user_id early", () => {
    assert.match(loyaltyFoundation, /create table if not exists public\.loyalty_transactions/);
    const tableBlock = loyaltyFoundation.match(
      /create table if not exists public\.loyalty_transactions \([\s\S]*?\);/,
    );
    assert.ok(tableBlock, "loyalty_transactions create table block");
    assert.doesNotMatch(tableBlock[0], /\bactor_user_id\b/);
  });

  it("ledger complete migration adds actor_user_id for API/RPC compatibility", () => {
    assert.match(loyalty, /add column if not exists actor_user_id/);
    assert.match(loyalty, /loyalty_burn_atomic/);
    assert.match(loyalty, /loyalty_adjust_atomic/);
    assert.match(loyalty, /loyalty_expire_atomic/);
    assert.match(loyalty, /loyalty_reverse_atomic/);
    assert.match(loyalty, /'reverse'/);
    assert.match(loyalty, /for update/);
    assert.doesNotMatch(loyalty, /values\s*\(\s*'member',\s*1000/i);
  });

  it("compatibility repair re-asserts actor_user_id and earn persistence idempotently", () => {
    assert.match(loyaltyCompat, /add column if not exists actor_user_id/);
    assert.match(loyaltyCompat, /loyalty_earn_for_order_atomic/);
    assert.match(loyaltyCompat, /actor_user_id/);
    assert.match(loyaltyCompat, /loyalty_burn_atomic/);
    assert.match(loyaltyCompat, /begin;/);
    assert.match(loyaltyCompat, /commit;/);
    assert.doesNotMatch(loyaltyCompat, /\bDROP TABLE\b/i);
    assert.doesNotMatch(loyaltyCompat, /\bTRUNCATE\b/i);
  });

  it("adds coupon_redemptions and validate RPC", () => {
    assert.match(coupons, /create table if not exists public\.coupon_redemptions/);
    assert.match(coupons, /coupon_validate_discount/);
    assert.match(coupons, /unique \(order_id\)/);
    assert.doesNotMatch(coupons, /insert into public\.coupons/i);
  });

  it("adds campaigns with honest provider submission states", () => {
    assert.match(campaigns, /marketing_campaigns/);
    assert.match(campaigns, /marketing_campaign_submissions/);
    assert.match(campaigns, /provider_accepted/);
    assert.match(campaigns, /provider_rejected/);
    assert.match(campaigns, /marketing_suppressions/);
    assert.doesNotMatch(
      campaigns,
      /status in \([\s\S]*'delivered'/,
    );
  });
});
