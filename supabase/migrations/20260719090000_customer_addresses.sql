-- =============================================================================
-- CP-1: Customer addresses (cloud source of truth)
-- CP-0 APPROVED: cloud SoT · one-time import · soft-archive · max 20 active
-- Fields: label, recipient, phone, line1/2, landmark, city, delivery_zone,
--         preferred_branch_id, is_default, status — no map coordinates
-- Forward-only. API uses service_role; RLS defends authenticated own-row access.
-- =============================================================================

begin;

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (label in ('Home', 'Office', 'Other')),
  recipient_name text not null default '',
  phone text not null default '',
  line1 text not null,
  line2 text not null default '',
  landmark text not null default '',
  area text not null default '',
  city text not null default 'Multan',
  delivery_zone text not null default '',
  preferred_branch_id uuid references public.branches (id) on delete set null,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_addresses_line1_nonempty check (char_length(trim(line1)) > 0)
);

comment on table public.customer_addresses is
  'CP-1 authenticated customer delivery addresses. Cloud SoT after import. No map coordinates.';

create unique index if not exists customer_addresses_one_default_per_user
  on public.customer_addresses (user_id)
  where is_default and status = 'active';

create index if not exists idx_customer_addresses_user_active
  on public.customer_addresses (user_id, status, created_at desc);

create index if not exists idx_customer_addresses_preferred_branch
  on public.customer_addresses (preferred_branch_id)
  where preferred_branch_id is not null;

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;

drop policy if exists customer_addresses_select_own on public.customer_addresses;
create policy customer_addresses_select_own
  on public.customer_addresses for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists customer_addresses_insert_own on public.customer_addresses;
create policy customer_addresses_insert_own
  on public.customer_addresses for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists customer_addresses_update_own on public.customer_addresses;
create policy customer_addresses_update_own
  on public.customer_addresses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists customer_addresses_delete_own on public.customer_addresses;
create policy customer_addresses_delete_own
  on public.customer_addresses for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.customer_addresses from anon, authenticated;
grant select, insert, update, delete on table public.customer_addresses to authenticated;
grant all on table public.customer_addresses to service_role;
revoke all on table public.customer_addresses from anon;

commit;
