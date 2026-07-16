-- Sprint 4.1 — Orders quote/pricing snapshots + idempotency (forward-only)
-- Does NOT unlock staff lifecycle, OTP, kitchen, or rider APIs.
-- Production apply requires owner approval (do not auto-deploy as production gate).

alter table public.orders
  add column if not exists contact_phone_e164 varchar(20),
  add column if not exists idempotency_key varchar(100),
  add column if not exists idempotency_request_hash varchar(64),
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists cancel_reason_code varchar(50),
  add column if not exists cancel_note text;

create unique index if not exists uq_orders_idempotency_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_orders_contact_phone_e164
  on public.orders (contact_phone_e164)
  where contact_phone_e164 is not null;

alter table public.order_items
  add column if not exists extras_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists food_unit_price numeric(12, 2);

create table if not exists public.order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_type text not null default 'system' check (
    actor_type in ('customer', 'staff', 'system', 'guest')
  ),
  actor_user_id uuid references public.users (id) on delete set null,
  reason_code varchar(50),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_status_logs_order_id
  on public.order_status_logs (order_id, created_at);

alter table public.order_status_logs enable row level security;
