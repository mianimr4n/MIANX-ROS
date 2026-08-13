/**
 * Tests for ADR-011 — Accounting Immutability (TypeScript-side guards)
 *
 * The SQL triggers (in migration 20260814180100) enforce immutability at the
 * database layer. These tests verify the SQL migration itself is well-formed
 * by parsing it. Full integration tests requiring a live Postgres instance
 * live in the e2e suite.
 *
 * Authority: ADR-011 "Accounting Immutability & Double-Entry Reversals"
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Tests run from backend/api/ directory; migrations live at repo root.
const REPO_ROOT = resolve(__dirname, "../../..");
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260814180100_adr_011_accounting_immutability.sql",
);

const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("ADR-011 — Accounting Immutability migration", () => {
  it("migration file exists and is non-empty", () => {
    expect(MIGRATION_SQL.length).toBeGreaterThan(500);
  });

  it("creates enforce_journal_entry_immutability function", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.enforce_journal_entry_immutability\(\)/i,
    );
  });

  it("creates enforce_journal_entry_line_immutability function", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.enforce_journal_entry_line_immutability\(\)/i,
    );
  });

  it("attaches trigger trg_journal_entry_immutability to journal_entries", () => {
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_journal_entry_immutability\s+before update or delete on public\.journal_entries/i,
    );
  });

  it("attaches trigger trg_journal_entry_line_immutability to journal_entry_lines", () => {
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_journal_entry_line_immutability\s+before update or delete on public\.journal_entry_lines/i,
    );
  });

  it("blocks DELETE of posted entries", () => {
    expect(MIGRATION_SQL).toMatch(/Cannot DELETE posted journal entry/);
  });

  it("blocks UPDATE of posted entry content fields", () => {
    expect(MIGRATION_SQL).toMatch(/Cannot UPDATE posted journal entry fields/);
  });

  it("allows posted -> voided transition (reversal flow)", () => {
    // The trigger must explicitly permit this transition for the existing
    // reverse_journal_entry_atomic RPC to continue working.
    expect(MIGRATION_SQL).toMatch(/posted.*voided|voided.*posted/s);
  });

  it("supports bypass flag for trusted RPCs", () => {
    expect(MIGRATION_SQL).toMatch(/app\.bypass_immutability/);
    expect(MIGRATION_SQL).toMatch(/v_bypass := current_setting\('app\.bypass_immutability', true\)/);
  });

  it("blocks UPDATE/DELETE on lines of posted AND voided entries", () => {
    expect(MIGRATION_SQL).toMatch(/v_entry_status in \('posted', 'voided'\)/);
  });

  it("references ADR-011 in comments", () => {
    expect(MIGRATION_SQL).toMatch(/ADR-011/);
  });

  it("uses transaction wrapper (begin/commit)", () => {
    expect(MIGRATION_SQL).toMatch(/^begin;/m);
    expect(MIGRATION_SQL).toMatch(/^commit;/m);
  });

  it("does NOT redefine reverse_journal_entry_atomic (preserves existing RPC)", () => {
    // The existing RPC was created in migration 20260731040000.
    // Our migration must not redefine it — only add the immutability guard.
    expect(MIGRATION_SQL).not.toMatch(
      /create or replace function public\.reverse_journal_entry_atomic/i,
    );
  });

  it("does NOT add new columns (existing reversed_by_journal_id is reused)", () => {
    // Existing schema already has reversed_by_journal_id and reverses_journal_id.
    // Our migration must not re-add them (would cause duplicate column errors).
    expect(MIGRATION_SQL).not.toMatch(/alter table public\.journal_entries\s+add column/i);
  });
});

describe("ADR-011 — Reversal flow integration with existing RPC", () => {
  it("existing reverse_journal_entry_atomic migration exists", () => {
    const existingPath = resolve(
      REPO_ROOT,
      "supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql",
    );
    const existingSql = readFileSync(existingPath, "utf8");
    expect(existingSql).toMatch(/create or replace function public\.reverse_journal_entry_atomic/i);
  });

  it("existing RPC marks original entry as voided (allowed by our trigger)", () => {
    const existingPath = resolve(
      REPO_ROOT,
      "supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql",
    );
    const existingSql = readFileSync(existingPath, "utf8");
    // The existing RPC does: UPDATE journal_entries SET status = 'voided' ...
    expect(existingSql).toMatch(/status\s*=\s*'voided'/);
  });

  it("existing RPC uses reversed_by_journal_id (existing column, not added by us)", () => {
    const existingPath = resolve(
      REPO_ROOT,
      "supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql",
    );
    const existingSql = readFileSync(existingPath, "utf8");
    expect(existingSql).toMatch(/reversed_by_journal_id/);
    expect(existingSql).toMatch(/reverses_journal_id/);
  });
});
