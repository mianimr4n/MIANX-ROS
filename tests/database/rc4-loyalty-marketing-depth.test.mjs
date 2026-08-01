/**
 * RC4-11 loyalty + marketing depth — static SQL assertions.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sql = readFileSync(
  join(root, "supabase/migrations/20260801180000_rc4_loyalty_marketing_depth.sql"),
  "utf8",
);

describe("RC4-11 loyalty marketing depth (database static)", () => {
  it("creates rewards catalogue with approval + type checks", () => {
    assert.match(sql, /create table if not exists public\.loyalty_rewards/);
    assert.match(sql, /'fixed_discount'/);
    assert.match(sql, /'delivery_fee_waiver'/);
    assert.match(sql, /approval_status/);
    assert.match(sql, /'awaiting_approval'/);
    assert.match(sql, /'approved'/);
  });

  it("links redemptions with idempotency and burn transaction", () => {
    assert.match(sql, /create table if not exists public\.loyalty_reward_redemptions/);
    assert.match(sql, /loyalty_reward_redemptions_idempotency_uq/);
    assert.match(sql, /loyalty_transaction_id/);
    assert.match(sql, /points_burned/);
  });

  it("seeds tier definitions and history", () => {
    assert.match(sql, /create table if not exists public\.loyalty_tier_definitions/);
    assert.match(sql, /create table if not exists public\.loyalty_tier_history/);
    assert.match(sql, /'member'/);
    assert.match(sql, /'platinum'/);
    assert.match(sql, /lifetime_earned_points/);
  });

  it("expiry policies require valuation rate for PKR liability", () => {
    assert.match(sql, /create table if not exists public\.loyalty_expiry_policies/);
    assert.match(sql, /valuation_rule/);
    assert.match(sql, /configured_rate/);
    assert.match(sql, /points_to_pkr_rate/);
  });

  it("seeds marketing segments with documented formulas", () => {
    assert.match(sql, /create table if not exists public\.marketing_segments/);
    assert.match(sql, /'new_customers'/);
    assert.match(sql, /'loyalty_members'/);
    assert.match(sql, /'consented_audiences'/);
    assert.match(sql, /authoritative_source/);
  });

  it("templates + campaign lifecycle depth + attribution honesty", () => {
    assert.match(sql, /create table if not exists public\.marketing_templates/);
    assert.match(sql, /provider_approval_state/);
    assert.match(sql, /awaiting_approval/);
    assert.match(sql, /marketing_campaigns_status_check/);
    assert.match(sql, /create table if not exists public\.marketing_attribution_links/);
    assert.match(sql, /never timing inference/i);
    assert.match(sql, /create table if not exists public\.loyalty_marketing_audit_events/);
  });

  it("enables RLS on new depth tables", () => {
    assert.match(sql, /alter table public\.loyalty_rewards enable row level security/);
    assert.match(sql, /alter table public\.marketing_segments enable row level security/);
    assert.match(sql, /alter table public\.marketing_attribution_links enable row level security/);
  });
});
