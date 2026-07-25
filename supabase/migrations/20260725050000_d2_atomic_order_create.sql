-- =============================================================================
-- D2 — Atomic order creation (true PostgreSQL transaction)
-- Forward-only. service_role only.
--
-- Replaces Node sequential inserts + compensating deletes for opening-critical
-- order creation. Pricing remains validated in the API; this RPC persists the
-- already-validated snapshot atomically.
--
-- Rollback notes (manual, if ever required):
--   drop function if exists public.create_order_atomic(text, text, uuid, jsonb, jsonb, boolean, jsonb, boolean, boolean, text, uuid);
--   drop function if exists public.next_order_number();
--   drop sequence if exists public.orders_number_seq;
-- Does NOT drop orders / items / tickets tables or existing rows.
--
-- Test-only failure injection (local integration tests):
--   SET LOCAL telepizza.d2_force_fail = 'order_item' | 'modifier' | 'delivery' | 'payment' | 'kitchen';
--   Honored only when telepizza.d2_test_mode = 'on'. Never set in production.
-- =============================================================================

begin;

create sequence if not exists public.orders_number_seq;

create or replace function public.next_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
begin
  v_seq := nextval('public.orders_number_seq');
  return 'TP-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

revoke all on function public.next_order_number() from public, anon, authenticated;
grant execute on function public.next_order_number() to service_role;

comment on function public.next_order_number() is
  'Allocates a unique TP-YYMMDD-###### order number. service_role only.';

/**
 * Atomic order create.
 *
 * p_order keys:
 *   order_type, order_source, status, subtotal, discount_amount, tax_amount,
 *   delivery_fee, total_amount, payment_status, contact_name, contact_phone,
 *   contact_phone_e164, delivery_address, notes, pricing_snapshot, auth_user_id,
 *   customer_id
 *
 * p_items: array of {
 *   menu_item_id, variant_id, product_name, variant_name, quantity,
 *   unit_price, total_price, food_unit_price, extras_snapshot, instructions,
 *   modifiers: [{ modifier_option_id, group_code, group_name, option_code,
 *                 option_name, price_delta, unit_price, total_price, quantity, sort_order }]
 * }
 *
 * p_delivery: { delivery_address } when p_create_delivery
 * p_create_kitchen_ticket: when true, requires status confirmed and creates ticket+items
 * p_create_payment_pending: when true, inserts payments row status=pending
 */
create or replace function public.create_order_atomic(
  p_idempotency_key text,
  p_idempotency_request_hash text,
  p_branch_id uuid,
  p_order jsonb,
  p_items jsonb,
  p_create_delivery boolean default false,
  p_delivery jsonb default '{}'::jsonb,
  p_create_kitchen_ticket boolean default false,
  p_create_payment_pending boolean default false,
  p_actor_type text default 'guest',
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_status text;
  v_existing record;
  v_order_id uuid;
  v_order_number text;
  v_status text;
  v_item jsonb;
  v_mod jsonb;
  v_order_item_id uuid;
  v_ticket_id uuid;
  v_item_ids uuid[] := '{}';
  v_idx integer := 0;
  v_result jsonb;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED'
      using errcode = 'P0001';
  end if;

  if p_idempotency_request_hash is null or length(trim(p_idempotency_request_hash)) = 0 then
    raise exception 'IDEMPOTENCY_HASH_REQUIRED'
      using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED'
      using errcode = 'P0001';
  end if;

  select status into v_branch_status
  from public.branches
  where id = p_branch_id;

  if v_branch_status is null then
    raise exception 'BRANCH_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  if v_branch_status = 'inactive' then
    raise exception 'BRANCH_INACTIVE'
      using errcode = 'P0001';
  end if;

  if v_branch_status <> 'operating' then
    raise exception 'BRANCH_NOT_OPERATIONAL'
      using errcode = 'P0001';
  end if;

  -- Idempotent replay / conflict (unique index also races safely)
  select id, order_number, status, subtotal, discount_amount, tax_amount,
         delivery_fee, total_amount, created_at, idempotency_request_hash
    into v_existing
  from public.orders
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then
    if v_existing.idempotency_request_hash is distinct from trim(p_idempotency_request_hash) then
      raise exception 'IDEMPOTENCY_CONFLICT'
        using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'orderNumber', v_existing.order_number,
      'status', v_existing.status,
      'subtotal', v_existing.subtotal,
      'discountAmount', v_existing.discount_amount,
      'taxAmount', v_existing.tax_amount,
      'deliveryFee', v_existing.delivery_fee,
      'totalAmount', v_existing.total_amount,
      'createdAt', v_existing.created_at,
      'idempotentReplay', true,
      'kitchenTicketId', (
        select kt.id from public.kitchen_tickets kt where kt.order_id = v_existing.id limit 1
      )
    );
  end if;

  v_status := coalesce(nullif(p_order->>'status', ''), 'pending');
  if p_create_kitchen_ticket and v_status <> 'confirmed' then
    -- Kitchen tickets are only created for confirmed orders (DB-R5 Option B).
    v_status := 'confirmed';
  end if;

  v_order_number := public.next_order_number();
  v_order_id := gen_random_uuid();

  begin
    insert into public.orders (
      id, order_number, customer_id, auth_user_id, branch_id,
      order_type, order_source, status,
      subtotal, discount_amount, tax_amount, delivery_fee, total_amount,
      payment_status, contact_name, contact_phone, contact_phone_e164,
      delivery_address, notes, idempotency_key, idempotency_request_hash,
      pricing_snapshot
    ) values (
      v_order_id,
      v_order_number,
      nullif(p_order->>'customer_id', '')::uuid,
      nullif(p_order->>'auth_user_id', '')::uuid,
      p_branch_id,
      p_order->>'order_type',
      p_order->>'order_source',
      v_status,
      coalesce((p_order->>'subtotal')::numeric, 0),
      coalesce((p_order->>'discount_amount')::numeric, 0),
      coalesce((p_order->>'tax_amount')::numeric, 0),
      coalesce((p_order->>'delivery_fee')::numeric, 0),
      coalesce((p_order->>'total_amount')::numeric, 0),
      coalesce(nullif(p_order->>'payment_status', ''), 'pending'),
      p_order->>'contact_name',
      p_order->>'contact_phone',
      nullif(p_order->>'contact_phone_e164', ''),
      nullif(p_order->>'delivery_address', ''),
      nullif(p_order->>'notes', ''),
      trim(p_idempotency_key),
      trim(p_idempotency_request_hash),
      coalesce(p_order->'pricing_snapshot', '{}'::jsonb)
    );
  exception
    when unique_violation then
      -- Concurrent idempotency race — reload
      select id, order_number, status, subtotal, discount_amount, tax_amount,
             delivery_fee, total_amount, created_at, idempotency_request_hash
        into v_existing
      from public.orders
      where idempotency_key = trim(p_idempotency_key)
      limit 1;
      if found then
        if v_existing.idempotency_request_hash is distinct from trim(p_idempotency_request_hash) then
          raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
        end if;
        return jsonb_build_object(
          'id', v_existing.id,
          'orderNumber', v_existing.order_number,
          'status', v_existing.status,
          'subtotal', v_existing.subtotal,
          'discountAmount', v_existing.discount_amount,
          'taxAmount', v_existing.tax_amount,
          'deliveryFee', v_existing.delivery_fee,
          'totalAmount', v_existing.total_amount,
          'createdAt', v_existing.created_at,
          'idempotentReplay', true,
          'kitchenTicketId', (
            select kt.id from public.kitchen_tickets kt where kt.order_id = v_existing.id limit 1
          )
        );
      end if;
      raise;
  end;

  if current_setting('telepizza.d2_test_mode', true) = 'on'
     and current_setting('telepizza.d2_force_fail', true) = 'order_item' then
    raise exception 'D2_FORCE_FAIL_ORDER_ITEM' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_order_item_id := gen_random_uuid();
    v_item_ids := array_append(v_item_ids, v_order_item_id);
    insert into public.order_items (
      id, order_id, menu_item_id, variant_id, product_name, variant_name,
      quantity, unit_price, total_price, food_unit_price, extras_snapshot, instructions
    ) values (
      v_order_item_id,
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      nullif(v_item->>'variant_id', '')::uuid,
      v_item->>'product_name',
      nullif(v_item->>'variant_name', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      nullif(v_item->>'food_unit_price', '')::numeric,
      coalesce(v_item->'extras_snapshot', '[]'::jsonb),
      nullif(v_item->>'instructions', '')
    );

    if v_item ? 'modifiers' and jsonb_typeof(v_item->'modifiers') = 'array' then
      if current_setting('telepizza.d2_test_mode', true) = 'on'
         and current_setting('telepizza.d2_force_fail', true) = 'modifier' then
        raise exception 'D2_FORCE_FAIL_MODIFIER' using errcode = 'P0001';
      end if;
      for v_mod in select * from jsonb_array_elements(v_item->'modifiers')
      loop
        insert into public.order_item_modifiers (
          order_item_id, modifier_option_id, group_code, group_name,
          option_code, option_name, price_delta, unit_price, total_price,
          quantity, sort_order
        ) values (
          v_order_item_id,
          (v_mod->>'modifier_option_id')::uuid,
          v_mod->>'group_code',
          v_mod->>'group_name',
          v_mod->>'option_code',
          v_mod->>'option_name',
          coalesce((v_mod->>'price_delta')::numeric, 0),
          coalesce((v_mod->>'unit_price')::numeric, 0),
          coalesce((v_mod->>'total_price')::numeric, 0),
          coalesce((v_mod->>'quantity')::integer, 1),
          coalesce((v_mod->>'sort_order')::integer, 0)
        );
      end loop;
    end if;
  end loop;

  if p_create_delivery then
    if current_setting('telepizza.d2_test_mode', true) = 'on'
       and current_setting('telepizza.d2_force_fail', true) = 'delivery' then
      raise exception 'D2_FORCE_FAIL_DELIVERY' using errcode = 'P0001';
    end if;
    insert into public.deliveries (
      order_id, branch_id, delivery_address, status
    ) values (
      v_order_id,
      p_branch_id,
      coalesce(nullif(p_delivery->>'delivery_address', ''), p_order->>'delivery_address'),
      'pending'
    );
  end if;

  if p_create_payment_pending then
    if current_setting('telepizza.d2_test_mode', true) = 'on'
       and current_setting('telepizza.d2_force_fail', true) = 'payment' then
      raise exception 'D2_FORCE_FAIL_PAYMENT' using errcode = 'P0001';
    end if;
    insert into public.payments (
      order_id, payment_method, amount, currency, status
    ) values (
      v_order_id,
      coalesce(nullif(p_order->>'payment_method', ''), 'cash'),
      coalesce((p_order->>'total_amount')::numeric, 0),
      'PKR',
      'pending'
    );
  end if;

  insert into public.order_status_logs (
    order_id, from_status, to_status, actor_type, actor_user_id, reason_code, note
  ) values (
    v_order_id,
    null,
    v_status,
    case when p_actor_type in ('customer', 'staff', 'system', 'guest') then p_actor_type else 'guest' end,
    p_actor_user_id,
    case when p_create_kitchen_ticket then 'pos_created' else 'created' end,
    null
  );

  if p_create_kitchen_ticket then
    if current_setting('telepizza.d2_test_mode', true) = 'on'
       and current_setting('telepizza.d2_force_fail', true) = 'kitchen' then
      raise exception 'D2_FORCE_FAIL_KITCHEN' using errcode = 'P0001';
    end if;
    v_ticket_id := gen_random_uuid();
    insert into public.kitchen_tickets (
      id, order_id, branch_id, status, priority
    ) values (
      v_ticket_id, v_order_id, p_branch_id, 'queued', 0
    );

    v_idx := 0;
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      v_idx := v_idx + 1;
      insert into public.kitchen_ticket_items (
        kitchen_ticket_id, order_item_id, item_name_snapshot, modifiers_snapshot, quantity
      ) values (
        v_ticket_id,
        v_item_ids[v_idx],
        coalesce(
          nullif(v_item->>'product_name', '') ||
            case when nullif(v_item->>'variant_name', '') is not null
              then ' (' || (v_item->>'variant_name') || ')' else '' end,
          'Item'
        ),
        coalesce(v_item->'modifiers_snapshot', '[]'::jsonb),
        (v_item->>'quantity')::integer
      );
    end loop;
  end if;

  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'status', o.status,
    'subtotal', o.subtotal,
    'discountAmount', o.discount_amount,
    'taxAmount', o.tax_amount,
    'deliveryFee', o.delivery_fee,
    'totalAmount', o.total_amount,
    'createdAt', o.created_at,
    'idempotentReplay', false,
    'kitchenTicketId', v_ticket_id
  )
  into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

revoke all on function public.create_order_atomic(
  text, text, uuid, jsonb, jsonb, boolean, jsonb, boolean, boolean, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_order_atomic(
  text, text, uuid, jsonb, jsonb, boolean, jsonb, boolean, boolean, text, uuid
) to service_role;

comment on function public.create_order_atomic(
  text, text, uuid, jsonb, jsonb, boolean, jsonb, boolean, boolean, text, uuid
) is
  'D2 atomic order create (order+items+modifiers+optional delivery/payment/kitchen). service_role only. Single transaction; raises P0001 business codes.';

commit;
