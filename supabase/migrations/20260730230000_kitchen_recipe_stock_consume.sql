-- REQ-KIT-012: menu→inventory recipe components + atomic kitchen preparing stock consume.
-- Additive only. Uses movement_type 'sale' (REQ SALE). Service-role RPCs only.

begin;

-- ---------------------------------------------------------------------------
-- 1) Allow movement_type = sale
-- ---------------------------------------------------------------------------
alter table public.stock_movements
  drop constraint if exists stock_movements_movement_type_check;

alter table public.stock_movements
  add constraint stock_movements_movement_type_check
  check (
    movement_type in (
      'receipt',
      'adjustment',
      'transfer_in',
      'transfer_out',
      'waste',
      'sale_consumption',
      'purchase',
      'sale'
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Recipe / BOM mapping: menu_item → inventory_item
-- ---------------------------------------------------------------------------
create table if not exists public.menu_item_inventory_components (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity_per_unit numeric(14, 3) not null check (quantity_per_unit > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (menu_item_id, inventory_item_id)
);

comment on table public.menu_item_inventory_components is
  'REQ-KIT-012 recipe mapping. When kitchen ticket → preparing, mapped components deduct stock atomically.';

create index if not exists idx_menu_item_inv_comp_menu
  on public.menu_item_inventory_components (menu_item_id);
create index if not exists idx_menu_item_inv_comp_inv
  on public.menu_item_inventory_components (inventory_item_id);

alter table public.menu_item_inventory_components enable row level security;

drop policy if exists "Staff select menu_item_inventory_components" on public.menu_item_inventory_components;
create policy "Staff select menu_item_inventory_components"
  on public.menu_item_inventory_components
  for select
  to authenticated
  using (
    exists (
      select 1 from public.inventory_items ii
      where ii.id = inventory_item_id
        and public.current_user_has_branch_access(ii.branch_id)
    )
  );

revoke all on public.menu_item_inventory_components from public, anon, authenticated;
grant select on public.menu_item_inventory_components to authenticated;
grant all on public.menu_item_inventory_components to service_role;

-- ---------------------------------------------------------------------------
-- 3) Atomic: set ticket preparing + consume mapped stock (or roll back)
-- ---------------------------------------------------------------------------
create or replace function public.kitchen_ticket_set_preparing_atomic(
  p_ticket_id uuid,
  p_actor_user_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.kitchen_tickets%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_need record;
  v_item public.inventory_items%rowtype;
  v_required numeric(14, 3);
  v_next numeric(14, 3);
  v_consumed int := 0;
  v_order_status text;
begin
  if p_ticket_id is null then
    raise exception 'TICKET_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_ticket
  from public.kitchen_tickets
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'KITCHEN_TICKET_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Idempotent: already preparing
  if v_ticket.status = 'preparing' then
    return jsonb_build_object(
      'ticketId', v_ticket.id,
      'status', 'preparing',
      'orderId', v_ticket.order_id,
      'idempotentReplay', true,
      'consumedLines', 0
    );
  end if;

  if v_ticket.status not in ('queued', 'accepted') then
    raise exception 'TICKET_TRANSITION_DENIED' using errcode = 'P0001';
  end if;

  -- Aggregate required inventory from recipe mappings (unmapped menu items skipped).
  for v_need in
    select
      c.inventory_item_id,
      sum(c.quantity_per_unit * oi.quantity)::numeric(14, 3) as qty_needed,
      max(ii.name) as item_name
    from public.order_items oi
    join public.menu_item_inventory_components c
      on c.menu_item_id = oi.menu_item_id
    join public.inventory_items ii
      on ii.id = c.inventory_item_id
    where oi.order_id = v_ticket.order_id
      and ii.branch_id = v_ticket.branch_id
    group by c.inventory_item_id
  loop
    v_required := v_need.qty_needed;

    select * into v_item
    from public.inventory_items
    where id = v_need.inventory_item_id
    for update;

    if not found then
      continue;
    end if;

    if v_item.current_stock < v_required then
      raise exception 'Insufficient stock for %', coalesce(v_need.item_name, v_item.name)
        using errcode = 'P0001';
    end if;

    v_next := v_item.current_stock - v_required;

    insert into public.stock_movements (
      inventory_item_id,
      branch_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      reason,
      created_by
    ) values (
      v_item.id,
      v_item.branch_id,
      'sale',
      -v_required,
      'kitchen_ticket',
      v_ticket.id,
      'Kitchen preparing consume',
      p_actor_user_id
    );

    update public.inventory_items
    set current_stock = v_next,
        updated_at = v_now
    where id = v_item.id;

    v_consumed := v_consumed + 1;
  end loop;

  update public.kitchen_tickets
  set status = 'preparing',
      started_at = coalesce(started_at, v_now),
      updated_at = v_now
  where id = v_ticket.id
    and status = v_ticket.status;

  if not found then
    raise exception 'TICKET_STATE_CONFLICT' using errcode = 'P0001';
  end if;

  -- Mirror order to preparing when still confirmed.
  select status into v_order_status from public.orders where id = v_ticket.order_id for update;
  if v_order_status = 'confirmed' then
    update public.orders
    set status = 'preparing', updated_at = v_now
    where id = v_ticket.order_id and status = 'confirmed';

    if found then
      insert into public.order_status_logs (
        order_id, from_status, to_status, actor_type, actor_user_id, note
      ) values (
        v_ticket.order_id, 'confirmed', 'preparing', 'staff', p_actor_user_id,
        coalesce(nullif(btrim(p_note), ''), 'Kitchen ticket → preparing')
      );
      v_order_status := 'preparing';
    end if;
  end if;

  return jsonb_build_object(
    'ticketId', v_ticket.id,
    'status', 'preparing',
    'orderId', v_ticket.order_id,
    'orderStatus', v_order_status,
    'idempotentReplay', false,
    'consumedLines', v_consumed
  );
end;
$$;

comment on function public.kitchen_ticket_set_preparing_atomic(uuid, uuid, text) is
  'REQ-KIT-012: Atomically set kitchen ticket to preparing and deduct mapped recipe stock (sale movements). Insufficient stock rolls back the status change.';

revoke all on function public.kitchen_ticket_set_preparing_atomic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.kitchen_ticket_set_preparing_atomic(uuid, uuid, text) to service_role;

commit;
