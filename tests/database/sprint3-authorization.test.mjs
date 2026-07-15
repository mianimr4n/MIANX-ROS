import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716020000_sprint3_authorization_foundation.sql"),
  "utf8",
);

test("authorization migration is transactional and forward-only", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
  assert.match(migration, /Rollback guidance/i);
  assert.doesNotMatch(migration, /drop table/i);
});

test("customer role remains seeded with zero approved permissions for Slice 2A", () => {
  assert.match(migration, /code = 'customer'/i);
  assert.match(migration, /delete from public\.role_permissions/i);
  assert.match(migration, /where role_id in \(select id from public\.roles where code = 'customer'\)/i);
  assert.match(migration, /approved permissions: none/i);
});

test("migration does not assign privileged roles from auth metadata", () => {
  assert.doesNotMatch(migration, /raw_user_meta_data/i);
  assert.doesNotMatch(migration, /insert into public\.user_roles/i);
  assert.doesNotMatch(migration, /insert into public\.role_permissions/i);
});

test("migration preserves staff roles and adds auth_user_id lookup index", () => {
  assert.match(migration, /Keep staff role-permission seed intact/i);
  assert.match(migration, /idx_users_auth_user_id/i);
  assert.match(migration, /create index if not exists/i);
});
