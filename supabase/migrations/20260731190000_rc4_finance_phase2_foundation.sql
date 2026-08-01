-- RC4-8 Finance Phase 2 foundation (additive).
-- AR, tax defs, periods, cash register, exceptions, BS/CF RPCs, expanded mappings.
-- No Production seed balances. No hardcoded tax rates.

begin;

-- ---------------------------------------------------------------------------
-- Expand account mapping purposes
-- ---------------------------------------------------------------------------
alter table public.finance_account_mappings
  drop constraint if exists finance_account_mappings_purpose_check;

alter table public.finance_account_mappings
  add constraint finance_account_mappings_purpose_check
  check (
    purpose in (
      'cash_on_hand',
      'cash_over_short',
      'ap_control',
      'bank_clearing',
      'expense_default',
      'ar_control',
      'sales_revenue',
      'sales_discounts',
      'output_tax',
      'refunds',
      'inventory_asset',
      'cogs',
      'cash_flow_operating',
      'cash_flow_investing',
      'cash_flow_financing'
    )
    or purpose like 'expense_category:%'
  );

comment on constraint finance_account_mappings_purpose_check on public.finance_account_mappings is
  'RC4-8 expands posting purposes for AR/sales/tax/COGS/cash-flow classification.';

-- ---------------------------------------------------------------------------
-- Tax definitions (configurable; no seeded rates)
-- ---------------------------------------------------------------------------
create table if not exists public.tax_definitions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  tax_code varchar(40) not null,
  description text not null default '',
  rate numeric(9, 6) not null check (rate >= 0 and rate <= 1),
  tax_basis text not null default 'exclusive'
    check (tax_basis in ('exclusive', 'inclusive')),
  classification text not null default 'output'
    check (classification in ('input', 'output')),
  effective_from date not null default (timezone('Asia/Karachi', now()))::date,
  effective_to date,
  is_active boolean not null default true,
  payable_account_id uuid references public.chart_of_accounts (id) on delete restrict,
  receivable_account_id uuid references public.chart_of_accounts (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, tax_code)
);

comment on table public.tax_definitions is
  'Configurable tax codes. Empty until configured — never invent jurisdiction rates.';

create index if not exists idx_tax_definitions_branch on public.tax_definitions (branch_id);
create index if not exists idx_tax_definitions_active on public.tax_definitions (is_active, effective_from);

-- ---------------------------------------------------------------------------
-- Accounts receivable
-- ---------------------------------------------------------------------------
create table if not exists public.customer_invoices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  customer_id uuid,
  source_order_id uuid references public.orders (id) on delete set null,
  invoice_number varchar(64) not null,
  issue_date date,
  due_date date,
  currency text not null default 'PKR',
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(14, 2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  balance_due numeric(14, 2) not null default 0,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CREDITED')),
  tax_definition_id uuid references public.tax_definitions (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  void_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, invoice_number)
);

create table if not exists public.customer_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.customer_invoices (id) on delete cascade,
  description text not null,
  quantity numeric(14, 4) not null default 1 check (quantity > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  line_subtotal numeric(14, 2) not null default 0 check (line_subtotal >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  line_total numeric(14, 2) not null default 0 check (line_total >= 0),
  sort_order integer not null default 0
);

create table if not exists public.customer_receipts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  customer_id uuid,
  received_date date not null default (timezone('Asia/Karachi', now()))::date,
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'bank', 'card', 'other')),
  amount numeric(14, 2) not null check (amount > 0),
  unapplied_amount numeric(14, 2) not null default 0 check (unapplied_amount >= 0),
  reference text,
  status text not null default 'posted'
    check (status in ('draft', 'posted', 'reversed')),
  created_by uuid references public.users (id) on delete set null,
  idempotency_key text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.customer_receipts (id) on delete cascade,
  invoice_id uuid not null references public.customer_invoices (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (receipt_id, invoice_id)
);

create table if not exists public.customer_credit_notes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  invoice_id uuid references public.customer_invoices (id) on delete restrict,
  credit_number varchar(64) not null,
  reason text not null,
  issue_date date not null default (timezone('Asia/Karachi', now()))::date,
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  status text not null default 'ISSUED'
    check (status in ('DRAFT', 'ISSUED', 'VOID')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, credit_number)
);

create index if not exists idx_customer_invoices_branch_status
  on public.customer_invoices (branch_id, status);
create index if not exists idx_customer_invoices_due
  on public.customer_invoices (due_date) where status in ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE');
create index if not exists idx_customer_receipts_branch
  on public.customer_receipts (branch_id, received_date desc);
create index if not exists idx_customer_receipt_alloc_invoice
  on public.customer_receipt_allocations (invoice_id);

-- ---------------------------------------------------------------------------
-- Period controls
-- ---------------------------------------------------------------------------
create table if not exists public.finance_periods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'open'
    check (status in ('open', 'soft_closed', 'closed')),
  label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (period_end >= period_start),
  unique (branch_id, period_start, period_end)
);

create table if not exists public.finance_period_events (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.finance_periods (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  from_status text,
  to_status text not null,
  reason text,
  request_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_finance_periods_branch on public.finance_periods (branch_id, period_start);

-- ---------------------------------------------------------------------------
-- Bank / cash register depth (no bank-provider integration)
-- ---------------------------------------------------------------------------
create table if not exists public.finance_cash_accounts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  kind text not null check (kind in ('cash', 'bank')),
  name varchar(120) not null,
  account_id uuid not null references public.chart_of_accounts (id) on delete restrict,
  opening_balance numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, name)
);

create table if not exists public.finance_cash_register_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  cash_account_id uuid not null references public.finance_cash_accounts (id) on delete restrict,
  counterparty_cash_account_id uuid references public.finance_cash_accounts (id) on delete restrict,
  entry_type text not null
    check (entry_type in ('deposit', 'withdrawal', 'transfer')),
  entry_date date not null default (timezone('Asia/Karachi', now()))::date,
  amount numeric(14, 2) not null check (amount > 0),
  statement_reference text,
  reconciliation_status text not null default 'unreconciled'
    check (reconciliation_status in ('unreconciled', 'reconciled', 'excluded')),
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_finance_cash_register_branch_date
  on public.finance_cash_register_entries (branch_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- Finance exceptions queue
-- ---------------------------------------------------------------------------
create table if not exists public.finance_exceptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  exception_type text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'ignored')),
  source_module text,
  source_id uuid,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create index if not exists idx_finance_exceptions_open
  on public.finance_exceptions (status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.tax_definitions enable row level security;
alter table public.customer_invoices enable row level security;
alter table public.customer_invoice_lines enable row level security;
alter table public.customer_receipts enable row level security;
alter table public.customer_receipt_allocations enable row level security;
alter table public.customer_credit_notes enable row level security;
alter table public.finance_periods enable row level security;
alter table public.finance_period_events enable row level security;
alter table public.finance_cash_accounts enable row level security;
alter table public.finance_cash_register_entries enable row level security;
alter table public.finance_exceptions enable row level security;

drop policy if exists "Staff select tax_definitions" on public.tax_definitions;
create policy "Staff select tax_definitions" on public.tax_definitions
  for select to authenticated
  using (branch_id is null or public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select customer_invoices" on public.customer_invoices;
create policy "Staff select customer_invoices" on public.customer_invoices
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select customer_invoice_lines" on public.customer_invoice_lines;
create policy "Staff select customer_invoice_lines" on public.customer_invoice_lines
  for select to authenticated
  using (exists (
    select 1 from public.customer_invoices i
    where i.id = invoice_id and public.current_user_has_branch_access(i.branch_id)
  ));

drop policy if exists "Staff select customer_receipts" on public.customer_receipts;
create policy "Staff select customer_receipts" on public.customer_receipts
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select customer_receipt_allocations" on public.customer_receipt_allocations;
create policy "Staff select customer_receipt_allocations" on public.customer_receipt_allocations
  for select to authenticated
  using (exists (
    select 1 from public.customer_receipts r
    where r.id = receipt_id and public.current_user_has_branch_access(r.branch_id)
  ));

drop policy if exists "Staff select customer_credit_notes" on public.customer_credit_notes;
create policy "Staff select customer_credit_notes" on public.customer_credit_notes
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select finance_periods" on public.finance_periods;
create policy "Staff select finance_periods" on public.finance_periods
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select finance_period_events" on public.finance_period_events;
create policy "Staff select finance_period_events" on public.finance_period_events
  for select to authenticated
  using (exists (
    select 1 from public.finance_periods p
    where p.id = period_id and public.current_user_has_branch_access(p.branch_id)
  ));

drop policy if exists "Staff select finance_cash_accounts" on public.finance_cash_accounts;
create policy "Staff select finance_cash_accounts" on public.finance_cash_accounts
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select finance_cash_register_entries" on public.finance_cash_register_entries;
create policy "Staff select finance_cash_register_entries" on public.finance_cash_register_entries
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select finance_exceptions" on public.finance_exceptions;
create policy "Staff select finance_exceptions" on public.finance_exceptions
  for select to authenticated
  using (branch_id is null or public.current_user_has_branch_access(branch_id));

revoke all on public.tax_definitions from public, anon, authenticated;
revoke all on public.customer_invoices from public, anon, authenticated;
revoke all on public.customer_invoice_lines from public, anon, authenticated;
revoke all on public.customer_receipts from public, anon, authenticated;
revoke all on public.customer_receipt_allocations from public, anon, authenticated;
revoke all on public.customer_credit_notes from public, anon, authenticated;
revoke all on public.finance_periods from public, anon, authenticated;
revoke all on public.finance_period_events from public, anon, authenticated;
revoke all on public.finance_cash_accounts from public, anon, authenticated;
revoke all on public.finance_cash_register_entries from public, anon, authenticated;
revoke all on public.finance_exceptions from public, anon, authenticated;

grant select on public.tax_definitions to authenticated;
grant select on public.customer_invoices to authenticated;
grant select on public.customer_invoice_lines to authenticated;
grant select on public.customer_receipts to authenticated;
grant select on public.customer_receipt_allocations to authenticated;
grant select on public.customer_credit_notes to authenticated;
grant select on public.finance_periods to authenticated;
grant select on public.finance_period_events to authenticated;
grant select on public.finance_cash_accounts to authenticated;
grant select on public.finance_cash_register_entries to authenticated;
grant select on public.finance_exceptions to authenticated;

grant all on public.tax_definitions to service_role;
grant all on public.customer_invoices to service_role;
grant all on public.customer_invoice_lines to service_role;
grant all on public.customer_receipts to service_role;
grant all on public.customer_receipt_allocations to service_role;
grant all on public.customer_credit_notes to service_role;
grant all on public.finance_periods to service_role;
grant all on public.finance_period_events to service_role;
grant all on public.finance_cash_accounts to service_role;
grant all on public.finance_cash_register_entries to service_role;
grant all on public.finance_exceptions to service_role;

-- ---------------------------------------------------------------------------
-- Period gate helper
-- ---------------------------------------------------------------------------
create or replace function public.finance_assert_period_allows_posting(
  p_branch_id uuid,
  p_entry_date date
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.finance_periods
  where branch_id = p_branch_id
    and p_entry_date between period_start and period_end
  order by
    case status when 'closed' then 1 when 'soft_closed' then 2 else 3 end
  limit 1;

  if v_status = 'closed' then
    raise exception 'FINANCE_PERIOD_CLOSED';
  end if;
end;
$$;

revoke all on function public.finance_assert_period_allows_posting(uuid, date) from public, anon, authenticated;
grant execute on function public.finance_assert_period_allows_posting(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- Balance Sheet (dynamic from posted journals)
-- ---------------------------------------------------------------------------
create or replace function public.finance_balance_sheet(
  p_branch_id uuid,
  p_as_of date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_as_of date := coalesce(p_as_of, (timezone('Asia/Karachi', now()))::date);
  v_assets numeric(14, 2) := 0;
  v_liabilities numeric(14, 2) := 0;
  v_equity numeric(14, 2) := 0;
  v_revenue numeric(14, 2) := 0;
  v_expense numeric(14, 2) := 0;
  v_current_earnings numeric(14, 2) := 0;
  v_rows jsonb := '[]'::jsonb;
begin
  if p_branch_id is null then
    raise exception 'BRANCH_ID_REQUIRED';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.account_code), '[]'::jsonb)
  into v_rows
  from (
    select
      a.id as account_id,
      a.account_code,
      a.account_name,
      a.account_type,
      coalesce(sum(l.debit), 0) as total_debit,
      coalesce(sum(l.credit), 0) as total_credit,
      case
        when a.account_type in ('ASSET', 'EXPENSE')
          then coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0)
        else coalesce(sum(l.credit), 0) - coalesce(sum(l.debit), 0)
      end as balance
    from public.chart_of_accounts a
    left join public.journal_entry_lines l on l.account_id = a.id
    left join public.journal_entries e
      on e.id = l.journal_entry_id
     and e.status = 'posted'
     and e.branch_id = p_branch_id
     and e.entry_date <= v_as_of
    where a.branch_id = p_branch_id
      and a.is_active = true
    group by a.id, a.account_code, a.account_name, a.account_type
  ) t;

  select
    coalesce(sum(case when (r->>'account_type') = 'ASSET' then (r->>'balance')::numeric else 0 end), 0),
    coalesce(sum(case when (r->>'account_type') = 'LIABILITY' then (r->>'balance')::numeric else 0 end), 0),
    coalesce(sum(case when (r->>'account_type') = 'EQUITY' then (r->>'balance')::numeric else 0 end), 0),
    coalesce(sum(case when (r->>'account_type') = 'REVENUE' then (r->>'balance')::numeric else 0 end), 0),
    coalesce(sum(case when (r->>'account_type') = 'EXPENSE' then (r->>'balance')::numeric else 0 end), 0)
  into v_assets, v_liabilities, v_equity, v_revenue, v_expense
  from jsonb_array_elements(v_rows) r;

  v_current_earnings := v_revenue - v_expense;
  v_equity := v_equity + v_current_earnings;

  return jsonb_build_object(
    'asOf', v_as_of,
    'branchId', p_branch_id,
    'assets', v_assets,
    'liabilities', v_liabilities,
    'equity', v_equity,
    'currentEarnings', v_current_earnings,
    'retainedEarningsNote',
      'Equity includes posted EQUITY balances plus current-period earnings (revenue - expense) as of date. No fabricated opening retained earnings.',
    'balanced', abs((v_assets) - (v_liabilities + v_equity)) < 0.01,
    'accounts', v_rows
  );
end;
$$;

revoke all on function public.finance_balance_sheet(uuid, date) from public, anon, authenticated;
grant execute on function public.finance_balance_sheet(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- Cash flow (indirect) — unclassified cash movements returned, never silent
-- ---------------------------------------------------------------------------
create or replace function public.finance_cash_flow_indirect(
  p_branch_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from, date_trunc('month', timezone('Asia/Karachi', now()))::date);
  v_to date := coalesce(p_to, (timezone('Asia/Karachi', now()))::date);
  v_net_income numeric(14, 2) := 0;
  v_operating numeric(14, 2) := 0;
  v_investing numeric(14, 2) := 0;
  v_financing numeric(14, 2) := 0;
  v_unclassified jsonb := '[]'::jsonb;
  v_opening_cash numeric(14, 2) := 0;
  v_closing_cash numeric(14, 2) := 0;
begin
  if p_branch_id is null then
    raise exception 'BRANCH_ID_REQUIRED';
  end if;

  select coalesce((public.finance_profit_loss(p_branch_id, v_from, v_to)->>'netIncome')::numeric, 0)
  into v_net_income;

  -- Cash/bank mapped accounts net change in period
  with cash_accts as (
    select m.account_id,
           case
             when m.purpose in ('cash_on_hand', 'bank_clearing', 'cash_flow_operating') then 'operating'
             when m.purpose = 'cash_flow_investing' then 'investing'
             when m.purpose = 'cash_flow_financing' then 'financing'
             else 'unclassified'
           end as class
    from public.finance_account_mappings m
    where m.branch_id = p_branch_id
      and m.purpose in (
        'cash_on_hand', 'bank_clearing',
        'cash_flow_operating', 'cash_flow_investing', 'cash_flow_financing'
      )
  ),
  moves as (
    select
      c.class,
      a.account_code,
      a.account_name,
      coalesce(sum(l.debit - l.credit), 0) as net_asset_change
    from cash_accts c
    join public.chart_of_accounts a on a.id = c.account_id
    left join public.journal_entry_lines l on l.account_id = a.id
    left join public.journal_entries e
      on e.id = l.journal_entry_id
     and e.status = 'posted'
     and e.branch_id = p_branch_id
     and e.entry_date between v_from and v_to
    group by c.class, a.account_code, a.account_name
  )
  select
    coalesce(sum(case when class = 'operating' then net_asset_change else 0 end), 0),
    coalesce(sum(case when class = 'investing' then net_asset_change else 0 end), 0),
    coalesce(sum(case when class = 'financing' then net_asset_change else 0 end), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'accountCode', account_code,
          'accountName', account_name,
          'netAssetChange', net_asset_change
        )
      ) filter (where class = 'unclassified'),
      '[]'::jsonb
    )
  into v_operating, v_investing, v_financing, v_unclassified
  from moves;

  -- Opening/closing cash from cash_on_hand + bank_clearing balances
  select coalesce(sum(
    case when a.account_type = 'ASSET'
      then coalesce(sum_d.debit, 0) - coalesce(sum_d.credit, 0)
      else 0 end
  ), 0)
  into v_closing_cash
  from public.finance_account_mappings m
  join public.chart_of_accounts a on a.id = m.account_id
  left join lateral (
    select sum(l.debit) as debit, sum(l.credit) as credit
    from public.journal_entry_lines l
    join public.journal_entries e on e.id = l.journal_entry_id
    where l.account_id = a.id
      and e.status = 'posted'
      and e.branch_id = p_branch_id
      and e.entry_date <= v_to
  ) sum_d on true
  where m.branch_id = p_branch_id
    and m.purpose in ('cash_on_hand', 'bank_clearing');

  select coalesce(sum(
    case when a.account_type = 'ASSET'
      then coalesce(sum_d.debit, 0) - coalesce(sum_d.credit, 0)
      else 0 end
  ), 0)
  into v_opening_cash
  from public.finance_account_mappings m
  join public.chart_of_accounts a on a.id = m.account_id
  left join lateral (
    select sum(l.debit) as debit, sum(l.credit) as credit
    from public.journal_entry_lines l
    join public.journal_entries e on e.id = l.journal_entry_id
    where l.account_id = a.id
      and e.status = 'posted'
      and e.branch_id = p_branch_id
      and e.entry_date < v_from
  ) sum_d on true
  where m.branch_id = p_branch_id
    and m.purpose in ('cash_on_hand', 'bank_clearing');

  return jsonb_build_object(
    'method', 'indirect',
    'from', v_from,
    'to', v_to,
    'branchId', p_branch_id,
    'netIncome', v_net_income,
    'operating', v_operating + v_net_income,
    'investing', v_investing,
    'financing', v_financing,
    'openingCash', v_opening_cash,
    'closingCash', v_closing_cash,
    'netChange', v_closing_cash - v_opening_cash,
    'unclassified', v_unclassified,
    'note', 'Unclassified cash movements are returned explicitly — never silently treated as operating.'
  );
end;
$$;

revoke all on function public.finance_cash_flow_indirect(uuid, date, date) from public, anon, authenticated;
grant execute on function public.finance_cash_flow_indirect(uuid, date, date) to service_role;

commit;
