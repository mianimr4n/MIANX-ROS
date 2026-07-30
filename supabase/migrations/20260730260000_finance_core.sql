-- REQ-ADM Finance Core: chart of accounts + double-entry journal (debits = credits).
-- Additive only. Reports are computed dynamically — no fake statement tables.

begin;

insert into public.permissions (module, action, code, description)
values
  ('finance', 'manage', 'finance.manage', 'Manage chart of accounts, journal entries, and financial statements.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'finance.manage'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  account_code varchar(32) not null,
  account_name varchar(200) not null,
  account_type text not null
    check (account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, account_code)
);

comment on table public.chart_of_accounts is
  'Finance CoA — empty until accounts are created. No seeded fake balances.';

create index if not exists idx_chart_of_accounts_branch on public.chart_of_accounts (branch_id);
create index if not exists idx_chart_of_accounts_type on public.chart_of_accounts (account_type);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  entry_date date not null default (timezone('Asia/Karachi', now()))::date,
  description text not null,
  reference_type text,
  reference_id uuid,
  status text not null default 'posted'
    check (status in ('draft', 'posted', 'voided')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.journal_entries is
  'Double-entry journal headers. Lines must balance (sum debit = sum credit).';

create index if not exists idx_journal_entries_branch_date
  on public.journal_entries (branch_id, entry_date desc);
create index if not exists idx_journal_entries_status
  on public.journal_entries (status);
create index if not exists idx_journal_entries_reference
  on public.journal_entries (reference_type, reference_id);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id) on delete restrict,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  constraint journal_entry_lines_one_side check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  )
);

comment on table public.journal_entry_lines is
  'Journal lines — exactly one of debit/credit positive per line.';

create index if not exists idx_journal_entry_lines_entry
  on public.journal_entry_lines (journal_entry_id);
create index if not exists idx_journal_entry_lines_account
  on public.journal_entry_lines (account_id);

alter table public.chart_of_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;

drop policy if exists "Staff select chart of accounts" on public.chart_of_accounts;
create policy "Staff select chart of accounts"
  on public.chart_of_accounts
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select journal entries" on public.journal_entries;
create policy "Staff select journal entries"
  on public.journal_entries
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select journal entry lines" on public.journal_entry_lines;
create policy "Staff select journal entry lines"
  on public.journal_entry_lines
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.journal_entries je
      where je.id = journal_entry_id
        and public.current_user_has_branch_access(je.branch_id)
    )
  );

revoke all on public.chart_of_accounts from public, anon, authenticated;
revoke all on public.journal_entries from public, anon, authenticated;
revoke all on public.journal_entry_lines from public, anon, authenticated;

grant select on public.chart_of_accounts to authenticated;
grant select on public.journal_entries to authenticated;
grant select on public.journal_entry_lines to authenticated;

grant all on public.chart_of_accounts to service_role;
grant all on public.journal_entries to service_role;
grant all on public.journal_entry_lines to service_role;

-- Atomic balanced journal create (Debits = Credits).
create or replace function public.create_journal_entry_atomic(
  p_branch_id uuid,
  p_entry_date date,
  p_description text,
  p_reference_type text,
  p_reference_id uuid,
  p_status text,
  p_actor_user_id uuid,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := coalesce(nullif(trim(p_status), ''), 'posted');
  v_desc text := trim(coalesce(p_description, ''));
  v_entry_id uuid;
  v_total_debit numeric(14, 2) := 0;
  v_total_credit numeric(14, 2) := 0;
  v_line jsonb;
  v_account_id uuid;
  v_debit numeric(14, 2);
  v_credit numeric(14, 2);
  v_account_branch uuid;
  v_line_count int := 0;
begin
  if p_branch_id is null then
    raise exception 'BRANCH_ID_REQUIRED';
  end if;
  if v_desc = '' then
    raise exception 'DESCRIPTION_REQUIRED';
  end if;
  if v_status not in ('draft', 'posted', 'voided') then
    raise exception 'JOURNAL_STATUS_INVALID';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'JOURNAL_LINES_REQUIRED';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_line_count := v_line_count + 1;
    v_account_id := nullif(v_line->>'accountId', '')::uuid;
    v_debit := coalesce((v_line->>'debit')::numeric, 0);
    v_credit := coalesce((v_line->>'credit')::numeric, 0);

    if v_account_id is null then
      raise exception 'ACCOUNT_ID_REQUIRED';
    end if;
    if v_debit < 0 or v_credit < 0 then
      raise exception 'AMOUNT_NEGATIVE';
    end if;
    if not ((v_debit > 0 and v_credit = 0) or (v_credit > 0 and v_debit = 0)) then
      raise exception 'LINE_MUST_BE_DEBIT_OR_CREDIT';
    end if;

    select branch_id into v_account_branch
    from public.chart_of_accounts
    where id = v_account_id and is_active = true
    for share;

    if v_account_branch is null then
      raise exception 'ACCOUNT_NOT_FOUND';
    end if;
    if v_account_branch <> p_branch_id then
      raise exception 'ACCOUNT_BRANCH_MISMATCH';
    end if;

    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  end loop;

  if v_line_count < 2 then
    raise exception 'JOURNAL_LINES_MIN_TWO';
  end if;
  if v_total_debit <> v_total_credit then
    raise exception 'JOURNAL_UNBALANCED: debits % credits %', v_total_debit, v_total_credit;
  end if;
  if v_total_debit <= 0 then
    raise exception 'JOURNAL_ZERO_AMOUNT';
  end if;

  insert into public.journal_entries (
    branch_id, entry_date, description, reference_type, reference_id, status, created_by
  ) values (
    p_branch_id,
    coalesce(p_entry_date, (timezone('Asia/Karachi', now()))::date),
    v_desc,
    nullif(trim(coalesce(p_reference_type, '')), ''),
    p_reference_id,
    v_status,
    p_actor_user_id
  )
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    values (
      v_entry_id,
      (v_line->>'accountId')::uuid,
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0)
    );
  end loop;

  return (
    select jsonb_build_object(
      'id', je.id,
      'branchId', je.branch_id,
      'entryDate', je.entry_date,
      'description', je.description,
      'referenceType', je.reference_type,
      'referenceId', je.reference_id,
      'status', je.status,
      'createdBy', je.created_by,
      'createdAt', je.created_at,
      'totalDebit', v_total_debit,
      'totalCredit', v_total_credit,
      'lines', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', jel.id,
            'accountId', jel.account_id,
            'accountCode', coa.account_code,
            'accountName', coa.account_name,
            'accountType', coa.account_type,
            'debit', jel.debit,
            'credit', jel.credit
          )
          order by jel.id
        )
        from public.journal_entry_lines jel
        join public.chart_of_accounts coa on coa.id = jel.account_id
        where jel.journal_entry_id = je.id
      ), '[]'::jsonb)
    )
    from public.journal_entries je
    where je.id = v_entry_id
  );
end;
$$;

comment on function public.create_journal_entry_atomic(uuid, date, text, text, uuid, text, uuid, jsonb) is
  'Creates a balanced journal entry atomically. Fails if sum(debits) <> sum(credits).';

revoke all on function public.create_journal_entry_atomic(uuid, date, text, text, uuid, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_journal_entry_atomic(uuid, date, text, text, uuid, text, uuid, jsonb)
  to service_role;

-- Dynamic trial balance (posted entries only; no snapshot tables).
create or replace function public.finance_trial_balance(
  p_branch_id uuid,
  p_as_of date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_as_of date := coalesce(p_as_of, (timezone('Asia/Karachi', now()))::date);
  v_rows jsonb;
  v_total_debit numeric(14, 2);
  v_total_credit numeric(14, 2);
begin
  if p_branch_id is null then
    raise exception 'BRANCH_ID_REQUIRED';
  end if;

  select
    coalesce(jsonb_agg(row_json order by account_code), '[]'::jsonb),
    coalesce(sum(total_debit), 0),
    coalesce(sum(total_credit), 0)
  into v_rows, v_total_debit, v_total_credit
  from (
    select
      coa.id as account_id,
      coa.account_code,
      coa.account_name,
      coa.account_type,
      coalesce(sum(jel.debit), 0)::numeric(14, 2) as total_debit,
      coalesce(sum(jel.credit), 0)::numeric(14, 2) as total_credit,
      jsonb_build_object(
        'accountId', coa.id,
        'accountCode', coa.account_code,
        'accountName', coa.account_name,
        'accountType', coa.account_type,
        'debit', coalesce(sum(jel.debit), 0),
        'credit', coalesce(sum(jel.credit), 0)
      ) as row_json
    from public.chart_of_accounts coa
    left join public.journal_entry_lines jel on jel.account_id = coa.id
    left join public.journal_entries je
      on je.id = jel.journal_entry_id
     and je.branch_id = p_branch_id
     and je.status = 'posted'
     and je.entry_date <= v_as_of
    where coa.branch_id = p_branch_id
      and coa.is_active = true
    group by coa.id, coa.account_code, coa.account_name, coa.account_type
    having coalesce(sum(jel.debit), 0) <> 0 or coalesce(sum(jel.credit), 0) <> 0
  ) s;

  return jsonb_build_object(
    'branchId', p_branch_id,
    'asOf', v_as_of,
    'rows', v_rows,
    'totalDebit', v_total_debit,
    'totalCredit', v_total_credit,
    'balanced', v_total_debit = v_total_credit
  );
end;
$$;

revoke all on function public.finance_trial_balance(uuid, date) from public, anon, authenticated;
grant execute on function public.finance_trial_balance(uuid, date) to service_role;

-- Dynamic P&L from posted journal lines (Revenue − Expenses).
create or replace function public.finance_profit_loss(
  p_branch_id uuid,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to date := coalesce(p_to, (timezone('Asia/Karachi', now()))::date);
  v_from date := coalesce(p_from, date_trunc('year', v_to::timestamp)::date);
  v_revenue numeric(14, 2) := 0;
  v_expenses numeric(14, 2) := 0;
  v_revenue_rows jsonb;
  v_expense_rows jsonb;
begin
  if p_branch_id is null then
    raise exception 'BRANCH_ID_REQUIRED';
  end if;

  select
    coalesce(sum(coa_net), 0),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'accountId', account_id,
        'accountCode', account_code,
        'accountName', account_name,
        'amount', coa_net
      )
      order by account_code
    ) filter (where coa_net <> 0), '[]'::jsonb)
  into v_revenue, v_revenue_rows
  from (
    select
      coa.id as account_id,
      coa.account_code,
      coa.account_name,
      (coalesce(sum(jel.credit), 0) - coalesce(sum(jel.debit), 0))::numeric(14, 2) as coa_net
    from public.chart_of_accounts coa
    join public.journal_entry_lines jel on jel.account_id = coa.id
    join public.journal_entries je on je.id = jel.journal_entry_id
    where coa.branch_id = p_branch_id
      and coa.account_type = 'REVENUE'
      and je.branch_id = p_branch_id
      and je.status = 'posted'
      and je.entry_date >= v_from
      and je.entry_date <= v_to
    group by coa.id, coa.account_code, coa.account_name
  ) r;

  select
    coalesce(sum(coa_net), 0),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'accountId', account_id,
        'accountCode', account_code,
        'accountName', account_name,
        'amount', coa_net
      )
      order by account_code
    ) filter (where coa_net <> 0), '[]'::jsonb)
  into v_expenses, v_expense_rows
  from (
    select
      coa.id as account_id,
      coa.account_code,
      coa.account_name,
      (coalesce(sum(jel.debit), 0) - coalesce(sum(jel.credit), 0))::numeric(14, 2) as coa_net
    from public.chart_of_accounts coa
    join public.journal_entry_lines jel on jel.account_id = coa.id
    join public.journal_entries je on je.id = jel.journal_entry_id
    where coa.branch_id = p_branch_id
      and coa.account_type = 'EXPENSE'
      and je.branch_id = p_branch_id
      and je.status = 'posted'
      and je.entry_date >= v_from
      and je.entry_date <= v_to
    group by coa.id, coa.account_code, coa.account_name
  ) e;

  return jsonb_build_object(
    'branchId', p_branch_id,
    'fromDate', v_from,
    'toDate', v_to,
    'revenue', v_revenue,
    'expenses', v_expenses,
    'netIncome', v_revenue - v_expenses,
    'revenueAccounts', coalesce(v_revenue_rows, '[]'::jsonb),
    'expenseAccounts', coalesce(v_expense_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.finance_profit_loss(uuid, date, date) from public, anon, authenticated;
grant execute on function public.finance_profit_loss(uuid, date, date) to service_role;

commit;
