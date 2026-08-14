/**
 * Tests for ADR-003 — Provider-Secret Boundary Architecture
 *
 * Verifies the migration 20260816000000 creates the whatsapp_provider_configs
 * table with the correct shape: NO secret columns, config_ref as env-var
 * prefix, partial unique index for one default, RLS policies.
 *
 * Authority: ADR-003 "Provider-Secret Boundary Architecture"
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260816000000_adr_003_provider_secret_boundary.sql",
);

const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("ADR-003 — Provider-Secret Boundary migration", () => {
  it("migration file exists and is non-empty", () => {
    expect(MIGRATION_SQL.length).toBeGreaterThan(500);
  });

  it("creates whatsapp_provider_configs table", () => {
    expect(MIGRATION_SQL).toMatch(
      /create table if not exists public\.whatsapp_provider_configs/i,
    );
  });

  it("has config_ref column with unique constraint", () => {
    expect(MIGRATION_SQL).toMatch(/config_ref text not null unique/i);
  });

  it("has phone_number_id column (non-secret, OK to store)", () => {
    expect(MIGRATION_SQL).toMatch(/phone_number_id text not null/i);
  });

  it("has business_account_id column (non-secret, OK to store)", () => {
    expect(MIGRATION_SQL).toMatch(/business_account_id text not null/i);
  });

  it("has is_default boolean column", () => {
    expect(MIGRATION_SQL).toMatch(/is_default boolean not null default false/i);
  });

  it("has default_branch_id FK to branches", () => {
    expect(MIGRATION_SQL).toMatch(
      /default_branch_id uuid references public\.branches \(id\) on delete set null/i,
    );
  });

  it("DOES NOT have access_token column (secret must never be in DB)", () => {
    // Asserting absence: no column named access_token anywhere in the table definition.
    // We strip line comments first to avoid false positives from documentation.
    const withoutComments = MIGRATION_SQL.replace(/^[\t ]*--[^\n]*$/gm, "");
    expect(withoutComments).not.toMatch(/access_token\s+text/i);
    expect(withoutComments).not.toMatch(/access_token\s+varchar/i);
  });

  it("DOES NOT have app_secret column (secret must never be in DB)", () => {
    const withoutComments = MIGRATION_SQL.replace(/^[\t ]*--[^\n]*$/gm, "");
    expect(withoutComments).not.toMatch(/app_secret\s+text/i);
    expect(withoutComments).not.toMatch(/app_secret\s+varchar/i);
  });

  it("DOES NOT have verify_token column (secret must never be in DB)", () => {
    const withoutComments = MIGRATION_SQL.replace(/^[\t ]*--[^\n]*$/gm, "");
    expect(withoutComments).not.toMatch(/verify_token\s+text/i);
    expect(withoutComments).not.toMatch(/verify_token\s+varchar/i);
  });

  it("enforces exactly one default via partial unique index", () => {
    expect(MIGRATION_SQL).toMatch(
      /create unique index if not exists whatsapp_provider_configs_one_default_uidx\s+on public\.whatsapp_provider_configs \(is_default\) where is_default = true/i,
    );
  });

  it("enables RLS on whatsapp_provider_configs", () => {
    expect(MIGRATION_SQL).toMatch(
      /alter table public\.whatsapp_provider_configs enable row level security/i,
    );
  });

  it("grants SELECT to authenticated/anon (non-secret metadata is readable)", () => {
    expect(MIGRATION_SQL).toMatch(
      /grant select on public\.whatsapp_provider_configs to authenticated, anon, service_role/i,
    );
  });

  it("grants INSERT/UPDATE/DELETE only to service_role (operator-managed)", () => {
    expect(MIGRATION_SQL).toMatch(
      /grant insert, update, delete on public\.whatsapp_provider_configs to service_role/i,
    );
  });

  it("has comment on table citing ADR-003", () => {
    expect(MIGRATION_SQL).toMatch(/ADR-003/i);
    expect(MIGRATION_SQL).toMatch(/NEVER stores secrets/i);
  });

  it("has updated_at trigger to keep timestamp fresh", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.touch_whatsapp_provider_configs_updated_at/i,
    );
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_whatsapp_provider_configs_touch/i,
    );
  });

  it("is wrapped in begin/commit transaction", () => {
    expect(MIGRATION_SQL).toMatch(/^begin;/m);
    expect(MIGRATION_SQL).toMatch(/^commit;/m);
  });
});
