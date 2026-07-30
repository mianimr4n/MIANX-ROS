-- Three-way matching status on supplier invoices (PO ↔ GRN ↔ invoice).
-- Additive only.

begin;

alter table public.supplier_invoices
  add column if not exists matching_status text not null default 'UNMATCHED'
    check (matching_status in ('UNMATCHED', 'MATCHED', 'DISCREPANCY'));

comment on column public.supplier_invoices.matching_status is
  'Three-way match result: UNMATCHED (no PO), MATCHED (PO total ≈ invoice total and posted GRN exists), DISCREPANCY otherwise.';

create index if not exists idx_supplier_invoices_matching_status
  on public.supplier_invoices (matching_status);

comment on table public.supplier_invoices is
  'Supplier AP invoices with optional PO link and three-way matching_status (UNMATCHED|MATCHED|DISCREPANCY).';

commit;
