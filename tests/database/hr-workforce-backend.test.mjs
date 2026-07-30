import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730130000_hr_workforce_backend.sql"),
  "utf8",
);

describe("HR workforce backend migration", () => {
  it("creates hr_employees with required columns", () => {
    assert.match(migration, /create table if not exists public\.hr_employees/);
    for (const col of ["branch_id", "full_name", "email", "phone", "role", "status", "hired_at"]) {
      assert.match(migration, new RegExp(col));
    }
  });

  it("enables branch-scoped RLS and service_role grants", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(migration, /grant all on public\.hr_employees to service_role/);
    assert.match(migration, /grant select on public\.hr_employees to authenticated/);
  });
});
