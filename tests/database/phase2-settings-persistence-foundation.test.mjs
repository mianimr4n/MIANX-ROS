import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260806150140_phase2_02_settings_persistence_foundation.sql", import.meta.url),
  "utf8",
);

describe("PHASE2-02 settings persistence migration", () => {
  it("adds organization ownership without replacing legacy settings", () => {
    assert.match(migration, /alter table public\.organization_settings[\s\S]*add column if not exists organization_id uuid/i);
    assert.match(migration, /foreign key \(organization_id\)[\s\S]*references public\.organization_settings \(organization_id\)/i);
    assert.doesNotMatch(migration, /drop table/i);
  });

  it("keeps configuration data backend-only with RLS and explicit grants", () => {
    for (const table of ["configuration_schemas", "configuration_versions", "configuration_change_log"]) {
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      assert.match(migration, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`, "i"));
    }
  });

  it("provides one atomic create/update persistence primitive", () => {
    assert.match(migration, /create or replace function public\.persist_configuration_value/i);
    assert.match(migration, /security invoker/i);
    assert.match(migration, /set status = 'superseded'/i);
    assert.match(migration, /insert into public\.configuration_versions/i);
    assert.match(migration, /insert into public\.configuration_change_log/i);
    assert.match(migration, /grant execute[\s\S]*to service_role/i);
  });

  it("records request context and idempotency without plaintext value metadata", () => {
    assert.match(migration, /request_id text/i);
    assert.match(migration, /correlation_id text/i);
    assert.match(migration, /configuration_change_log_idempotency_idx/i);
    assert.match(migration, /jsonb_build_object\('dataType', v_schema\.data_type, 'redacted', v_secret\)/i);
    assert.doesNotMatch(migration, /previous_value_metadata[\s\S]{0,300}v_current\.value/i);
  });

  it("retains the append-only mutation guard", () => {
    assert.match(migration, /alter function public\.prevent_configuration_change_log_mutation\(\) security invoker/i);
    assert.doesNotMatch(migration, /drop trigger[\s\S]*trg_prevent_configuration_change_log_mutation/i);
  });
});
