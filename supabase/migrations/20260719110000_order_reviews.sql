-- CP-6: Order reviews — one per completed order owned by the authenticated customer.
begin;

create table if not exists public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'flagged')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint order_reviews_one_per_order unique (order_id)
);

create index if not exists idx_order_reviews_auth_user
  on public.order_reviews (auth_user_id, created_at desc);

drop trigger if exists set_order_reviews_updated_at on public.order_reviews;
create trigger set_order_reviews_updated_at
before update on public.order_reviews
for each row execute function public.set_updated_at();

alter table public.order_reviews enable row level security;

drop policy if exists order_reviews_select_own on public.order_reviews;
create policy order_reviews_select_own on public.order_reviews
  for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists order_reviews_insert_own on public.order_reviews;
create policy order_reviews_insert_own on public.order_reviews
  for insert to authenticated
  with check (
    auth_user_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.auth_user_id = auth.uid()
        and o.status = 'completed'
    )
  );

drop policy if exists order_reviews_update_own on public.order_reviews;
create policy order_reviews_update_own on public.order_reviews
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.auth_user_id = auth.uid()
        and o.status = 'completed'
    )
  );

revoke all on table public.order_reviews from anon, authenticated;
grant select, insert, update on table public.order_reviews to authenticated;
grant all on table public.order_reviews to service_role;

comment on table public.order_reviews is
  'CP-6 customer order reviews. Insert/update only for owned completed orders via RLS.';

commit;
