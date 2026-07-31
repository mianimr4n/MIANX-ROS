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

describe("RC3 loyalty + marketing migrations", () => {
  it("adds burn/adjust/expire/reverse RPCs on loyalty_transactions", () => {
    assert.match(loyalty, /loyalty_burn_atomic/);
    assert.match(loyalty, /loyalty_adjust_atomic/);
    assert.match(loyalty, /loyalty_expire_atomic/);
    assert.match(loyalty, /loyalty_reverse_atomic/);
    assert.match(loyalty, /'reverse'/);
    assert.match(loyalty, /for update/);
    assert.doesNotMatch(loyalty, /values\s*\(\s*'member',\s*1000/i);
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
