-- CP-5: Customer favorites (authenticated cloud). No map coordinates.
begin;

create table if not exists public.customer_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  menu_item_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint customer_favorites_code_nonempty check (char_length(trim(menu_item_code)) > 0),
  constraint customer_favorites_user_code_unique unique (user_id, menu_item_code)
);

create index if not exists idx_customer_favorites_user
  on public.customer_favorites (user_id, created_at desc);

alter table public.customer_favorites enable row level security;

drop policy if exists customer_favorites_select_own on public.customer_favorites;
create policy customer_favorites_select_own on public.customer_favorites
  for select to authenticated using (user_id = auth.uid());

drop policy if exists customer_favorites_insert_own on public.customer_favorites;
create policy customer_favorites_insert_own on public.customer_favorites
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists customer_favorites_delete_own on public.customer_favorites;
create policy customer_favorites_delete_own on public.customer_favorites
  for delete to authenticated using (user_id = auth.uid());

revoke all on table public.customer_favorites from anon, authenticated;
grant select, insert, delete on table public.customer_favorites to authenticated;
grant all on table public.customer_favorites to service_role;

commit;
