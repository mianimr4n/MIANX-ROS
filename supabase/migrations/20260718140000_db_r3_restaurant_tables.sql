-- =============================================================================
-- DB-R3: Restaurant tables & secure QR token hashes
-- Forward-only. Aligns with DINE-IN-TABLE-QR-ARCHITECTURE (implementation field
-- names: capacity ≡ seats, floor_or_zone ≡ zone, qr_version ≡ qr_token_version).
-- Does NOT: dine_in_sessions (R4), public QR resolve API (R4), UI, seed invent
-- production table numbers.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) restaurant_tables
-- ---------------------------------------------------------------------------

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  table_number text not null,
  display_name text,
  capacity integer check (capacity is null or capacity > 0),
  floor_or_zone text,
  status text not null default 'available' check (
    status in ('available', 'occupied', 'reserved', 'inactive')
  ),
  -- SHA-256 hex only; NEVER store plaintext QR tokens
  qr_token_hash text,
  qr_version integer not null default 1 check (qr_version >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_restaurant_tables_branch_table_number unique (branch_id, table_number),
  constraint uq_restaurant_tables_qr_token_hash unique (qr_token_hash)
);

create index if not exists idx_restaurant_tables_branch_id
  on public.restaurant_tables (branch_id);

create index if not exists idx_restaurant_tables_branch_active
  on public.restaurant_tables (branch_id, is_active)
  where is_active = true;

drop trigger if exists set_restaurant_tables_updated_at on public.restaurant_tables;
create trigger set_restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.set_updated_at();

comment on table public.restaurant_tables is
  'Physical dine-in tables per branch. QR identity via qr_token_hash (SHA-256) only.';
comment on column public.restaurant_tables.qr_token_hash is
  'SHA-256 hex of opaque QR token. Never store or log plaintext.';
comment on column public.restaurant_tables.qr_version is
  'Incremented on token rotation; prior tokens fail closed after rotate.';

-- ---------------------------------------------------------------------------
-- 2) RLS — staff branch SELECT; no anon/customer; no client DML
-- ---------------------------------------------------------------------------

alter table public.restaurant_tables enable row level security;

drop policy if exists "Staff select branch restaurant tables" on public.restaurant_tables;
create policy "Staff select branch restaurant tables"
on public.restaurant_tables
for select
to authenticated
using (
  public.current_user_has_branch_access(branch_id)
);

-- No authenticated INSERT/UPDATE/DELETE policies — API uses service_role.
-- No anon policies — public QR resolve is API-only (R4).

-- ---------------------------------------------------------------------------
-- 3) Grants (post-R0): no broad client DML; hash column not readable by clients
-- ---------------------------------------------------------------------------

revoke all on table public.restaurant_tables from anon, authenticated;

grant select on table public.restaurant_tables to authenticated;
-- Prevent PostgREST/client leakage of QR hashes even when SELECT is allowed.
revoke select (qr_token_hash) on table public.restaurant_tables from authenticated;

grant select, insert, update, delete on table public.restaurant_tables to service_role;

commit;
