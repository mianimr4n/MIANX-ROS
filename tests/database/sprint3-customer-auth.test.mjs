import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716010000_sprint3_customer_auth_foundation.sql"),
  "utf8",
);

test("customer role is seeded idempotently", () => {
  assert.match(migration, /'customer'/i);
  assert.match(migration, /on conflict \(code\) do update/i);
  assert.match(migration, /Customer/i);
});

test("auth bootstrap trigger ensures one public.users row and never creates customers", () => {
  assert.match(migration, /create or replace function public\.handle_auth_user_created/i);
  assert.match(migration, /create or replace function public\.ensure_customer_profile_for_auth_user/i);
  assert.match(migration, /on conflict \(auth_user_id\) do update/i);
  assert.match(migration, /after insert on auth\.users/i);
  assert.doesNotMatch(migration, /insert into public\.customers/i);
});

test("full_name fallback order is metadata then email local-part then Customer", () => {
  assert.match(migration, /raw_user_meta_data ->> 'full_name'/i);
  assert.match(migration, /raw_user_meta_data ->> 'name'/i);
  assert.match(migration, /split_part\(coalesce\(p_email/i);
  assert.match(migration, /resolved_name := 'Customer'/i);
  assert.doesNotMatch(migration, /raw_user_meta_data ->> 'role'/i);
  assert.doesNotMatch(migration, /raw_user_meta_data ->> 'user_type'/i);
});

test("customer role assignment is idempotent and global-unique when branch_id is null", () => {
  assert.match(migration, /user_roles_user_role_global_uidx/i);
  assert.match(migration, /where not exists/i);
  assert.match(migration, /code = 'customer'/i);
});

test("password_hash stays null for Supabase Auth bootstrap", () => {
  assert.match(migration, /password_hash/i);
  assert.match(migration, /null,\s*\n\s*null,\s*\n\s*'customer'/i);
  assert.match(migration, /password_hash cannot be changed for Supabase Auth users/i);
});

test("RLS allows own profile read/update and blocks privilege escalation paths", () => {
  assert.match(migration, /Users can read own profile/i);
  assert.match(migration, /Users can update own allowed profile fields/i);
  assert.match(migration, /auth_user_id = auth\.uid\(\)/i);
  assert.match(migration, /prevent_users_privilege_escalation/i);
  assert.match(migration, /user_type cannot be changed/i);
  assert.match(migration, /Users can read own role assignments/i);
  assert.match(migration, /prevent_user_roles_client_mutation/i);
  assert.match(migration, /Authenticated clients cannot mutate user_roles/i);
});

test("migration remains transactional and documents verification/rollback", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
  assert.match(migration, /Verification/i);
  assert.match(migration, /Rollback guidance/i);
});

test("idempotent backfill covers orphan auth users and zero-role profiles only", () => {
  assert.match(migration, /Idempotent backfill for auth\.users that predate this migration/i);
  assert.match(migration, /left join public\.users pu on pu\.auth_user_id = au\.id/i);
  assert.match(migration, /where pu\.id is null/i);
  assert.match(migration, /perform public\.ensure_customer_profile_for_auth_user/i);
  assert.match(migration, /auth_row\.raw_user_meta_data ->> 'full_name'/i);

  // B: only when ZERO roles exist
  assert.match(migration, /and not exists \(\s*select 1\s*from public\.user_roles ur\s*where ur\.user_id = u\.id\s*\)/i);

  // C: existing non-empty role sets are preserved (no rewrite/delete of staff roles)
  assert.match(migration, /Profiles that already have >=1 role row are left untouched/i);
  assert.doesNotMatch(migration, /delete from public\.user_roles where role_id not in/i);
  assert.doesNotMatch(migration, /'super-admin'.*insert into public\.user_roles/is);

  // Idempotency / no customers row
  assert.match(migration, /Re-running these statements is safe/i);
  assert.doesNotMatch(migration, /insert into public\.customers/i);

  // Verification queries for orphans / zero-role leftovers
  assert.match(migration, /orphan_auth_users/i);
  assert.match(migration, /linked_users_without_roles/i);
});
