import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/migrations/20260807100000_identity_01_tenant_owner_onboarding.sql", import.meta.url);
const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

test("IDENTITY-01 migration is additive and contains canonical role hierarchy", () => {
  for (const role of ["platform_super_admin", "organization_owner", "finance", "hr", "auditor", "branch_manager", "kitchen_manager", "cashier", "rider", "support"]) {
    assert.match(sql, new RegExp(`'${role}'`));
  }
  assert.doesNotMatch(sql, /drop\s+table|truncate\s|delete\s+from\s+public\.users/);
  assert.match(sql, /legacy super-admin remains untouched/);
});

test("IDENTITY-01 adds tenant and multi-branch scope with isolation constraints", () => {
  assert.match(sql, /alter table public\.user_roles[\s\S]*organization_id uuid/);
  assert.match(sql, /alter table public\.staff_invites[\s\S]*organization_id uuid/);
  assert.match(sql, /create table if not exists public\.staff_invite_branches/);
  assert.match(sql, /create table if not exists public\.user_role_branches/);
  assert.match(sql, /branch is outside organization scope/);
  assert.match(sql, /invite branch is outside organization/);
});

test("IDENTITY-01 protects owner, audit, tokens, grants and durable throttling", () => {
  assert.match(sql, /cannot remove or demote final active organization owner/);
  assert.match(sql, /staff invite audit history is immutable/);
  assert.match(sql, /create unique index if not exists identity_staff_invites_token_hash_idx/);
  assert.match(sql, /create table if not exists public\.staff_invite_attempts/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.staff_invite_branches, public\.user_role_branches, public\.staff_invite_attempts from anon, authenticated/);
  assert.match(sql, /revoke update, delete on table public\.staff_invite_events from service_role/);
});

test("IDENTITY-01 acceptance remains atomic and preserves pending legacy roles", () => {
  assert.match(sql, /create or replace function public\.finalize_staff_invite_acceptance/);
  assert.match(sql, /for update/);
  assert.match(sql, /on conflict \(user_id,role_id,organization_id\)/);
  for (const legacy of ["branch-manager", "kitchen", "customer-support", "host", "waiter"]) assert.match(sql, new RegExp(`'${legacy}'`));
});
