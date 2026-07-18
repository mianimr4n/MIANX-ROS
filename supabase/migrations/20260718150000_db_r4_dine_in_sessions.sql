-- =============================================================================
-- DB-R4: Dine-in sessions & order linkage
-- Forward-only. REQUIRES DB-R3 (restaurant_tables) applied first.
-- Production apply of this migration MUST wait until R3 is applied.
-- Aligns with DINE-IN-TABLE-QR-ARCHITECTURE + owner statuses (open|ordering|…).
-- Does NOT: kitchen/POS (R5/R6), UI, force-require session on all dine-in rows.
--
-- Legacy dine-in CHECK approach (phased):
--   delivery/pickup → session + table MUST be NULL
--   dine-in → (both NULL) OR (both NOT NULL) — legacy website rows without
--             session remain valid until owner cutover gate.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) dine_in_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.dine_in_sessions (
  id uuid primary key default gen_random_uuid(),
  -- SHA-256 hex only; NEVER store plaintext public tokens
  public_token_hash text,
  branch_id uuid not null references public.branches (id) on delete restrict,
  restaurant_table_id uuid not null references public.restaurant_tables (id) on delete restrict,
  status text not null default 'open' check (
    status in ('open', 'ordering', 'billed', 'paid', 'closed', 'cancelled')
  ),
  guest_count integer check (guest_count is null or guest_count > 0),
  opened_by_user_id uuid references public.users (id) on delete set null,
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_dine_in_sessions_public_token_hash unique (public_token_hash)
);

-- One active session per table (owner: open|ordering).
create unique index if not exists uq_dine_in_sessions_one_active_per_table
  on public.dine_in_sessions (restaurant_table_id)
  where status in ('open', 'ordering');

create index if not exists idx_dine_in_sessions_branch_id
  on public.dine_in_sessions (branch_id);

create index if not exists idx_dine_in_sessions_table_id
  on public.dine_in_sessions (restaurant_table_id);

create index if not exists idx_dine_in_sessions_branch_status
  on public.dine_in_sessions (branch_id, status);

drop trigger if exists set_dine_in_sessions_updated_at on public.dine_in_sessions;
create trigger set_dine_in_sessions_updated_at
before update on public.dine_in_sessions
for each row execute function public.set_updated_at();

comment on table public.dine_in_sessions is
  'Dine-in table sessions. Public identity via public_token_hash (SHA-256) only.';
comment on column public.dine_in_sessions.public_token_hash is
  'SHA-256 hex of opaque public session token. Never store or log plaintext.';

-- ---------------------------------------------------------------------------
-- 2) Branch match: session.branch_id must equal restaurant_tables.branch_id
-- ---------------------------------------------------------------------------

create or replace function public.enforce_dine_in_session_branch_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  table_branch_id uuid;
begin
  select t.branch_id into table_branch_id
  from public.restaurant_tables t
  where t.id = new.restaurant_table_id;

  if table_branch_id is null then
    raise exception 'restaurant_table_id % not found', new.restaurant_table_id
      using errcode = '23503';
  end if;

  if new.branch_id is distinct from table_branch_id then
    raise exception 'dine_in_sessions.branch_id must match restaurant_tables.branch_id'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dine_in_sessions_branch_match on public.dine_in_sessions;
create trigger trg_dine_in_sessions_branch_match
before insert or update of branch_id, restaurant_table_id
on public.dine_in_sessions
for each row execute function public.enforce_dine_in_session_branch_match();

revoke all on function public.enforce_dine_in_session_branch_match() from public, anon;
grant execute on function public.enforce_dine_in_session_branch_match() to service_role;

-- ---------------------------------------------------------------------------
-- 3) orders extensions (forward-only nullable)
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists dine_in_session_id uuid
    references public.dine_in_sessions (id) on delete set null;

alter table public.orders
  add column if not exists restaurant_table_id uuid
    references public.restaurant_tables (id) on delete set null;

alter table public.orders
  add column if not exists table_display_snapshot text;

create index if not exists idx_orders_dine_in_session_id
  on public.orders (dine_in_session_id)
  where dine_in_session_id is not null;

create index if not exists idx_orders_restaurant_table_id
  on public.orders (restaurant_table_id)
  where restaurant_table_id is not null;

comment on column public.orders.dine_in_session_id is
  'FK to dine_in_sessions for QR/POS dine-in. Nullable for legacy website dine-in until cutover.';
comment on column public.orders.restaurant_table_id is
  'FK to restaurant_tables for dine-in. Nullable for legacy website dine-in until cutover.';
comment on column public.orders.table_display_snapshot is
  'Frozen table label at order create for receipts/history.';

-- Phased CHECK: delivery/pickup forbid linkage; dine-in allows both-null (legacy)
-- or both-set (QR/POS path). Prefer this over forcing all dine-in to bind yet.
alter table public.orders drop constraint if exists chk_orders_dine_in_linkage;
alter table public.orders
  add constraint chk_orders_dine_in_linkage check (
    (
      order_type in ('delivery', 'pickup')
      and dine_in_session_id is null
      and restaurant_table_id is null
    )
    or (
      order_type = 'dine-in'
      and (
        (dine_in_session_id is null and restaurant_table_id is null)
        or (dine_in_session_id is not null and restaurant_table_id is not null)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4) RLS — staff branch SELECT/UPDATE; no anon; guests via API only
-- ---------------------------------------------------------------------------

alter table public.dine_in_sessions enable row level security;

drop policy if exists "Staff select branch dine-in sessions" on public.dine_in_sessions;
create policy "Staff select branch dine-in sessions"
on public.dine_in_sessions
for select
to authenticated
using (
  public.current_user_has_branch_access(branch_id)
);

drop policy if exists "Staff update branch dine-in sessions" on public.dine_in_sessions;
create policy "Staff update branch dine-in sessions"
on public.dine_in_sessions
for update
to authenticated
using (
  public.current_user_has_branch_access(branch_id)
)
with check (
  public.current_user_has_branch_access(branch_id)
);

-- No authenticated INSERT/DELETE — API uses service_role for session create.
-- No anon policies — public resolve is API-only.
-- Super-admin covered via current_user_has_branch_access → current_user_is_super_admin.

-- ---------------------------------------------------------------------------
-- 5) Grants (post-R0): no broad client DML; hash column not readable by clients
-- ---------------------------------------------------------------------------

revoke all on table public.dine_in_sessions from anon, authenticated;

grant select, update on table public.dine_in_sessions to authenticated;
-- Prevent PostgREST/client leakage of session token hashes even when SELECT is allowed.
revoke select (public_token_hash) on table public.dine_in_sessions from authenticated;

grant select, insert, update, delete on table public.dine_in_sessions to service_role;

commit;
