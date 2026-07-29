-- =============================================================================
-- Phase 2 continuation: branch delivery fee + minimum order
-- Additive only. Depends on delivery_radius_km from 20260729140000.
-- =============================================================================

begin;

alter table public.branches
  add column if not exists delivery_fee numeric(12, 2);

alter table public.branches
  add column if not exists minimum_order_amount numeric(12, 2);

alter table public.branches drop constraint if exists chk_branches_delivery_fee;
alter table public.branches
  add constraint chk_branches_delivery_fee
  check (delivery_fee is null or delivery_fee >= 0);

alter table public.branches drop constraint if exists chk_branches_minimum_order_amount;
alter table public.branches
  add constraint chk_branches_minimum_order_amount
  check (minimum_order_amount is null or minimum_order_amount >= 0);

comment on column public.branches.delivery_fee is
  'Configured delivery fee in PKR for this branch. Null means not configured.';
comment on column public.branches.minimum_order_amount is
  'Minimum order subtotal (PKR) for delivery. Null means not configured.';

commit;
