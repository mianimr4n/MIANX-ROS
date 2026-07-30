import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const employeesMigration = readFileSync(
  join(root, "supabase/migrations/20260730130000_hr_workforce_backend.sql"),
  "utf8",
);
const coreMigration = readFileSync(
  join(root, "supabase/migrations/20260730290000_hr_core_complete.sql"),
  "utf8",
);

describe("HR workforce backend migration", () => {
  it("creates hr_employees with required columns", () => {
    assert.match(employeesMigration, /create table if not exists public\.hr_employees/);
    for (const col of ["branch_id", "full_name", "email", "phone", "role", "status", "hired_at"]) {
      assert.match(employeesMigration, new RegExp(col));
    }
  });

  it("enables branch-scoped RLS and service_role grants", () => {
    assert.match(employeesMigration, /enable row level security/);
    assert.match(employeesMigration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(employeesMigration, /grant all on public\.hr_employees to service_role/);
    assert.match(employeesMigration, /grant select on public\.hr_employees to authenticated/);
  });
});

describe("HR core complete migration", () => {
  it("creates attendance, leave, and document tables", () => {
    assert.match(coreMigration, /create table if not exists public\.hr_attendance/);
    assert.match(coreMigration, /create table if not exists public\.hr_leave_requests/);
    assert.match(coreMigration, /create table if not exists public\.hr_employee_documents/);
    assert.match(coreMigration, /PRESENT.*ABSENT.*LATE.*LEAVE/s);
    assert.match(coreMigration, /CASUAL.*SICK.*ANNUAL/s);
    assert.match(coreMigration, /PENDING.*APPROVED.*REJECTED/s);
    assert.match(coreMigration, /CNIC.*CONTRACT.*CERTIFICATE/s);
  });

  it("enables RLS and seeds hr.manage", () => {
    assert.match(coreMigration, /hr\.manage/);
    assert.match(coreMigration, /enable row level security/);
    assert.match(coreMigration, /grant all on public\.hr_attendance to service_role/);
    assert.match(coreMigration, /grant all on public\.hr_leave_requests to service_role/);
    assert.match(coreMigration, /grant all on public\.hr_employee_documents to service_role/);
  });
});
