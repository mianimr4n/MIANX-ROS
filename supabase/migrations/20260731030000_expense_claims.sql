-- RC3 Finance PR1: expense claims with approval lifecycle and audit.

begin;

create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  expense_number varchar(40) not null,
  branch_id uuid not null references public.branches (id) on delete cascade,
  category text not null,
  expense_date date not null default (timezone('Asia/Karachi', now()))::date,
  amount numeric(14, 2) not null check (amount > 0),
  currency varchar(3) not null default 'PKR',
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'bank_transfer', 'cheque', 'card', 'other')),
  payee text,
  description text not null,
  receipt_ref text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'paid', 'voided')),
  submitted_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  posting_status text not null default 'pending'
    check (posting_status in ('pending', 'posted', 'blocked', 'not_applicable', 'reversed')),
  posting_blocked_reason text,
  source_context text,
  idempotency_key varchar(100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, expense_number)
);

comment on table public.expense_claims is
  'Branch expense claims. No destructive delete after submission. Journals only after approval/payment when mappings exist.';

create unique index if not exists uq_expense_claims_idempotency
  on public.expense_claims (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_expense_claims_branch_status
  on public.expense_claims (branch_id, status, expense_date desc);
create index if not exists idx_expense_claims_posting
  on public.expense_claims (branch_id, posting_status);

create table if not exists public.expense_claim_events (
  id uuid primary key default gen_random_uuid(),
  expense_claim_id uuid not null references public.expense_claims (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_expense_claim_events_claim
  on public.expense_claim_events (expense_claim_id, created_at desc);

alter table public.expense_claims enable row level security;
alter table public.expense_claim_events enable row level security;

drop policy if exists "Staff select expense claims" on public.expense_claims;
create policy "Staff select expense claims"
  on public.expense_claims
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select expense claim events" on public.expense_claim_events;
create policy "Staff select expense claim events"
  on public.expense_claim_events
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.expense_claims from public, anon, authenticated;
revoke all on public.expense_claim_events from public, anon, authenticated;
grant select on public.expense_claims to authenticated;
grant select on public.expense_claim_events to authenticated;
grant all on public.expense_claims to service_role;
grant all on public.expense_claim_events to service_role;

commit;
