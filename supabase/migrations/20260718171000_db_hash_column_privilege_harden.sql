-- =============================================================================
-- DB privilege harden: hash columns not readable via table-level SELECT
-- PostgreSQL: REVOKE SELECT (col) does NOT remove access when table-level
-- SELECT/UPDATE remains. Replace with explicit column GRANTs excluding hashes.
-- Forward-only. No schema redesign.
-- =============================================================================

begin;

-- restaurant_tables: authenticated SELECT without qr_token_hash
revoke all on table public.restaurant_tables from anon, authenticated;
grant select (
  id,
  branch_id,
  table_number,
  display_name,
  capacity,
  floor_or_zone,
  status,
  qr_version,
  is_active,
  created_at,
  updated_at
) on table public.restaurant_tables to authenticated;
grant select, insert, update, delete on table public.restaurant_tables to service_role;

-- dine_in_sessions: authenticated SELECT/UPDATE without public_token_hash
revoke all on table public.dine_in_sessions from anon, authenticated;
grant select (
  id,
  branch_id,
  restaurant_table_id,
  status,
  guest_count,
  opened_by_user_id,
  opened_at,
  closed_at,
  created_at,
  updated_at
) on table public.dine_in_sessions to authenticated;
grant update (
  id,
  branch_id,
  restaurant_table_id,
  status,
  guest_count,
  opened_by_user_id,
  opened_at,
  closed_at,
  created_at,
  updated_at
) on table public.dine_in_sessions to authenticated;
grant select, insert, update, delete on table public.dine_in_sessions to service_role;

commit;
