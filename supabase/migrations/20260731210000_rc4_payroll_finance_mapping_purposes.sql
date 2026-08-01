-- RC4-3 payroll ↔ Finance mapping purposes (additive).
-- Enables accrual and settlement journals when mappings exist.
-- No Production apply in this slice.

begin;

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
      'cash_flow_financing',
      'salary_expense',
      'allowance_expense',
      'payroll_payable',
      'payroll_tax_payable',
      'payroll_deduction_payable'
    )
    or purpose like 'expense_category:%'
  );

comment on constraint finance_account_mappings_purpose_check on public.finance_account_mappings is
  'RC4-8 + RC4-3 payroll purposes: salary/allowance expense and payroll payables.';

alter table public.hr_payroll_runs
  add column if not exists accrual_journal_entry_id uuid references public.journal_entries (id) on delete set null,
  add column if not exists accrual_posting_status text not null default 'pending'
    check (accrual_posting_status in ('pending', 'posted', 'blocked', 'deferred', 'already_posted')),
  add column if not exists accrual_posting_blocked_reason text;

comment on column public.hr_payroll_runs.accrual_posting_status is
  'Accrual journal status after approve. blocked/deferred when mappings or Finance period prevent posting.';

commit;
