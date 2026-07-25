/**
 * D3 — Floor plan, dine-in, and reservation migration contract (static).
 * Live rollback/concurrency assertions run in backend/api/tests/*.d3.test.ts
 * against local Supabase when the stack is available.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260725100000_d3_floor_dinein_reservations.sql"),
  "utf8",
);
const posLink = readFileSync(
  resolve("supabase/migrations/20260725101000_d3_pos_dinein_order_link.sql"),
  "utf8",
);

describe("D3 floor / dine-in / reservations migration", () => {
  it("creates the branch-scoped floor and area models", () => {
    assert.match(migration, /create table if not exists public\.restaurant_floors/);
    assert.match(migration, /create table if not exists public\.service_areas/);
    // unique branch + code
    assert.match(migration, /unique\s*\(branch_id, code\)/);
  });

  it("extends restaurant_tables with layout, capacity, and operational status", () => {
    for (const col of [
      "floor_id",
      "service_area_id",
      "capacity_min",
      "capacity_max",
      "position_x",
      "position_y",
      "rotation",
      "is_accessible",
      "high_chair_supported",
      "operational_status",
    ]) {
      assert.match(migration, new RegExp(`add column if not exists ${col}`), col);
    }
    // canonical operational statuses
    for (const status of [
      "available",
      "reserved",
      "occupied",
      "ordering",
      "served",
      "bill_requested",
      "payment_pending",
      "cleaning",
      "blocked",
      "out_of_service",
    ]) {
      assert.match(migration, new RegExp(`'${status}'`), status);
    }
  });

  it("enforces same-branch consistency with triggers", () => {
    assert.match(migration, /enforce_service_area_branch_match/);
    assert.match(migration, /enforce_restaurant_table_branch_match/);
    assert.match(migration, /must belong to the same branch/);
  });

  it("creates table combinations with a join table", () => {
    assert.match(migration, /create table if not exists public\.table_combinations/);
    assert.match(migration, /create table if not exists public\.table_combination_members/);
  });

  it("creates booking policies and blackouts", () => {
    assert.match(migration, /create table if not exists public\.branch_booking_policies/);
    assert.match(migration, /create table if not exists public\.service_blackouts/);
  });

  it("creates reservations with number sequence and status constraints", () => {
    assert.match(migration, /create table if not exists public\.reservations/);
    assert.match(migration, /next_reservation_number/);
    for (const status of [
      "inquiry",
      "pending",
      "confirmed",
      "arrived",
      "seated",
      "completed",
      "cancelled",
      "no_show",
      "declined",
    ]) {
      assert.match(migration, new RegExp(`'${status}'`), status);
    }
  });

  it("prevents double booking at the database level (GiST exclusion)", () => {
    assert.match(migration, /create extension if not exists btree_gist/);
    assert.match(migration, /create table if not exists public\.reservation_table_assignments/);
    assert.match(migration, /exclude using gist/i);
    assert.match(migration, /tstzrange/);
  });

  it("creates waitlist entries with canonical statuses", () => {
    assert.match(migration, /create table if not exists public\.waitlist_entries/);
    for (const status of ["waiting", "notified", "arrived", "seated", "cancelled", "left", "expired"]) {
      assert.match(migration, new RegExp(`'${status}'`), status);
    }
  });

  it("extends dine_in_sessions and creates session table/server assignments", () => {
    assert.match(migration, /alter table public\.dine_in_sessions/);
    assert.match(migration, /session_number/);
    assert.match(migration, /service_status/);
    assert.match(migration, /create table if not exists public\.dining_session_tables/);
    assert.match(migration, /create table if not exists public\.dining_session_servers/);
    assert.match(migration, /next_dining_session_number/);
  });

  it("creates the communications outbox and audit trail", () => {
    assert.match(migration, /create table if not exists public\.reservation_communications/);
    assert.match(migration, /create table if not exists public\.table_service_audit/);
  });

  it("defines the four atomic RPCs", () => {
    assert.match(migration, /create or replace function public\.create_reservation_atomic/);
    assert.match(migration, /create or replace function public\.seat_party_atomic/);
    assert.match(migration, /create or replace function public\.transfer_session_tables_atomic/);
    assert.match(migration, /create or replace function public\.close_dining_session_atomic/);
  });

  it("implements idempotency for reservation creation", () => {
    assert.match(migration, /idempotency_key/);
    assert.match(migration, /idempotency_request_hash/);
    assert.match(migration, /IDEMPOTENCY_CONFLICT/);
  });

  it("uses row locks for seating and transfer concurrency", () => {
    assert.match(migration, /for update/i);
    assert.match(migration, /TABLE_NOT_AVAILABLE|TABLE_OCCUPIED|RESERVATION_TABLE_CONFLICT/);
  });

  it("blocks seating on inactive/out-of-service tables and cross-branch tables", () => {
    assert.match(migration, /TABLE_NOT_IN_BRANCH|TABLE_BRANCH_MISMATCH/);
    assert.match(migration, /TABLE_INACTIVE|TABLE_NOT_AVAILABLE/);
  });

  it("seeds D3 permissions and roles without inventing production data", () => {
    for (const code of ["floor.manage", "reservation.read", "reservation.manage", "dinein.manage"]) {
      assert.match(migration, new RegExp(code.replace(".", "\\.")), code);
    }
    assert.match(migration, /'host'/);
    assert.match(migration, /'waiter'/);
    // no fabricated production rows: the migration must not seed floors,
    // tables, or waitlist entries (RPC bodies insert at runtime, not seed data)
    assert.doesNotMatch(migration, /insert into public\.restaurant_floors/i);
    assert.doesNotMatch(migration, /insert into public\.service_areas/i);
    assert.doesNotMatch(migration, /insert into public\.table_combinations\b/i);
  });

  it("keeps RPCs service_role-only", () => {
    assert.match(migration, /revoke all on function public\.create_reservation_atomic/);
    assert.match(migration, /revoke all on function public\.seat_party_atomic/);
    assert.match(migration, /grant execute on function public\.create_reservation_atomic[\s\S]*?to service_role/);
  });

  it("documents rollback notes without dropping business tables", () => {
    assert.match(migration, /Rollback/i);
    assert.doesNotMatch(migration, /drop table public\.restaurant_tables/i);
    assert.doesNotMatch(migration, /drop table public\.dine_in_sessions/i);
  });
});

describe("D3 POS dine-in order link migration", () => {
  it("recreates create_order_atomic with a dine-in parameter", () => {
    assert.match(posLink, /drop function if exists public\.create_order_atomic/);
    assert.match(posLink, /create or replace function public\.create_order_atomic/);
    assert.match(posLink, /p_dine_in/);
  });

  it("validates the dining session before linking", () => {
    assert.match(posLink, /DINE_IN_SESSION_NOT_FOUND/);
    assert.match(posLink, /DINE_IN_SESSION_BRANCH_MISMATCH/);
    assert.match(posLink, /DINE_IN_SESSION_NOT_ACTIVE/);
  });

  it("updates session progress and table status on first order", () => {
    assert.match(posLink, /first_order_at/);
    assert.match(posLink, /ordering/);
  });
});
