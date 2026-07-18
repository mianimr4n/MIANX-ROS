import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260718171000_db_hash_column_privilege_harden.sql",
);

test("hash privilege harden excludes qr_token_hash and public_token_hash from client grants", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /revoke all on table public\.restaurant_tables from anon, authenticated/i);
  assert.match(sql, /grant select \([\s\S]*?qr_version[\s\S]*?\) on table public\.restaurant_tables to authenticated/i);
  assert.doesNotMatch(
    sql,
    /grant select \([\s\S]*qr_token_hash[\s\S]*\) on table public\.restaurant_tables to authenticated/i,
  );
  assert.match(sql, /revoke all on table public\.dine_in_sessions from anon, authenticated/i);
  assert.doesNotMatch(
    sql,
    /grant (select|update) \([\s\S]*public_token_hash[\s\S]*\) on table public\.dine_in_sessions to authenticated/i,
  );
});
