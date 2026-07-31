-- RC3 Finance PR1: cash reconciliations (Z-report float / counted / variance / approval).
-- NEW vs pos_z_report_events: events are append-only confirm logs without draft/approve lifecycle.

begin;

create table if not exists public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  business_date date not null,
  register_id uuid,
  opening_float numeric(14, 2) not null default 0 check (opening_float >= 0),
  cash_sales numeric(14, 2) not null default 0 check (cash_sales >= 0),
  cash_refunds numeric(14, 2) not null default 0 check (cash_refunds >= 0),
  cash_drops numeric(14, 2) not null default 0 check (cash_drops >= 0),
  paid_out_expenses numeric(14, 2) not null default 0 check (paid_out_expenses >= 0),
  other_inflows numeric(14, 2) not null default 0 check (other_inflows >= 0),
  other_outflows numeric(14, 2) not null default 0 check (other_outflows >= 0),
  expected_cash numeric(14, 2) not null default 0,
  counted_cash numeric(14, 2),
  variance numeric(14, 2),
  closing_note text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'posted', 'voided')),
  prepared_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  z_report_event_id uuid references public.pos_z_report_events (id) on delete set null,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  posting_status text not null default 'not_applicable'
    check (posting_status in ('not_applicable', 'pending', 'posted', 'blocked', 'reversed')),
  posting_blocked_reason text,
  idempotency_key varchar(100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.cash_reconciliations is
  'Branch cash close with server-side expected_cash and variance. Immutable after approved except void/reopen via audit.';

comment on column public.cash_reconciliations.expected_cash is
  'Server-computed: opening_float + cash_sales - cash_refunds - cash_drops - paid_out_expenses + other_inflows - other_outflows.';

create unique index if not exists uq_cash_reconciliations_active_day
  on public.cash_reconciliations (
    branch_id,
    business_date,
    coalesce(register_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status not in ('voided');

create unique index if not exists uq_cash_reconciliations_idempotency
  on public.cash_reconciliations (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_cash_reconciliations_branch_date
  on public.cash_reconciliations (branch_id, business_date desc);
create index if not exists idx_cash_reconciliations_status
  on public.cash_reconciliations (status);
create index if not exists idx_cash_reconciliations_variance
  on public.cash_reconciliations (branch_id, status)
  where variance is not null and variance <> 0;

create table if not exists public.cash_reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  cash_reconciliation_id uuid not null references public.cash_reconciliations (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_cash_reconciliation_events_recon
  on public.cash_reconciliation_events (cash_reconciliation_id, created_at desc);

alter table public.cash_reconciliations enable row level security;
alter table public.cash_reconciliation_events enable row level security;

drop policy if exists "Staff select cash reconciliations" on public.cash_reconciliations;
create policy "Staff select cash reconciliations"
  on public.cash_reconciliations
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select cash reconciliation events" on public.cash_reconciliation_events;
create policy "Staff select cash reconciliation events"
  on public.cash_reconciliation_events
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.cash_reconciliations from public, anon, authenticated;
revoke all on public.cash_reconciliation_events from public, anon, authenticated;
grant select on public.cash_reconciliations to authenticated;
grant select on public.cash_reconciliation_events to authenticated;
grant all on public.cash_reconciliations to service_role;
grant all on public.cash_reconciliation_events to service_role;

-- Server-side expected cash + variance.
create or replace function public.compute_cash_reconciliation_totals(
  p_opening_float numeric,
  p_cash_sales numeric,
  p_cash_refunds numeric,
  p_cash_drops numeric,
  p_paid_out_expenses numeric,
  p_other_inflows numeric,
  p_other_outflows numeric,
  p_counted_cash numeric
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_expected numeric(14, 2);
  v_variance numeric(14, 2);
begin
  v_expected := round((
    coalesce(p_opening_float, 0)
    + coalesce(p_cash_sales, 0)
    - coalesce(p_cash_refunds, 0)
    - coalesce(p_cash_drops, 0)
    - coalesce(p_paid_out_expenses, 0)
    + coalesce(p_other_inflows, 0)
    - coalesce(p_other_outflows, 0)
  )::numeric, 2);

  if p_counted_cash is null then
    return jsonb_build_object(
      'expectedCash', v_expected,
      'variance', null
    );
  end if;

  v_variance := round((coalesce(p_counted_cash, 0) - v_expected)::numeric, 2);
  return jsonb_build_object(
    'expectedCash', v_expected,
    'variance', v_variance
  );
end;
$$;

revoke all on function public.compute_cash_reconciliation_totals(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.compute_cash_reconciliation_totals(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)
  to service_role;

commit;
