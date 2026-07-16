import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const permissionsMigration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716100000_sprint3_slice2b_staff_permissions.sql"),
  "utf8",
);
const invitesMigration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716101000_sprint3_slice2b_staff_invites.sql"),
  "utf8",
);
const acceptMigration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716102000_sprint3_slice2b_accept_helper.sql"),
  "utf8",
);

const lockedDecisionsMigration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716103000_sprint3_slice2b_locked_decisions.sql"),
  "utf8",
);

test("slice 2B permissions seed staff.create and staff.assign_role for super-admin only", () => {
  assert.match(permissionsMigration, /staff\.create/);
  assert.match(permissionsMigration, /staff\.assign_role/);
  assert.match(permissionsMigration, /roles\.code = 'super-admin'/);
  assert.doesNotMatch(permissionsMigration, /branch-manager'.*staff\.create/s);
});

test("staff_invites table has lifecycle, hash, and pending-email uniqueness", () => {
  assert.match(invitesMigration, /create table if not exists public\.staff_invites/);
  assert.match(invitesMigration, /token_hash/);
  assert.match(invitesMigration, /staff_invites_one_pending_email_uidx/);
  assert.match(invitesMigration, /enforce_staff_invite_rules/);
  assert.match(invitesMigration, /create table if not exists public\.staff_invite_events/);
  assert.match(invitesMigration, /'draft', 'pending', 'accepted', 'revoked', 'expired'/);
});

test("accept helper is security definer and provisions without metadata privilege trust", () => {
  assert.match(acceptMigration, /finalize_staff_invite_acceptance/);
  assert.match(acceptMigration, /security definer/i);
  assert.match(acceptMigration, /telepizza\.allow_staff_provision/);
  assert.match(acceptMigration, /code = 'customer'/);
  assert.doesNotMatch(acceptMigration, /raw_user_meta_data/);
});

test("locked decisions deny super-admin invites and require operating branch", () => {
  assert.match(lockedDecisionsMigration, /auth_user_email_exists/);
  assert.match(lockedDecisionsMigration, /role_code in \('customer', 'super-admin'\)/);
  assert.match(lockedDecisionsMigration, /branch_id is required for every staff invite/);
  assert.match(lockedDecisionsMigration, /branch must be operating/);
  assert.match(lockedDecisionsMigration, /invite account conflict/);
  assert.match(lockedDecisionsMigration, /'branch-manager',\s*'cashier',\s*'kitchen',\s*'rider',\s*'customer-support'/);
});
