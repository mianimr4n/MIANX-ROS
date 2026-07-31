-- RC3 Finance PR1: finance_postings, journal reverse, AP payment idempotency, invoice exception.

begin;

-- ---------------------------------------------------------------------------
-- Finance postings — one successful journal link per source
-- ---------------------------------------------------------------------------
create table if not exists public.finance_postings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  source_module text not null,
  source_id uuid not null,
  journal_entry_id uuid not null references public.journal_entries (id) on delete restrict,
  idempotency_key varchar(100),
  status text not null default 'posted'
    check (status in ('posted', 'reversed')),
  posted_by uuid references auth.users (id) on delete set null,
  posted_at timestamptz not null default timezone('utc', now()),
  reversal_journal_entry_id uuid references public.journal_entries (id) on delete set null,
  reversal_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_module, source_id)
);

comment on table public.finance_postings is
  'Links operational sources to posted journals. Unique per source prevents duplicate posting.';

create unique index if not exists uq_finance_postings_idempotency
  on public.finance_postings (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_finance_postings_branch
  on public.finance_postings (branch_id, posted_at desc);
create index if not exists idx_finance_postings_journal
  on public.finance_postings (journal_entry_id);

alter table public.finance_postings enable row level security;

drop policy if exists "Staff select finance postings" on public.finance_postings;
create policy "Staff select finance postings"
  on public.finance_postings
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.finance_postings from public, anon, authenticated;
grant select on public.finance_postings to authenticated;
grant all on public.finance_postings to service_role;

-- Journal reverse link column
alter table public.journal_entries
  add column if not exists reversed_by_journal_id uuid references public.journal_entries (id) on delete set null;

alter table public.journal_entries
  add column if not exists reverses_journal_id uuid references public.journal_entries (id) on delete set null;

-- ---------------------------------------------------------------------------
-- reverse_journal_entry_atomic
-- ---------------------------------------------------------------------------
create or replace function public.reverse_journal_entry_atomic(
  p_journal_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orig public.journal_entries%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_lines jsonb;
  v_result jsonb;
  v_rev_id uuid;
begin
  if p_journal_id is null then
    raise exception 'JOURNAL_ID_REQUIRED';
  end if;
  if v_reason = '' then
    raise exception 'REVERSAL_REASON_REQUIRED';
  end if;

  select * into v_orig
  from public.journal_entries
  where id = p_journal_id
  for update;

  if not found then
    raise exception 'JOURNAL_NOT_FOUND';
  end if;
  if v_orig.status <> 'posted' then
    raise exception 'JOURNAL_NOT_POSTED';
  end if;
  if v_orig.reversed_by_journal_id is not null then
    raise exception 'JOURNAL_ALREADY_REVERSED';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'accountId', jel.account_id,
      'debit', jel.credit,
      'credit', jel.debit
    )
    order by jel.id
  ), '[]'::jsonb)
  into v_lines
  from public.journal_entry_lines jel
  where jel.journal_entry_id = p_journal_id;

  v_result := public.create_journal_entry_atomic(
    v_orig.branch_id,
    (timezone('Asia/Karachi', now()))::date,
    'Reversal: ' || v_orig.description || ' — ' || v_reason,
    coalesce(v_orig.reference_type, 'journal_reversal'),
    v_orig.reference_id,
    'posted',
    p_actor_user_id,
    v_lines
  );

  v_rev_id := (v_result->>'id')::uuid;

  update public.journal_entries
  set reverses_journal_id = p_journal_id
  where id = v_rev_id;

  update public.journal_entries
  set
    status = 'voided',
    reversed_by_journal_id = v_rev_id
  where id = p_journal_id;

  update public.finance_postings
  set
    status = 'reversed',
    reversal_journal_entry_id = v_rev_id,
    reversal_reason = v_reason
  where journal_entry_id = p_journal_id
    and status = 'posted';

  return jsonb_build_object(
    'originalJournalId', p_journal_id,
    'reversalJournalId', v_rev_id,
    'reversal', v_result
  );
end;
$$;

comment on function public.reverse_journal_entry_atomic(uuid, uuid, text) is
  'Creates equal-and-opposite posted journal; marks original voided. Original lines preserved.';

revoke all on function public.reverse_journal_entry_atomic(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.reverse_journal_entry_atomic(uuid, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- AP: exception columns + due date + payment idempotency
-- ---------------------------------------------------------------------------
alter table public.supplier_invoices
  add column if not exists due_date date;

alter table public.supplier_invoices
  add column if not exists exception_approved_at timestamptz;

alter table public.supplier_invoices
  add column if not exists exception_approved_by uuid references auth.users (id) on delete set null;

alter table public.supplier_invoices
  add column if not exists exception_reason text;

alter table public.supplier_payments
  add column if not exists idempotency_key varchar(100);

create unique index if not exists uq_supplier_payments_idempotency
  on public.supplier_payments (idempotency_key)
  where idempotency_key is not null;

create or replace function public.record_supplier_payment_atomic(
  p_branch_id uuid,
  p_supplier_id uuid,
  p_supplier_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_reference text,
  p_idempotency_key text default null
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
  v_idem text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_existing public.supplier_payments%rowtype;
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

  if v_idem is not null then
    select * into v_existing
    from public.supplier_payments
    where idempotency_key = v_idem;

    if found then
      select coalesce(sum(amount), 0) into v_paid
      from public.supplier_payments
      where supplier_invoice_id = v_existing.supplier_invoice_id;

      select status into v_status
      from public.supplier_invoices
      where id = v_existing.supplier_invoice_id;

      return jsonb_build_object(
        'paymentId', v_existing.id,
        'invoiceId', v_existing.supplier_invoice_id,
        'invoiceStatus', v_status,
        'amountPaid', v_paid,
        'invoiceTotal', (
          select total_amount from public.supplier_invoices where id = v_existing.supplier_invoice_id
        ),
        'idempotentReplay', true
      );
    end if;
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

  -- Block settlement on unresolved three-way discrepancy.
  if v_invoice.matching_status = 'DISCREPANCY'
     and v_invoice.exception_approved_at is null then
    raise exception 'INVOICE_MATCH_DISCREPANCY';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.supplier_payments
  where supplier_invoice_id = p_supplier_invoice_id;

  if v_paid + p_amount > v_invoice.total_amount + 0.001 then
    raise exception 'PAYMENT_EXCEEDS_BALANCE';
  end if;

  insert into public.supplier_payments (
    branch_id, supplier_id, supplier_invoice_id, amount, payment_date, payment_method, reference, idempotency_key
  ) values (
    p_branch_id,
    p_supplier_id,
    p_supplier_invoice_id,
    p_amount,
    coalesce(p_payment_date, (timezone('Asia/Karachi', now()))::date),
    v_method,
    nullif(trim(coalesce(p_reference, '')), ''),
    v_idem
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
    'invoiceTotal', v_invoice.total_amount,
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.record_supplier_payment_atomic(uuid, uuid, uuid, numeric, date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_supplier_payment_atomic(uuid, uuid, uuid, numeric, date, text, text, text)
  to service_role;

-- Keep 7-arg overload for existing callers (forwards with null idempotency).
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
begin
  return public.record_supplier_payment_atomic(
    p_branch_id,
    p_supplier_id,
    p_supplier_invoice_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_reference,
    null
  );
end;
$$;

revoke all on function public.record_supplier_payment_atomic(uuid, uuid, uuid, numeric, date, text, text)
  from public, anon, authenticated;
grant execute on function public.record_supplier_payment_atomic(uuid, uuid, uuid, numeric, date, text, text)
  to service_role;

commit;
