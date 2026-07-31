-- RC3 Finance PR1: purpose → CoA account mappings (empty by default).
-- Additive only. No fake Production seed data.

begin;

create table if not exists public.finance_account_mappings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  purpose text not null
    check (
      purpose in (
        'cash_on_hand',
        'cash_over_short',
        'ap_control',
        'bank_clearing',
        'expense_default'
      )
      or purpose like 'expense_category:%'
    ),
  account_id uuid not null references public.chart_of_accounts (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, purpose)
);

comment on table public.finance_account_mappings is
  'Maps posting purposes to CoA accounts per branch. Empty until configured — never invent account IDs.';

create index if not exists idx_finance_account_mappings_branch
  on public.finance_account_mappings (branch_id);
create index if not exists idx_finance_account_mappings_account
  on public.finance_account_mappings (account_id);

alter table public.finance_account_mappings enable row level security;

drop policy if exists "Staff select finance account mappings" on public.finance_account_mappings;
create policy "Staff select finance account mappings"
  on public.finance_account_mappings
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.finance_account_mappings from public, anon, authenticated;
grant select on public.finance_account_mappings to authenticated;
grant all on public.finance_account_mappings to service_role;

commit;
