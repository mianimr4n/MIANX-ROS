-- POS Z-Report shift-close audit (Asia/Karachi business day cash drawer summary).
-- Additive only.

begin;

create table if not exists public.pos_z_report_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  actor_user_id uuid references public.users (id) on delete set null,
  business_date date not null,
  timezone text not null default 'Asia/Karachi',
  total_orders integer not null check (total_orders >= 0),
  total_cash_sales numeric(12, 2) not null check (total_cash_sales >= 0),
  expected_cash numeric(12, 2) not null check (expected_cash >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_pos_z_report_events_branch_created
  on public.pos_z_report_events (branch_id, created_at desc);

comment on table public.pos_z_report_events is
  'POS shift-close / Z-Report confirmations. Amounts come from paid cash payments for the Karachi business day.';

alter table public.pos_z_report_events enable row level security;

revoke all on public.pos_z_report_events from public, anon, authenticated;
grant select on public.pos_z_report_events to authenticated;
grant all on public.pos_z_report_events to service_role;

commit;
