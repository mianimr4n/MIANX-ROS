/**
 * Tests for ADR-016 + ADR-017 — OTP + Phone-First Auth migration.
 *
 * Verifies the migration 20260821000000 creates all 4 tables with the
 * correct shape, all 8 functions, all RLS policies, and the otp.manage +
 * otp.read permissions. Uses parse-based assertions (no DB required).
 *
 * Authority: ADR-016 (OTP Verification Architecture)
 *           ADR-017 (Phone-First Auth & Session Handoff)
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260821000000_adr_016_017_otp.sql",
);

const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("ADR-016 + ADR-017 — OTP migration sanity", () => {
  it("migration file exists and is non-empty", () => {
    expect(MIGRATION_SQL.length).toBeGreaterThan(2000);
  });

  it("is wrapped in a single transaction (begin/commit)", () => {
    expect(MIGRATION_SQL).toMatch(/^begin;/im);
    expect(MIGRATION_SQL).toMatch(/^commit;/im);
  });

  it("references both ADRs in the header comment", () => {
    expect(MIGRATION_SQL).toMatch(/ADR-016/);
    expect(MIGRATION_SQL).toMatch(/ADR-017/);
  });

  it("references D11 hard rule (ordering number never used for OTP)", () => {
    expect(MIGRATION_SQL).toMatch(/D11/);
    expect(MIGRATION_SQL).toMatch(/0304-1110495/);
  });
});

describe("ADR-016 §1 — otp_requests table", () => {
  it("creates otp_requests table", () => {
    expect(MIGRATION_SQL).toMatch(/create table if not exists public\.otp_requests/i);
  });

  it("has phone_e164 NOT NULL column", () => {
    expect(MIGRATION_SQL).toMatch(/phone_e164 text not null/i);
  });

  it("has channel column with CHECK constraint", () => {
    expect(MIGRATION_SQL).toMatch(/channel text not null check \(channel in \('whatsapp', 'sms', 'email'\)\)/i);
  });

  it("has purpose column with CHECK constraint", () => {
    expect(MIGRATION_SQL).toMatch(/purpose text not null check \(purpose in \('customer_login', 'customer_register', 'phone_reverify', 'recovery'\)\)/i);
  });

  it("has otp_hash column (NOT NULL) — plaintext OTP NEVER stored", () => {
    expect(MIGRATION_SQL).toMatch(/otp_hash text not null/i);
  });

  it("has status column with state-machine CHECK", () => {
    expect(MIGRATION_SQL).toMatch(/status text not null default 'pending'/i);
    expect(MIGRATION_SQL).toMatch(/check \(status in \('pending', 'verified', 'failed', 'expired'\)\)/i);
  });

  it("has attempt_count column (default 0)", () => {
    expect(MIGRATION_SQL).toMatch(/attempt_count int not null default 0/i);
  });

  it("has issued_at + expires_at columns", () => {
    expect(MIGRATION_SQL).toMatch(/issued_at timestamptz not null default now\(\)/i);
    expect(MIGRATION_SQL).toMatch(/expires_at timestamptz not null/i);
  });

  it("has verified_at + resolved_at columns (nullable)", () => {
    expect(MIGRATION_SQL).toMatch(/verified_at timestamptz/i);
    expect(MIGRATION_SQL).toMatch(/resolved_at timestamptz/i);
  });

  it("has customer_id FK to customers (ON DELETE SET NULL)", () => {
    expect(MIGRATION_SQL).toMatch(/customer_id uuid references public\.customers \(id\) on delete set null/i);
  });

  it("has correlation_id column for ADR-012 tracing", () => {
    expect(MIGRATION_SQL).toMatch(/correlation_id uuid/i);
  });

  it("has the partial index for TTL (pending + expires_at)", () => {
    expect(MIGRATION_SQL).toMatch(/otp_requests_expires_at_idx/i);
    expect(MIGRATION_SQL).toMatch(/where status = 'pending'/i);
  });
});

describe("ADR-016 §1 — otp_attempts table", () => {
  it("creates otp_attempts table", () => {
    expect(MIGRATION_SQL).toMatch(/create table if not exists public\.otp_attempts/i);
  });

  it("has otp_request_id FK with ON DELETE RESTRICT (preserve audit)", () => {
    expect(MIGRATION_SQL).toMatch(/otp_request_id uuid not null references public\.otp_requests \(id\) on delete restrict/i);
  });

  it("has result column with CHECK constraint", () => {
    expect(MIGRATION_SQL).toMatch(/result text not null check \(result in \('success', 'wrong_otp', 'expired', 'already_used'\)\)/i);
  });

  it("has append-only triggers (UPDATE + DELETE blocked)", () => {
    expect(MIGRATION_SQL).toMatch(/enforce_otp_attempts_append_only/i);
    expect(MIGRATION_SQL).toMatch(/trg_otp_attempts_no_update/i);
    expect(MIGRATION_SQL).toMatch(/trg_otp_attempts_no_delete/i);
  });
});

describe("ADR-016 §1 — customer_phone_verifications table", () => {
  it("creates customer_phone_verifications table", () => {
    expect(MIGRATION_SQL).toMatch(/create table if not exists public\.customer_phone_verifications/i);
  });

  it("has UNIQUE on (customer_id, phone_e164)", () => {
    expect(MIGRATION_SQL).toMatch(/unique \(customer_id, phone_e164\)/i);
  });

  it("has is_primary boolean column (default false)", () => {
    expect(MIGRATION_SQL).toMatch(/is_primary boolean not null default false/i);
  });

  it("has the partial unique index for one primary per customer", () => {
    expect(MIGRATION_SQL).toMatch(/customer_phone_verifications_one_primary_idx/i);
    expect(MIGRATION_SQL).toMatch(/where is_primary = true/i);
  });
});

describe("ADR-017 §2 — auth_refresh_tokens table", () => {
  it("creates auth_refresh_tokens table", () => {
    expect(MIGRATION_SQL).toMatch(/create table if not exists public\.auth_refresh_tokens/i);
  });

  it("has auth_user_id FK to auth.users (ON DELETE CASCADE)", () => {
    expect(MIGRATION_SQL).toMatch(/auth_user_id uuid not null references auth\.users \(id\) on delete cascade/i);
  });

  it("has token_hash UNIQUE column (SHA-256 of plaintext)", () => {
    expect(MIGRATION_SQL).toMatch(/token_hash text not null unique/i);
  });

  it("has issued_at + expires_at columns", () => {
    expect(MIGRATION_SQL).toMatch(/issued_at timestamptz not null default now\(\)/i);
    expect(MIGRATION_SQL).toMatch(/expires_at timestamptz not null/i);
  });

  it("has revoked_at + revoke_reason columns", () => {
    expect(MIGRATION_SQL).toMatch(/revoked_at timestamptz/i);
    expect(MIGRATION_SQL).toMatch(/revoke_reason text check/i);
  });

  it("has CHECK consistency constraint (revoked_at iff revoke_reason)", () => {
    expect(MIGRATION_SQL).toMatch(/auth_refresh_tokens_revoked_consistency/i);
  });
});

describe("ADR-017 §4 — customers.last_login_at column", () => {
  it("adds the last_login_at column to customers", () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.customers\s+add column if not exists last_login_at timestamptz/i);
  });
});

describe("ADR-016 §2 — Functions", () => {
  it("defines expire_stale_otp_requests()", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.expire_stale_otp_requests\(\)/i);
    expect(MIGRATION_SQL).toMatch(/security definer/i);
  });

  it("defines purge_old_otp_records() — 90-day retention", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.purge_old_otp_records\(\)/i);
    expect(MIGRATION_SQL).toMatch(/interval '90 days'/i);
  });

  it("defines rotate_previous_pending_otps()", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.rotate_previous_pending_otps\(p_phone_e164 text\)/i);
    expect(MIGRATION_SQL).toMatch(/rotated_out_by_newer_otp/i);
  });

  it("defines mark_customer_phone_verified()", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.mark_customer_phone_verified\(/i);
    expect(MIGRATION_SQL).toMatch(/p_customer_id uuid/i);
    expect(MIGRATION_SQL).toMatch(/p_phone_e164 text/i);
    expect(MIGRATION_SQL).toMatch(/p_otp_request_id uuid/i);
  });

  it("defines revoke_refresh_token()", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.revoke_refresh_token\(/i);
  });

  it("defines revoke_all_user_refresh_tokens()", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.revoke_all_user_refresh_tokens\(/i);
  });

  it("defines count_otp_requests_by_phone() — rate-limit helper", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.count_otp_requests_by_phone\(/i);
    expect(MIGRATION_SQL).toMatch(/count_10min int/i);
    expect(MIGRATION_SQL).toMatch(/count_1hour int/i);
    expect(MIGRATION_SQL).toMatch(/count_1day int/i);
  });

  it("defines enforce_otp_attempts_append_only() trigger function", () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.enforce_otp_attempts_append_only\(\)/i);
  });
});

describe("ADR-016 §3 — RLS policies", () => {
  it("enables RLS on otp_requests", () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.otp_requests enable row level security/i);
  });

  it("enables RLS on otp_attempts", () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.otp_attempts enable row level security/i);
  });

  it("enables RLS on customer_phone_verifications", () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.customer_phone_verifications enable row level security/i);
  });

  it("enables RLS on auth_refresh_tokens", () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.auth_refresh_tokens enable row level security/i);
  });

  it("has service_all policy on otp_requests", () => {
    expect(MIGRATION_SQL).toMatch(/otp_requests_service_all/i);
  });

  it("has owner_select + owner_update policies on auth_refresh_tokens", () => {
    expect(MIGRATION_SQL).toMatch(/auth_refresh_tokens_owner_select/i);
    expect(MIGRATION_SQL).toMatch(/auth_refresh_tokens_owner_update/i);
  });

  it("uses the canonical user_roles table (NOT staff_assignments) in RLS policies", () => {
    expect(MIGRATION_SQL).toMatch(/public\.user_roles ur/i);
    expect(MIGRATION_SQL).not.toMatch(/staff_assignments/i);
  });
});

describe("ADR-016 §4 — Permissions", () => {
  it("seeds otp.manage permission", () => {
    expect(MIGRATION_SQL).toMatch(/'otp\.manage'/i);
  });

  it("seeds otp.read permission", () => {
    expect(MIGRATION_SQL).toMatch(/'otp\.read'/i);
  });

  it("grants otp.manage to super-admin only", () => {
    expect(MIGRATION_SQL).toMatch(/r\.code = 'super-admin' and p\.code = 'otp\.manage'/i);
  });

  it("grants otp.read to super-admin + customer-support", () => {
    expect(MIGRATION_SQL).toMatch(/r\.code in \('super-admin', 'customer-support'\) and p\.code = 'otp\.read'/i);
  });
});

describe("ADR-012 — Domain event mirror (conditional on emit_domain_event)", () => {
  it("has a DO block that checks for emit_domain_event existence", () => {
    expect(MIGRATION_SQL).toMatch(/do \$_\$/i);
    expect(MIGRATION_SQL).toMatch(/emit_domain_event/i);
  });

  it("mirrors OTP verified to customer.otp_verified event", () => {
    expect(MIGRATION_SQL).toMatch(/customer\.otp_verified/i);
  });

  it("mirrors refresh token revocation to auth.session_revoked event", () => {
    expect(MIGRATION_SQL).toMatch(/auth\.session_revoked/i);
  });
});
