-- Atomic inventory adjustments + GRN line stock posting.
-- Additive only. Service-role executes security-definer RPCs.

begin;

-- ---------------------------------------------------------------------------
-- 1) Allow movement_type = purchase (GRN receipts)
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
      'purchase'
    )
  );

-- ---------------------------------------------------------------------------
-- 2) GRN lines — optional inventory mapping for stock posting
-- ---------------------------------------------------------------------------
create table if not exists public.goods_receiving_lines (
  id uuid primary key default gen_random_uuid(),
  goods_receiving_id uuid not null references public.goods_receiving (id) on delete cascade,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  quantity_received numeric(14, 3) not null check (quantity_received > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.goods_receiving_lines is
  'Optional GRN lines. When inventory_item_id is set and item exists, stock is posted atomically on GRN create.';

create index if not exists idx_goods_receiving_lines_grn
  on public.goods_receiving_lines (goods_receiving_id);

create index if not exists idx_goods_receiving_lines_item
  on public.goods_receiving_lines (inventory_item_id);

alter table public.goods_receiving_lines enable row level security;

drop policy if exists "Staff select branch goods_receiving_lines" on public.goods_receiving_lines;
create policy "Staff select branch goods_receiving_lines"
  on public.goods_receiving_lines
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.goods_receiving gr
      where gr.id = goods_receiving_id
        and public.current_user_has_branch_access(gr.branch_id)
    )
  );

revoke all on public.goods_receiving_lines from public, anon, authenticated;
grant select on public.goods_receiving_lines to authenticated;
grant all on public.goods_receiving_lines to service_role;

-- ---------------------------------------------------------------------------
-- 3) Atomic stock adjustment: lock → insert movement → update on-hand
-- ---------------------------------------------------------------------------
create or replace function public.adjust_inventory_stock_atomic(
  p_inventory_item_id uuid,
  p_quantity_delta numeric,
  p_movement_type text default 'adjustment',
  p_reason text default null,
  p_actor_user_id uuid default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_next numeric(14, 3);
  v_movement_id uuid;
  v_movement_type text;
begin
  if p_inventory_item_id is null then
    raise exception 'INVENTORY_ITEM_ID_REQUIRED' using errcode = 'P0001';
  end if;
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'QUANTITY_DELTA_INVALID' using errcode = 'P0001';
  end if;

  v_movement_type := coalesce(nullif(btrim(p_movement_type), ''), 'adjustment');
  if v_movement_type not in (
    'receipt', 'adjustment', 'transfer_in', 'transfer_out', 'waste', 'sale_consumption', 'purchase'
  ) then
    raise exception 'MOVEMENT_TYPE_INVALID' using errcode = 'P0001';
  end if;

  select * into v_item
  from public.inventory_items
  where id = p_inventory_item_id
  for update;

  if not found then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_next := v_item.current_stock + p_quantity_delta;
  if v_next < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

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
    v_movement_type,
    p_quantity_delta,
    nullif(btrim(coalesce(p_reference_type, '')), ''),
    p_reference_id,
    nullif(btrim(coalesce(p_reason, '')), ''),
    p_actor_user_id
  )
  returning id into v_movement_id;

  update public.inventory_items
  set current_stock = v_next,
      updated_at = timezone('utc', now())
  where id = v_item.id;

  if not found then
    -- Forces full transaction rollback — movement insert above is undone.
    raise exception 'INVENTORY_STOCK_UPDATE_FAILED' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'item', jsonb_build_object(
      'id', v_item.id,
      'branchId', v_item.branch_id,
      'sku', v_item.sku,
      'name', v_item.name,
      'category', v_item.category,
      'unit', v_item.unit,
      'currentStock', v_next,
      'minimumStock', v_item.minimum_stock,
      'reorderLevel', v_item.reorder_level,
      'costPrice', v_item.cost_price,
      'status', v_item.status,
      'createdAt', v_item.created_at,
      'updatedAt', timezone('utc', now())
    ),
    'movement', jsonb_build_object(
      'id', v_movement_id,
      'inventoryItemId', v_item.id,
      'branchId', v_item.branch_id,
      'movementType', v_movement_type,
      'quantity', p_quantity_delta,
      'referenceType', nullif(btrim(coalesce(p_reference_type, '')), ''),
      'referenceId', p_reference_id,
      'reason', nullif(btrim(coalesce(p_reason, '')), ''),
      'createdBy', p_actor_user_id,
      'itemName', v_item.name,
      'itemSku', v_item.sku
    )
  );
end;
$$;

comment on function public.adjust_inventory_stock_atomic(uuid, numeric, text, text, uuid, text, uuid) is
  'Atomically inserts stock_movements and updates inventory_items.current_stock. Either both commit or both roll back. Service-role only.';

revoke all on function public.adjust_inventory_stock_atomic(uuid, numeric, text, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.adjust_inventory_stock_atomic(uuid, numeric, text, text, uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Atomic GRN create + optional stock posting for mapped lines
-- ---------------------------------------------------------------------------
create or replace function public.create_goods_receiving_with_stock_atomic(
  p_branch_id uuid,
  p_purchase_order_id uuid default null,
  p_grn_number text default null,
  p_status text default 'posted',
  p_notes text default null,
  p_received_at timestamptz default null,
  p_actor_user_id uuid default null,
  p_lines jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grn public.goods_receiving%rowtype;
  v_grn_number text;
  v_status text;
  v_received_at timestamptz;
  v_line jsonb;
  v_item_id uuid;
  v_qty numeric(14, 3);
  v_item public.inventory_items%rowtype;
  v_next numeric(14, 3);
  v_movement_id uuid;
  v_line_id uuid;
  v_posted jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_po record;
begin
  if p_branch_id is null then
    raise exception 'BRANCH_ID_REQUIRED' using errcode = 'P0001';
  end if;

  v_status := coalesce(nullif(btrim(p_status), ''), 'posted');
  if v_status not in ('draft', 'posted', 'cancelled') then
    raise exception 'GRN_STATUS_INVALID' using errcode = 'P0001';
  end if;

  if p_purchase_order_id is not null then
    select id, branch_id into v_po
    from public.purchase_orders
    where id = p_purchase_order_id;
    if not found then
      raise exception 'PURCHASE_ORDER_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_po.branch_id <> p_branch_id then
      raise exception 'PO_BRANCH_MISMATCH' using errcode = 'P0001';
    end if;
  end if;

  v_grn_number := upper(coalesce(nullif(btrim(p_grn_number), ''), 'GRN-' || to_char(timezone('utc', now()), 'YYYYMMDD-HH24MISS')));
  v_received_at := coalesce(p_received_at, timezone('utc', now()));

  insert into public.goods_receiving (
    branch_id,
    purchase_order_id,
    grn_number,
    status,
    notes,
    received_at,
    created_by
  ) values (
    p_branch_id,
    p_purchase_order_id,
    v_grn_number,
    v_status,
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_received_at,
    p_actor_user_id
  )
  returning * into v_grn;

  if p_lines is not null and jsonb_typeof(p_lines) = 'array' then
    for v_line in select * from jsonb_array_elements(p_lines)
    loop
      begin
        v_item_id := nullif(v_line ->> 'inventoryItemId', '')::uuid;
      exception when others then
        v_item_id := null;
      end;

      begin
        v_qty := (v_line ->> 'quantity')::numeric;
      exception when others then
        v_qty := null;
      end;

      if v_qty is null or v_qty <= 0 then
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
          'inventoryItemId', v_line ->> 'inventoryItemId',
          'reason', 'invalid_quantity'
        ));
        continue;
      end if;

      if v_item_id is null then
        -- Persist line without stock post (unmapped).
        insert into public.goods_receiving_lines (
          goods_receiving_id, inventory_item_id, quantity_received, notes
        ) values (
          v_grn.id, null, v_qty, 'unmapped inventory item'
        );
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
          'inventoryItemId', null,
          'quantity', v_qty,
          'reason', 'missing_inventory_item'
        ));
        raise warning 'GRN %: skipping stock post — inventory item missing', v_grn.grn_number;
        continue;
      end if;

      select * into v_item
      from public.inventory_items
      where id = v_item_id
      for update;

      if not found then
        insert into public.goods_receiving_lines (
          goods_receiving_id, inventory_item_id, quantity_received, notes
        ) values (
          v_grn.id, null, v_qty, 'inventory item not found — stock not posted'
        );
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
          'inventoryItemId', v_item_id,
          'quantity', v_qty,
          'reason', 'inventory_item_not_found'
        ));
        raise warning 'GRN %: skipping stock post — inventory item % not found', v_grn.grn_number, v_item_id;
        continue;
      end if;

      if v_item.branch_id <> p_branch_id then
        raise exception 'LINE_BRANCH_MISMATCH' using errcode = 'P0001';
      end if;

      v_next := v_item.current_stock + v_qty;

      insert into public.goods_receiving_lines (
        goods_receiving_id, inventory_item_id, quantity_received
      ) values (
        v_grn.id, v_item.id, v_qty
      )
      returning id into v_line_id;

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
        'purchase',
        v_qty,
        'GRN',
        v_grn.id,
        'Goods receiving ' || v_grn.grn_number,
        p_actor_user_id
      )
      returning id into v_movement_id;

      update public.inventory_items
      set current_stock = v_next,
          updated_at = timezone('utc', now())
      where id = v_item.id;

      if not found then
        raise exception 'INVENTORY_STOCK_UPDATE_FAILED' using errcode = 'P0001';
      end if;

      v_posted := v_posted || jsonb_build_array(jsonb_build_object(
        'lineId', v_line_id,
        'inventoryItemId', v_item.id,
        'quantity', v_qty,
        'movementId', v_movement_id,
        'currentStock', v_next
      ));
    end loop;
  end if;

  if p_purchase_order_id is not null and v_status = 'posted' then
    update public.purchase_orders
    set status = 'partially_received',
        updated_at = timezone('utc', now())
    where id = p_purchase_order_id
      and status in ('draft', 'submitted', 'approved', 'ordered');
  end if;

  return jsonb_build_object(
    'id', v_grn.id,
    'branchId', v_grn.branch_id,
    'purchaseOrderId', v_grn.purchase_order_id,
    'grnNumber', v_grn.grn_number,
    'status', v_grn.status,
    'receivedAt', v_grn.received_at,
    'notes', v_grn.notes,
    'createdBy', v_grn.created_by,
    'createdAt', v_grn.created_at,
    'updatedAt', v_grn.updated_at,
    'postedLines', v_posted,
    'skippedLines', v_skipped
  );
end;
$$;

comment on function public.create_goods_receiving_with_stock_atomic(uuid, uuid, text, text, text, timestamptz, uuid, jsonb) is
  'Creates GRN header + optional lines and posts stock_movements (purchase) + current_stock atomically for mapped inventory items. Missing items are skipped with WARNING. Service-role only.';

revoke all on function public.create_goods_receiving_with_stock_atomic(uuid, uuid, text, text, text, timestamptz, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_goods_receiving_with_stock_atomic(uuid, uuid, text, text, text, timestamptz, uuid, jsonb) to service_role;

commit;
