import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260806170223_phase2_03_versioning_activation_rollback.sql", import.meta.url),
  "utf8",
);

describe("PHASE2-03 configuration lifecycle migration", () => {
  it("adds one transaction-safe active pointer without new PHASE2-04 surfaces", () => {
    assert.match(migration, /create table if not exists public\.configuration_active_versions/i);
    assert.match(migration, /primary key \(schema_id, scope_type, scope_id\)/i);
    assert.match(migration, /pg_advisory_xact_lock/i);
    assert.doesNotMatch(migration, /audit_events|readiness/i);
  });

  it("makes version history immutable", () => {
    assert.match(migration, /before update or delete on public\.configuration_versions/i);
    assert.match(migration, /configuration_versions rows are immutable/i);
    assert.doesNotMatch(migration, /update public\.configuration_versions/i);
  });

  it("creates drafts and activates with stale-revision protection", () => {
    assert.match(migration, /create or replace function public\.create_configuration_version/i);
    assert.match(migration, /create or replace function public\.activate_configuration_version/i);
    assert.match(migration, /p_expected_revision bigint/i);
    assert.match(migration, /errcode = '40001'/i);
    assert.match(migration, /change_type[\s\S]*'activate'/i);
  });

  it("rolls back by copying a snapshot rather than rewriting history", () => {
    assert.match(migration, /create or replace function public\.rollback_configuration_version/i);
    assert.match(migration, /v_target\.value[\s\S]*'rolled_back'/i);
    assert.match(migration, /change_type[\s\S]*'rollback'/i);
  });

  it("keeps lifecycle tables and functions backend-only", () => {
    assert.match(migration, /alter table public\.configuration_active_versions enable row level security/i);
    assert.match(migration, /revoke all on public\.configuration_active_versions from public, anon, authenticated/i);
    for (const fn of ["create_configuration_version", "activate_configuration_version", "rollback_configuration_version"]) {
      assert.match(migration, new RegExp(`revoke all on function public\\.${fn}[^;]+from public, anon, authenticated`, "i"));
      assert.match(migration, new RegExp(`grant execute on function public\\.${fn}[^;]+to service_role`, "i"));
    }
  });

  it("never copies configuration values into audit metadata", () => {
    assert.match(migration, /jsonb_build_object\('dataType', v_schema\.data_type, 'redacted'/i);
    assert.doesNotMatch(migration, /new_value_metadata[\s\S]{0,500}(v_target\.value|v_version\.value|p_value)/i);
  });
});
