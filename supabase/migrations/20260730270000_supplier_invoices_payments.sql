-- Supplier invoices & payments (AP foundation). Additive only.
-- Three-way matching (PO ↔ GRN ↔ invoice) remains Coming Soon.

begin;

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  invoice_number varchar(80) not null,
  invoice_date date not null default (timezone('Asia/Karachi', now()))::date,
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'partially_paid')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, invoice_number)
);

comment on table public.supplier_invoices is
  'Supplier AP invoices linked optionally to a PO. Three-way matching Coming Soon.';

create index if not exists idx_supplier_invoices_branch on public.supplier_invoices (branch_id);
create index if not exists idx_supplier_invoices_supplier on public.supplier_invoices (supplier_id);
create index if not exists idx_supplier_invoices_po on public.supplier_invoices (purchase_order_id);
create index if not exists idx_supplier_invoices_status on public.supplier_invoices (status);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  supplier_invoice_id uuid not null references public.supplier_invoices (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  payment_date date not null default (timezone('Asia/Karachi', now()))::date,
  payment_method text not null default 'bank_transfer'
    check (payment_method in ('cash', 'bank_transfer', 'cheque', 'other')),
  reference text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.supplier_payments is
  'Supplier payments applied to invoices. Status rolls pending → partially_paid → paid.';

create index if not exists idx_supplier_payments_branch on public.supplier_payments (branch_id);
create index if not exists idx_supplier_payments_invoice on public.supplier_payments (supplier_invoice_id);
create index if not exists idx_supplier_payments_supplier on public.supplier_payments (supplier_id);

alter table public.supplier_invoices enable row level security;
alter table public.supplier_payments enable row level security;

drop policy if exists "Staff select supplier invoices" on public.supplier_invoices;
create policy "Staff select supplier invoices"
  on public.supplier_invoices
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select supplier payments" on public.supplier_payments;
create policy "Staff select supplier payments"
  on public.supplier_payments
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.supplier_invoices from public, anon, authenticated;
revoke all on public.supplier_payments from public, anon, authenticated;
grant select on public.supplier_invoices to authenticated;
grant select on public.supplier_payments to authenticated;
grant all on public.supplier_invoices to service_role;
grant all on public.supplier_payments to service_role;

-- Record payment and update invoice status atomically.
create or replace function public.record_supplier_payment_atomic(
  p_branch_id uuid,
  p_supplier_id uuid,
  p_supplier_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.supplier_invoices%rowtype;
  v_paid numeric(14, 2);
  v_status text;
  v_payment_id uuid;
  v_method text := coalesce(nullif(trim(p_payment_method), ''), 'bank_transfer');
begin
  if p_branch_id is null or p_supplier_id is null or p_supplier_invoice_id is null then
    raise exception 'PAYMENT_ARGS_REQUIRED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'PAYMENT_AMOUNT_INVALID';
  end if;
  if v_method not in ('cash', 'bank_transfer', 'cheque', 'other') then
    raise exception 'PAYMENT_METHOD_INVALID';
  end if;

  select * into v_invoice
  from public.supplier_invoices
  where id = p_supplier_invoice_id
  for update;

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;
  if v_invoice.branch_id <> p_branch_id then
    raise exception 'INVOICE_BRANCH_MISMATCH';
  end if;
  if v_invoice.supplier_id <> p_supplier_id then
    raise exception 'INVOICE_SUPPLIER_MISMATCH';
  end if;
  if v_invoice.status = 'paid' then
    raise exception 'INVOICE_ALREADY_PAID';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.supplier_payments
  where supplier_invoice_id = p_supplier_invoice_id;

  if v_paid + p_amount > v_invoice.total_amount + 0.001 then
    raise exception 'PAYMENT_EXCEEDS_BALANCE';
  end if;

  insert into public.supplier_payments (
    branch_id, supplier_id, supplier_invoice_id, amount, payment_date, payment_method, reference
  ) values (
    p_branch_id,
    p_supplier_id,
    p_supplier_invoice_id,
    p_amount,
    coalesce(p_payment_date, (timezone('Asia/Karachi', now()))::date),
    v_method,
    nullif(trim(coalesce(p_reference, '')), '')
  )
  returning id into v_payment_id;

  v_paid := v_paid + p_amount;
  if v_paid >= v_invoice.total_amount then
    v_status := 'paid';
  elsif v_paid > 0 then
    v_status := 'partially_paid';
  else
    v_status := 'pending';
  end if;

  update public.supplier_invoices
  set status = v_status
  where id = p_supplier_invoice_id;

  return jsonb_build_object(
    'paymentId', v_payment_id,
    'invoiceId', p_supplier_invoice_id,
    'invoiceStatus', v_status,
    'amountPaid', v_paid,
    'invoiceTotal', v_invoice.total_amount
  );
end;
$$;

revoke all on function public.record_supplier_payment_atomic(uuid, uuid, uuid, numeric, date, text, text)
  from public, anon, authenticated;
grant execute on function public.record_supplier_payment_atomic(uuid, uuid, uuid, numeric, date, text, text)
  to service_role;

commit;
