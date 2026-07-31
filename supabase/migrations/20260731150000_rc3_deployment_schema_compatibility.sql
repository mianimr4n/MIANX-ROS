-- RC3 deployment schema compatibility (forward-only, idempotent).
-- Purpose: close production/runtime schema drift when API/UI land before RC3
-- slice migrations are fully applied. Does NOT redesign APIs or drop data.
--
-- Already covered by prior migrations (re-asserted here safely):
--   Finance: 20260731020000 cash_reconciliations, 20260731030000 expense_claims,
--            20260731040000 supplier_invoices.due_date (+ exception cols)
--   HR:      20260731060000 hr_shift_templates/scheduled_shifts,
--            20260731070000 hr_attendance_corrections + scheduled_shift_id + rejection_reason,
--            20260731080000 hr_compensation_profiles (+ payroll foundation)
--   Loyalty: 20260731090000 + 20260731140000 actor_user_id / reverse / expiry / idempotency
--   Supplier portal: 20260731120000 + 20260731130000
--
-- Prerequisites: branches, auth.users, journal_entries, supplier_invoices,
-- hr_employees, hr_attendance, hr_leave_requests, loyalty_transactions must exist
-- from earlier migrations. This file never DROPs tables/columns.

begin;

-- ---------------------------------------------------------------------------
-- Finance: cash reconciliations
-- ---------------------------------------------------------------------------
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
  status text not null default 'draft',
  prepared_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  z_report_event_id uuid,
  journal_entry_id uuid,
  posting_status text not null default 'not_applicable',
  posting_blocked_reason text,
  idempotency_key varchar(100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.cash_reconciliations add column if not exists register_id uuid;
alter table public.cash_reconciliations add column if not exists opening_float numeric(14, 2);
alter table public.cash_reconciliations add column if not exists cash_sales numeric(14, 2);
alter table public.cash_reconciliations add column if not exists cash_refunds numeric(14, 2);
alter table public.cash_reconciliations add column if not exists cash_drops numeric(14, 2);
alter table public.cash_reconciliations add column if not exists paid_out_expenses numeric(14, 2);
alter table public.cash_reconciliations add column if not exists other_inflows numeric(14, 2);
alter table public.cash_reconciliations add column if not exists other_outflows numeric(14, 2);
alter table public.cash_reconciliations add column if not exists expected_cash numeric(14, 2);
alter table public.cash_reconciliations add column if not exists counted_cash numeric(14, 2);
alter table public.cash_reconciliations add column if not exists variance numeric(14, 2);
alter table public.cash_reconciliations add column if not exists closing_note text;
alter table public.cash_reconciliations add column if not exists status text;
alter table public.cash_reconciliations add column if not exists prepared_by uuid;
alter table public.cash_reconciliations add column if not exists reviewed_by uuid;
alter table public.cash_reconciliations add column if not exists rejection_reason text;
alter table public.cash_reconciliations add column if not exists journal_entry_id uuid;
alter table public.cash_reconciliations add column if not exists posting_status text;
alter table public.cash_reconciliations add column if not exists posting_blocked_reason text;
alter table public.cash_reconciliations add column if not exists idempotency_key varchar(100);

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

alter table public.cash_reconciliations enable row level security;
alter table public.cash_reconciliation_events enable row level security;
grant select on public.cash_reconciliations to authenticated;
grant select on public.cash_reconciliation_events to authenticated;
grant all on public.cash_reconciliations to service_role;
grant all on public.cash_reconciliation_events to service_role;

-- ---------------------------------------------------------------------------
-- Finance: expense claims
-- ---------------------------------------------------------------------------
create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  expense_number varchar(40) not null,
  branch_id uuid not null references public.branches (id) on delete cascade,
  category text not null,
  expense_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency varchar(3) not null default 'PKR',
  payment_method text not null default 'cash',
  payee text,
  description text not null,
  receipt_ref text,
  status text not null default 'draft',
  submitted_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  journal_entry_id uuid,
  posting_status text not null default 'not_applicable',
  posting_blocked_reason text,
  source_context text,
  idempotency_key varchar(100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.expense_claims add column if not exists expense_number varchar(40);
alter table public.expense_claims add column if not exists category text;
alter table public.expense_claims add column if not exists expense_date date;
alter table public.expense_claims add column if not exists amount numeric(14, 2);
alter table public.expense_claims add column if not exists currency varchar(3);
alter table public.expense_claims add column if not exists payment_method text;
alter table public.expense_claims add column if not exists payee text;
alter table public.expense_claims add column if not exists description text;
alter table public.expense_claims add column if not exists receipt_ref text;
alter table public.expense_claims add column if not exists status text;
alter table public.expense_claims add column if not exists submitted_by uuid;
alter table public.expense_claims add column if not exists approved_by uuid;
alter table public.expense_claims add column if not exists rejection_reason text;
alter table public.expense_claims add column if not exists journal_entry_id uuid;
alter table public.expense_claims add column if not exists posting_status text;
alter table public.expense_claims add column if not exists posting_blocked_reason text;
alter table public.expense_claims add column if not exists source_context text;
alter table public.expense_claims add column if not exists idempotency_key varchar(100);

alter table public.expense_claims enable row level security;
grant select on public.expense_claims to authenticated;
grant all on public.expense_claims to service_role;

-- ---------------------------------------------------------------------------
-- Finance / AP: supplier invoice due date + exception metadata
-- ---------------------------------------------------------------------------
alter table public.supplier_invoices add column if not exists due_date date;
alter table public.supplier_invoices add column if not exists exception_approved_at timestamptz;
alter table public.supplier_invoices add column if not exists exception_approved_by uuid references auth.users (id) on delete set null;
alter table public.supplier_invoices add column if not exists exception_reason text;
alter table public.supplier_payments add column if not exists idempotency_key varchar(100);

-- ---------------------------------------------------------------------------
-- HR: shift templates + scheduled shifts
-- ---------------------------------------------------------------------------
create table if not exists public.hr_shift_templates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name varchar(120) not null,
  operational_role varchar(150),
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0,
  days_of_week smallint[] not null default '{}',
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, name)
);

alter table public.hr_shift_templates add column if not exists operational_role varchar(150);
alter table public.hr_shift_templates add column if not exists start_time time;
alter table public.hr_shift_templates add column if not exists end_time time;
alter table public.hr_shift_templates add column if not exists break_minutes integer;
alter table public.hr_shift_templates add column if not exists days_of_week smallint[];
alter table public.hr_shift_templates add column if not exists is_active boolean;
alter table public.hr_shift_templates add column if not exists notes text;

create table if not exists public.hr_scheduled_shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete restrict,
  template_id uuid references public.hr_shift_templates (id) on delete set null,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0,
  operational_role varchar(150),
  status text not null default 'draft',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  cancel_reason text,
  change_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.hr_scheduled_shifts add column if not exists template_id uuid;
alter table public.hr_scheduled_shifts add column if not exists shift_date date;
alter table public.hr_scheduled_shifts add column if not exists starts_at timestamptz;
alter table public.hr_scheduled_shifts add column if not exists ends_at timestamptz;
alter table public.hr_scheduled_shifts add column if not exists break_minutes integer;
alter table public.hr_scheduled_shifts add column if not exists operational_role varchar(150);
alter table public.hr_scheduled_shifts add column if not exists status text;
alter table public.hr_scheduled_shifts add column if not exists notes text;
alter table public.hr_scheduled_shifts add column if not exists published_by uuid;
alter table public.hr_scheduled_shifts add column if not exists published_at timestamptz;
alter table public.hr_scheduled_shifts add column if not exists cancel_reason text;
alter table public.hr_scheduled_shifts add column if not exists change_reason text;

alter table public.hr_shift_templates enable row level security;
alter table public.hr_scheduled_shifts enable row level security;
grant select on public.hr_shift_templates to authenticated;
grant select on public.hr_scheduled_shifts to authenticated;
grant all on public.hr_shift_templates to service_role;
grant all on public.hr_scheduled_shifts to service_role;

-- ---------------------------------------------------------------------------
-- HR: attendance corrections + attendance/leave hardening columns
-- ---------------------------------------------------------------------------
alter table public.hr_attendance
  add column if not exists scheduled_shift_id uuid references public.hr_scheduled_shifts (id) on delete set null;
alter table public.hr_attendance
  add column if not exists is_unscheduled boolean not null default false;

create table if not exists public.hr_attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.hr_attendance (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending',
  reason text not null,
  rejection_reason text,
  original_check_in timestamptz,
  original_check_out timestamptz,
  original_status text,
  proposed_check_in timestamptz,
  proposed_check_out timestamptz,
  proposed_status text,
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

alter table public.hr_attendance_corrections add column if not exists rejection_reason text;
alter table public.hr_attendance_corrections add column if not exists reviewed_by uuid;
alter table public.hr_attendance_corrections add column if not exists reviewed_at timestamptz;
alter table public.hr_attendance_corrections add column if not exists original_check_in timestamptz;
alter table public.hr_attendance_corrections add column if not exists original_check_out timestamptz;
alter table public.hr_attendance_corrections add column if not exists original_status text;
alter table public.hr_attendance_corrections add column if not exists proposed_check_in timestamptz;
alter table public.hr_attendance_corrections add column if not exists proposed_check_out timestamptz;
alter table public.hr_attendance_corrections add column if not exists proposed_status text;

alter table public.hr_leave_requests add column if not exists decided_by uuid references auth.users (id) on delete set null;
alter table public.hr_leave_requests add column if not exists decided_at timestamptz;
alter table public.hr_leave_requests add column if not exists rejection_reason text;

alter table public.hr_attendance_corrections enable row level security;
grant select on public.hr_attendance_corrections to authenticated;
grant all on public.hr_attendance_corrections to service_role;

-- ---------------------------------------------------------------------------
-- HR: compensation profiles (payroll foundation)
-- ---------------------------------------------------------------------------
create table if not exists public.hr_compensation_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  salary_type text not null,
  base_rate numeric(14, 2) not null,
  currency varchar(3) not null default 'PKR',
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  approved_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.hr_compensation_profiles add column if not exists salary_type text;
alter table public.hr_compensation_profiles add column if not exists base_rate numeric(14, 2);
alter table public.hr_compensation_profiles add column if not exists currency varchar(3);
alter table public.hr_compensation_profiles add column if not exists effective_from date;
alter table public.hr_compensation_profiles add column if not exists effective_to date;
alter table public.hr_compensation_profiles add column if not exists is_active boolean;

create table if not exists public.hr_pay_periods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hr_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  pay_period_id uuid not null references public.hr_pay_periods (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  status text not null default 'draft',
  calculation_status text not null default 'unavailable',
  calculation_note text,
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.hr_compensation_profiles enable row level security;
alter table public.hr_pay_periods enable row level security;
alter table public.hr_payroll_runs enable row level security;
grant select on public.hr_compensation_profiles to authenticated;
grant select on public.hr_pay_periods to authenticated;
grant select on public.hr_payroll_runs to authenticated;
grant all on public.hr_compensation_profiles to service_role;
grant all on public.hr_pay_periods to service_role;
grant all on public.hr_payroll_runs to service_role;

-- ---------------------------------------------------------------------------
-- Loyalty columns (also covered by 20260731140000 — re-assert for safety)
-- ---------------------------------------------------------------------------
alter table public.loyalty_transactions
  add column if not exists actor_user_id uuid references auth.users (id) on delete set null;
alter table public.loyalty_transactions
  add column if not exists reverses_transaction_id uuid references public.loyalty_transactions (id) on delete set null;
alter table public.loyalty_transactions
  add column if not exists expires_at timestamptz;
alter table public.loyalty_transactions
  add column if not exists idempotency_key text;

-- ---------------------------------------------------------------------------
-- Supplier portal: column-level drift only (full tables in 31120000/31130000)
-- Do not stub-create portal tables here — column shapes are owned by those migrations.
-- ---------------------------------------------------------------------------
alter table public.purchase_order_responses
  add column if not exists idempotency_key text;
alter table public.purchase_orders
  add column if not exists supplier_response_status text;
alter table public.supplier_documents
  add column if not exists mime_type varchar(120);
alter table public.supplier_documents
  add column if not exists file_size_bytes bigint;
alter table public.supplier_documents
  add column if not exists review_state text;
alter table public.supplier_documents
  add column if not exists status text;

comment on table public.cash_reconciliations is
  'RC3 deployment compat: cash reconciliations (source 20260731020000).';
comment on table public.expense_claims is
  'RC3 deployment compat: expense claims (source 20260731030000).';
comment on column public.supplier_invoices.due_date is
  'RC3 deployment compat: AP due date (source 20260731040000).';
comment on table public.hr_shift_templates is
  'RC3 deployment compat: shift templates (source 20260731060000).';
comment on table public.hr_attendance_corrections is
  'RC3 deployment compat: attendance corrections (source 20260731070000).';
comment on table public.hr_compensation_profiles is
  'RC3 deployment compat: compensation profiles (source 20260731080000). No payment.';

commit;
