-- Complete procurement loop: PO approval decision status + audit columns.
-- purchase_requisitions and goods_receiving already exist (20260730180000).

-- ---------------------------------------------------------------------------
-- Allow rejected on purchase_orders (approve / reject workflow)
-- ---------------------------------------------------------------------------
alter table public.purchase_orders drop constraint if exists purchase_orders_status_check;

alter table public.purchase_orders
  add constraint purchase_orders_status_check check (
    status in (
      'draft',
      'submitted',
      'approved',
      'ordered',
      'partially_received',
      'received',
      'cancelled',
      'rejected'
    )
  );

alter table public.purchase_orders
  add column if not exists approved_by uuid references public.users (id) on delete set null;

alter table public.purchase_orders
  add column if not exists approved_at timestamptz;

alter table public.purchase_orders
  add column if not exists approval_notes text;

comment on column public.purchase_orders.approved_by is
  'Staff user who approved or rejected the purchase order.';
comment on column public.purchase_orders.approved_at is
  'UTC timestamp of the approval decision.';
comment on column public.purchase_orders.approval_notes is
  'Optional notes captured with approve/reject.';

notify pgrst, 'reload schema';
