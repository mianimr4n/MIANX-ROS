import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716150000_customer_identity_phone_e164.sql"),
  "utf8",
);
const foundation = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260713190000_foundation_schema.sql"),
  "utf8",
);
const bootstrap = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716010000_sprint3_customer_auth_foundation.sql"),
  "utf8",
);

test("foundation already unique-constrains users.phone", () => {
  assert.match(foundation, /phone varchar\(30\) unique/i);
});

test("identity phone migration adds E.164 check and partial unique index", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
  assert.match(migration, /users_phone_e164_check/);
  assert.match(migration, /\+923\[0-9\]\{9\}/);
  assert.match(migration, /users_phone_e164_uidx/);
  assert.match(migration, /where phone is not null/);
});

test("privilege escalation guards remain for profile updates", () => {
  assert.match(bootstrap, /auth_user_id cannot be changed/i);
  assert.match(bootstrap, /user_type cannot be changed/i);
  assert.match(bootstrap, /password_hash cannot be changed/i);
  assert.match(bootstrap, /Users can update own allowed profile fields/i);
});

test("migration stays away from Slice 2D and catalog", () => {
  assert.doesNotMatch(migration, /20260716140000|order_branch_rls|create policy/i);
  assert.doesNotMatch(migration, /menu_items|menu_categories/);
});
