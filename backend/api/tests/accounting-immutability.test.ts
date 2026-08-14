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

// FU-1 fix migration (Issue #215)
const FU1_FIX_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260815000000_adr_011_fix_bypass_delete.sql",
);
const FU1_FIX_SQL_RAW = readFileSync(FU1_FIX_PATH, "utf8");

// Strip SQL line comments (-- to end of line) so regex assertions match the
// actual function body, not the comment block that documents the bug.
// Without this, a regex like `if v_bypass = 'on' then ... end if;` would
// match the commented-out "buggy code" block at the top of the migration
// instead of the real fix inside the function body.
const FU1_FIX_SQL = FU1_FIX_SQL_RAW.replace(/^[\t ]*--[^\n]*$/gm, "");

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

/**
 * FU-1 regression tests (Issue #215)
 *
 * Bug: enforce_journal_entry_immutability() returned `new` for the bypass=on
 * branch. For BEFORE DELETE triggers, `new` is NULL, and returning NULL from
 * a BEFORE DELETE trigger CANCELS the DELETE per PL/pgSQL semantics. So
 * `set local app.bypass_immutability = 'on'; delete from journal_entries ...`
 * silently failed — no error, no row removed.
 *
 * The sibling function enforce_journal_entry_line_immutability() already had
 * the correct pattern (returns `old` for DELETE-with-bypass). FU-1 fix
 * migration 20260815000000 makes the entry-level function consistent.
 *
 * These tests verify:
 *   1. The fix migration exists and is non-trivial.
 *   2. The fix migration redefines enforce_journal_entry_immutability() with
 *      the correct bypass-DELETE pattern (returns old for DELETE).
 *   3. The original buggy pattern (`return new` immediately after the bypass
 *      check, with no TG_OP guard) is NOT present in the fix migration.
 *   4. The fix migration preserves all other behavior (DELETE rejection
 *      without bypass, UPDATE rejection without bypass, posted->voided
 *      transition allowed without bypass).
 *   5. The fix migration is idempotent (uses `create or replace function`).
 *   6. The fix migration is wrapped in a transaction (begin/commit).
 */
describe("ADR-011 FU-1 fix — bypass_immutability DELETE bug (Issue #215)", () => {
  it("FU-1 fix migration file exists and is non-empty", () => {
    expect(FU1_FIX_SQL.length).toBeGreaterThan(500);
  });

  it("FU-1 fix migration redefines enforce_journal_entry_immutability", () => {
    expect(FU1_FIX_SQL).toMatch(
      /create or replace function public\.enforce_journal_entry_immutability\(\)/i,
    );
  });

  it("FU-1 fix: bypass branch returns OLD for DELETE (the actual fix)", () => {
    // The bug was: `if v_bypass = 'on' then return new; end if;`
    // The fix is:  `if v_bypass = 'on' then if (TG_OP = 'DELETE') then return old; end if; return new; end if;`
    // We assert the fix pattern is present.
    expect(FU1_FIX_SQL).toMatch(
      /if v_bypass = 'on' then\s+if\s*\(TG_OP = 'DELETE'\) then\s+return old;[\s\S]*?return new;/m,
    );
  });

  it("FU-1 fix: the OLD buggy 'return new' immediately after bypass check is gone", () => {
    // Extract the bypass branch body from the fix migration.
    // It MUST NOT be the bare `return new;` pattern (which was the bug).
    const bypassBranchMatch = FU1_FIX_SQL.match(
      /if v_bypass = 'on' then\s+([\s\S]*?)end if;/m,
    );
    expect(bypassBranchMatch).not.toBeNull();
    const bypassBranchBody = bypassBranchMatch![1];
    // The bypass branch must contain a TG_OP = 'DELETE' guard.
    expect(bypassBranchBody).toMatch(/TG_OP = 'DELETE'/);
    // The bypass branch must NOT be just `return new;` (the buggy form).
    // I.e., there must be more than just whitespace + `return new;` in the body.
    const stripped = bypassBranchBody.replace(/return new;\s*$/, "").trim();
    expect(stripped.length).toBeGreaterThan(0);
  });

  it("FU-1 fix: DELETE rejection (without bypass) still raises for posted entries", () => {
    // The bypass fix must not accidentally break the core immutability guarantee.
    expect(FU1_FIX_SQL).toMatch(/Cannot DELETE posted journal entry/);
  });

  it("FU-1 fix: UPDATE rejection (without bypass) still raises for posted entries", () => {
    expect(FU1_FIX_SQL).toMatch(/Cannot UPDATE posted journal entry fields/);
  });

  it("FU-1 fix: posted -> voided transition still allowed (reversal flow preserved)", () => {
    expect(FU1_FIX_SQL).toMatch(/posted.*voided|voided.*posted/s);
  });

  it("FU-1 fix: still references ADR-011 in comments", () => {
    // Use raw SQL (with comments) for comment-content checks.
    expect(FU1_FIX_SQL_RAW).toMatch(/ADR-011/);
  });

  it("FU-1 fix: comment mentions FU-1 + the bug being fixed", () => {
    // Forces future maintainers to see the bug context in the function comment.
    expect(FU1_FIX_SQL_RAW).toMatch(/FU-1/);
    expect(FU1_FIX_SQL_RAW).toMatch(/DELETE/i);
  });

  it("FU-1 fix: uses `create or replace function` (idempotent / safe to re-run)", () => {
    expect(FU1_FIX_SQL).toMatch(/create or replace function/i);
    // Must NOT drop the function first (would break if other objects depend on it).
    expect(FU1_FIX_SQL).not.toMatch(/drop function public\.enforce_journal_entry_immutability/i);
  });

  it("FU-1 fix: uses transaction wrapper (begin/commit)", () => {
    expect(FU1_FIX_SQL).toMatch(/^begin;/m);
    expect(FU1_FIX_SQL).toMatch(/^commit;/m);
  });

  it("FU-1 fix: does NOT touch the line-level immutability function (already correct)", () => {
    // The line-level function was already correct — the fix migration must
    // not redefine it. If it did, that would be a regression risk.
    expect(FU1_FIX_SQL).not.toMatch(
      /create or replace function public\.enforce_journal_entry_line_immutability/i,
    );
  });

  it("FU-1 fix: does NOT touch triggers (only redefines the function)", () => {
    // The trigger already points to public.enforce_journal_entry_immutability(),
    // so we only need to redefine the function — no trigger drop/recreate.
    expect(FU1_FIX_SQL).not.toMatch(/drop trigger/i);
    expect(FU1_FIX_SQL).not.toMatch(/create trigger/i);
  });

  it("FU-1 fix: migration filename uses correct timestamp ordering (after 20260814180100)", () => {
    // The fix migration must sort AFTER the original ADR-011 migration.
    // 20260815000000 > 20260814180100, so this is satisfied.
    expect(FU1_FIX_PATH).toMatch(/20260815000000_adr_011_fix_bypass_delete\.sql$/);
  });
});
