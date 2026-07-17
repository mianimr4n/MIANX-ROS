import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(
  workspaceRoot,
  "supabase",
  "migrations",
  "20260718130000_p0_harden_grants_and_definer_execute.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("P0 migration is transactional privilege-only hardening", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\btruncate\s+table\b/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
});

test("P0 strips TRUNCATE/REFERENCES/TRIGGER from client roles on all public tables", () => {
  assert.match(
    migration,
    /revoke truncate, references, trigger on table public\.%I from anon, authenticated/i,
  );
});

test("P0 locks catalog to SELECT for anon/authenticated", () => {
  assert.match(
    migration,
    /grant select on table public\.branches, public\.menu_categories, public\.menu_items, public\.menu_item_variants\s+to anon, authenticated/i,
  );
});

test("P0 locks DEFINER helpers away from anon/authenticated where designed", () => {
  assert.match(
    migration,
    /revoke all on function public\.ensure_customer_profile_for_auth_user\(uuid, text, text\) from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.ensure_customer_profile_for_auth_user\(uuid, text, text\) to service_role/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.handle_new_user\(\) from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.current_app_user_id\(\) to authenticated, service_role/i,
  );
});

test("P0 tightens default privileges for future tables", () => {
  assert.match(
    migration,
    /alter default privileges in schema public\s+revoke insert, update, delete on tables from anon/i,
  );
  assert.match(
    migration,
    /alter default privileges in schema public\s+revoke truncate, references, trigger on tables from anon, authenticated/i,
  );
});
