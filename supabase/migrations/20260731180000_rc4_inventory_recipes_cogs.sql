-- RC4-9 Inventory Recipes & COGS-ready events
-- Additive. Keeps kitchen→preparing as the sole consume trigger.
-- No Production apply in this slice.

begin;

-- ---------------------------------------------------------------------------
-- 1) Versioned recipes (branch-scoped; inventory items are branch-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_recipes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  version integer not null check (version >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive')),
  yield_factor numeric(10, 4) not null default 1 check (yield_factor > 0),
  notes text,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, menu_item_id, version)
);

create unique index if not exists uq_inventory_recipes_one_active
  on public.inventory_recipes (branch_id, menu_item_id)
  where status = 'active';

create index if not exists idx_inventory_recipes_branch
  on public.inventory_recipes (branch_id, status);
create index if not exists idx_inventory_recipes_menu
  on public.inventory_recipes (menu_item_id, status);

comment on table public.inventory_recipes is
  'RC4-9 versioned menu→ingredient recipes. Active recipe syncs to menu_item_inventory_components for kitchen consume.';

alter table public.inventory_recipes enable row level security;

drop policy if exists "Staff select inventory_recipes" on public.inventory_recipes;
create policy "Staff select inventory_recipes"
  on public.inventory_recipes for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.inventory_recipes from public, anon, authenticated;
grant select on public.inventory_recipes to authenticated;
grant all on public.inventory_recipes to service_role;

-- ---------------------------------------------------------------------------
-- 2) Recipe ingredient lines
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_recipe_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.inventory_recipes (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  unit text not null,
  waste_factor numeric(10, 4) not null default 1 check (waste_factor > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, inventory_item_id)
);

create index if not exists idx_inventory_recipe_lines_recipe
  on public.inventory_recipe_lines (recipe_id);

alter table public.inventory_recipe_lines enable row level security;

drop policy if exists "Staff select inventory_recipe_lines" on public.inventory_recipe_lines;
create policy "Staff select inventory_recipe_lines"
  on public.inventory_recipe_lines for select to authenticated
  using (
    exists (
      select 1 from public.inventory_recipes r
      where r.id = recipe_id and public.current_user_has_branch_access(r.branch_id)
    )
  );

revoke all on public.inventory_recipe_lines from public, anon, authenticated;
grant select on public.inventory_recipe_lines to authenticated;
grant all on public.inventory_recipe_lines to service_role;

-- ---------------------------------------------------------------------------
-- 3) Optional modifier ingredient effects (documented; consume path base-only in RC4-9)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_recipe_modifier_effects (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.inventory_recipes (id) on delete cascade,
  modifier_option_id uuid not null references public.modifier_options (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity_delta numeric(14, 4) not null,
  unit text not null,
  effect_type text not null check (effect_type in ('add', 'remove')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, modifier_option_id, inventory_item_id, effect_type)
);

comment on table public.inventory_recipe_modifier_effects is
  'RC4-9 modifier BOM deltas. Kitchen consume uses base recipe lines only until modifier consume is certified.';

alter table public.inventory_recipe_modifier_effects enable row level security;
drop policy if exists "Staff select inventory_recipe_modifier_effects" on public.inventory_recipe_modifier_effects;
create policy "Staff select inventory_recipe_modifier_effects"
  on public.inventory_recipe_modifier_effects for select to authenticated
  using (
    exists (
      select 1 from public.inventory_recipes r
      where r.id = recipe_id and public.current_user_has_branch_access(r.branch_id)
    )
  );
revoke all on public.inventory_recipe_modifier_effects from public, anon, authenticated;
grant select on public.inventory_recipe_modifier_effects to authenticated;
grant all on public.inventory_recipe_modifier_effects to service_role;

-- ---------------------------------------------------------------------------
-- 4) Consumption events (idempotent) + line links to stock_movements
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_consumption_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  kitchen_ticket_id uuid references public.kitchen_tickets (id) on delete set null,
  event_type text not null check (event_type in ('consume', 'reverse')),
  idempotency_key text not null,
  source_event text not null default 'kitchen_preparing',
  request_id text,
  actor_user_id uuid references public.users (id) on delete set null,
  reversed_event_id uuid references public.inventory_consumption_events (id) on delete set null,
  status text not null default 'posted' check (status in ('posted', 'reversed', 'noop')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create index if not exists idx_inv_consumption_ticket
  on public.inventory_consumption_events (kitchen_ticket_id, event_type, created_at desc);
create index if not exists idx_inv_consumption_order
  on public.inventory_consumption_events (order_id, created_at desc);

alter table public.inventory_consumption_events enable row level security;
drop policy if exists "Staff select inventory_consumption_events" on public.inventory_consumption_events;
create policy "Staff select inventory_consumption_events"
  on public.inventory_consumption_events for select to authenticated
  using (public.current_user_has_branch_access(branch_id));
revoke all on public.inventory_consumption_events from public, anon, authenticated;
grant select on public.inventory_consumption_events to authenticated;
grant all on public.inventory_consumption_events to service_role;

create table if not exists public.inventory_consumption_event_lines (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.inventory_consumption_events (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  stock_movement_id uuid references public.stock_movements (id) on delete set null,
  quantity numeric(14, 4) not null,
  unit text,
  recipe_id uuid references public.inventory_recipes (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_inv_consumption_lines_event
  on public.inventory_consumption_event_lines (event_id);

alter table public.inventory_consumption_event_lines enable row level security;
drop policy if exists "Staff select inventory_consumption_event_lines" on public.inventory_consumption_event_lines;
create policy "Staff select inventory_consumption_event_lines"
  on public.inventory_consumption_event_lines for select to authenticated
  using (
    exists (
      select 1 from public.inventory_consumption_events e
      where e.id = event_id and public.current_user_has_branch_access(e.branch_id)
    )
  );
revoke all on public.inventory_consumption_event_lines from public, anon, authenticated;
grant select on public.inventory_consumption_event_lines to authenticated;
grant all on public.inventory_consumption_event_lines to service_role;

-- ---------------------------------------------------------------------------
-- 5) Stock exceptions + recipe audit + COGS-ready domain events
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_stock_exceptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  kitchen_ticket_id uuid references public.kitchen_tickets (id) on delete set null,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  exception_type text not null check (
    exception_type in (
      'missing_recipe',
      'incomplete_recipe',
      'insufficient_stock',
      'disabled_ingredient',
      'missing_stock_row',
      'unsupported_modifier',
      'unit_conversion_error'
    )
  ),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_inv_stock_exceptions_branch
  on public.inventory_stock_exceptions (branch_id, created_at desc);

alter table public.inventory_stock_exceptions enable row level security;
drop policy if exists "Staff select inventory_stock_exceptions" on public.inventory_stock_exceptions;
create policy "Staff select inventory_stock_exceptions"
  on public.inventory_stock_exceptions for select to authenticated
  using (public.current_user_has_branch_access(branch_id));
revoke all on public.inventory_stock_exceptions from public, anon, authenticated;
grant select on public.inventory_stock_exceptions to authenticated;
grant all on public.inventory_stock_exceptions to service_role;

create table if not exists public.inventory_recipe_audit_events (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.inventory_recipes (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  action text not null,
  actor_user_id uuid references public.users (id) on delete set null,
  request_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.inventory_recipe_audit_events enable row level security;
drop policy if exists "Staff select inventory_recipe_audit_events" on public.inventory_recipe_audit_events;
create policy "Staff select inventory_recipe_audit_events"
  on public.inventory_recipe_audit_events for select to authenticated
  using (branch_id is null or public.current_user_has_branch_access(branch_id));
revoke all on public.inventory_recipe_audit_events from public, anon, authenticated;
grant select on public.inventory_recipe_audit_events to authenticated;
grant all on public.inventory_recipe_audit_events to service_role;

create table if not exists public.inventory_cogs_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  kitchen_ticket_id uuid references public.kitchen_tickets (id) on delete set null,
  consumption_event_id uuid references public.inventory_consumption_events (id) on delete set null,
  event_type text not null check (event_type in ('cogs_ready', 'cogs_reverse_ready')),
  idempotency_key text not null,
  amount numeric(14, 2),
  currency text not null default 'PKR',
  cost_source text not null default 'last_purchase_cost_price'
    check (cost_source in ('last_purchase_cost_price', 'unavailable')),
  status text not null default 'pending'
    check (status in ('pending', 'posted', 'deferred', 'skipped')),
  posting_deferred_reason text,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

comment on table public.inventory_cogs_events is
  'RC4-9 COGS-ready domain events. GL posting DEFERRED until finance account mapping purpose exists.';

alter table public.inventory_cogs_events enable row level security;
drop policy if exists "Staff select inventory_cogs_events" on public.inventory_cogs_events;
create policy "Staff select inventory_cogs_events"
  on public.inventory_cogs_events for select to authenticated
  using (public.current_user_has_branch_access(branch_id));
revoke all on public.inventory_cogs_events from public, anon, authenticated;
grant select on public.inventory_cogs_events to authenticated;
grant all on public.inventory_cogs_events to service_role;

-- ---------------------------------------------------------------------------
-- 6) Enhance preparing consume: consumption event + COGS-ready + missing-recipe exceptions
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
  v_required numeric(14, 4);
  v_next numeric(14, 4);
  v_consumed int := 0;
  v_order_status text;
  v_event_id uuid;
  v_idem text;
  v_movement_id uuid;
  v_cogs_amount numeric(14, 2) := 0;
  v_cogs_available boolean := true;
  v_line_cost numeric(14, 4);
  v_missing record;
  v_existing_event_id uuid;
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

  v_idem := 'kitchen_ticket:' || v_ticket.id::text || ':consume';

  select id into v_existing_event_id
  from public.inventory_consumption_events
  where idempotency_key = v_idem
  limit 1;

  if v_existing_event_id is not null then
    -- Consumption already posted (should not happen if ticket not preparing) — treat as noop for stock.
    update public.kitchen_tickets
    set status = 'preparing',
        started_at = coalesce(started_at, v_now),
        updated_at = v_now
    where id = v_ticket.id;

    return jsonb_build_object(
      'ticketId', v_ticket.id,
      'status', 'preparing',
      'orderId', v_ticket.order_id,
      'idempotentReplay', true,
      'consumedLines', 0,
      'consumptionEventId', v_existing_event_id
    );
  end if;

  -- Missing-recipe exceptions (non-blocking): order lines without active recipe and without legacy mapping
  for v_missing in
    select distinct oi.menu_item_id
    from public.order_items oi
    where oi.order_id = v_ticket.order_id
      and oi.menu_item_id is not null
      and not exists (
        select 1 from public.inventory_recipes r
        where r.menu_item_id = oi.menu_item_id
          and r.branch_id = v_ticket.branch_id
          and r.status = 'active'
      )
      and not exists (
        select 1 from public.menu_item_inventory_components c
        where c.menu_item_id = oi.menu_item_id
      )
  loop
    insert into public.inventory_stock_exceptions (
      branch_id, order_id, kitchen_ticket_id, menu_item_id, exception_type, message, metadata
    ) values (
      v_ticket.branch_id, v_ticket.order_id, v_ticket.id, v_missing.menu_item_id,
      'missing_recipe',
      'Sellable order line has no active recipe and no legacy BOM mapping; stock not deducted for this item.',
      jsonb_build_object('source', 'kitchen_preparing')
    );
  end loop;

  insert into public.inventory_consumption_events (
    branch_id, order_id, kitchen_ticket_id, event_type, idempotency_key,
    source_event, actor_user_id, status, metadata
  ) values (
    v_ticket.branch_id, v_ticket.order_id, v_ticket.id, 'consume', v_idem,
    'kitchen_preparing', p_actor_user_id, 'posted',
    jsonb_build_object('note', coalesce(nullif(btrim(p_note), ''), 'Kitchen preparing consume'))
  )
  returning id into v_event_id;

  -- Aggregate from legacy BOM (kept in sync from active recipes by API)
  for v_need in
    select
      c.inventory_item_id,
      sum(c.quantity_per_unit * oi.quantity)::numeric(14, 4) as qty_needed,
      max(ii.name) as item_name,
      max(ii.unit) as item_unit,
      max(ii.cost_price) as cost_price,
      max(ii.status) as item_status
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
      insert into public.inventory_stock_exceptions (
        branch_id, order_id, kitchen_ticket_id, inventory_item_id, exception_type, message
      ) values (
        v_ticket.branch_id, v_ticket.order_id, v_ticket.id, v_need.inventory_item_id,
        'missing_stock_row', 'Mapped inventory item missing at consume time.'
      );
      continue;
    end if;

    if v_item.status <> 'active' then
      insert into public.inventory_stock_exceptions (
        branch_id, order_id, kitchen_ticket_id, inventory_item_id, exception_type, message
      ) values (
        v_ticket.branch_id, v_ticket.order_id, v_ticket.id, v_item.id,
        'disabled_ingredient', 'Ingredient is not active; consume blocked.'
      );
      raise exception 'Insufficient stock for %', coalesce(v_need.item_name, v_item.name)
        using errcode = 'P0001';
    end if;

    if v_item.current_stock < v_required then
      insert into public.inventory_stock_exceptions (
        branch_id, order_id, kitchen_ticket_id, inventory_item_id, exception_type, message, metadata
      ) values (
        v_ticket.branch_id, v_ticket.order_id, v_ticket.id, v_item.id,
        'insufficient_stock',
        format('Required %s %s; on hand %s', v_required, v_item.unit, v_item.current_stock),
        jsonb_build_object('required', v_required, 'onHand', v_item.current_stock)
      );
      raise exception 'Insufficient stock for %', coalesce(v_need.item_name, v_item.name)
        using errcode = 'P0001';
    end if;

    v_next := v_item.current_stock - v_required;

    insert into public.stock_movements (
      inventory_item_id, branch_id, movement_type, quantity,
      reference_type, reference_id, reason, created_by
    ) values (
      v_item.id, v_item.branch_id, 'sale', -v_required,
      'kitchen_ticket', v_ticket.id, 'Kitchen preparing consume', p_actor_user_id
    )
    returning id into v_movement_id;

    update public.inventory_items
    set current_stock = v_next, updated_at = v_now
    where id = v_item.id;

    insert into public.inventory_consumption_event_lines (
      event_id, inventory_item_id, stock_movement_id, quantity, unit
    ) values (
      v_event_id, v_item.id, v_movement_id, -v_required, v_item.unit
    );

    if v_item.cost_price is null then
      v_cogs_available := false;
    else
      v_line_cost := v_required * v_item.cost_price;
      v_cogs_amount := v_cogs_amount + round(v_line_cost::numeric, 2);
    end if;

    v_consumed := v_consumed + 1;
  end loop;

  insert into public.inventory_cogs_events (
    branch_id, order_id, kitchen_ticket_id, consumption_event_id,
    event_type, idempotency_key, amount, cost_source, status, posting_deferred_reason, metadata
  ) values (
    v_ticket.branch_id, v_ticket.order_id, v_ticket.id, v_event_id,
    'cogs_ready',
    'cogs:kitchen_ticket:' || v_ticket.id::text || ':consume',
    case when v_cogs_available and v_consumed > 0 then v_cogs_amount else null end,
    case when v_cogs_available then 'last_purchase_cost_price' else 'unavailable' end,
    'deferred',
    'Finance COGS/inventory account mapping purpose not configured; event seam only (RC4-9).',
    jsonb_build_object('consumedLines', v_consumed)
  )
  on conflict (idempotency_key) do nothing;

  update public.kitchen_tickets
  set status = 'preparing',
      started_at = coalesce(started_at, v_now),
      updated_at = v_now
  where id = v_ticket.id
    and status = v_ticket.status;

  if not found then
    raise exception 'TICKET_STATE_CONFLICT' using errcode = 'P0001';
  end if;

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
    'consumedLines', v_consumed,
    'consumptionEventId', v_event_id
  );
end;
$$;

comment on function public.kitchen_ticket_set_preparing_atomic(uuid, uuid, text) is
  'RC4-9/REQ-KIT-012: preparing + recipe stock consume + consumption/COGS events. Sole consume trigger.';

-- ---------------------------------------------------------------------------
-- 7) Linked reversal of kitchen consumption (never orphan positive adjustments)
-- ---------------------------------------------------------------------------
create or replace function public.inventory_reverse_kitchen_consumption_atomic(
  p_ticket_id uuid,
  p_actor_user_id uuid default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.kitchen_tickets%rowtype;
  v_consume public.inventory_consumption_events%rowtype;
  v_line record;
  v_item public.inventory_items%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_reverse_id uuid;
  v_idem text;
  v_existing uuid;
  v_movement_id uuid;
  v_restored int := 0;
  v_qty numeric(14, 4);
begin
  if p_ticket_id is null then
    raise exception 'TICKET_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_ticket from public.kitchen_tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'KITCHEN_TICKET_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_idem := 'kitchen_ticket:' || v_ticket.id::text || ':reverse';

  select id into v_existing from public.inventory_consumption_events where idempotency_key = v_idem limit 1;
  if v_existing is not null then
    return jsonb_build_object(
      'ticketId', v_ticket.id,
      'idempotentReplay', true,
      'reversedLines', 0,
      'reverseEventId', v_existing
    );
  end if;

  select * into v_consume
  from public.inventory_consumption_events
  where kitchen_ticket_id = v_ticket.id
    and event_type = 'consume'
    and status = 'posted'
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object(
      'ticketId', v_ticket.id,
      'idempotentReplay', false,
      'reversedLines', 0,
      'noop', true,
      'reason', 'no_posted_consume_event'
    );
  end if;

  insert into public.inventory_consumption_events (
    branch_id, order_id, kitchen_ticket_id, event_type, idempotency_key,
    source_event, actor_user_id, reversed_event_id, status, metadata
  ) values (
    v_ticket.branch_id, v_ticket.order_id, v_ticket.id, 'reverse', v_idem,
    'kitchen_cancel_or_void', p_actor_user_id, v_consume.id, 'posted',
    jsonb_build_object('reason', coalesce(nullif(btrim(p_reason), ''), 'Linked reverse of kitchen consume'))
  )
  returning id into v_reverse_id;

  for v_line in
    select * from public.inventory_consumption_event_lines where event_id = v_consume.id
  loop
    -- Original line quantity is negative (sale). Restore = abs.
    v_qty := abs(v_line.quantity);

    select * into v_item from public.inventory_items where id = v_line.inventory_item_id for update;
    if not found then
      continue;
    end if;

    insert into public.stock_movements (
      inventory_item_id, branch_id, movement_type, quantity,
      reference_type, reference_id, reason, created_by
    ) values (
      v_item.id, v_item.branch_id, 'sale', v_qty,
      'kitchen_ticket_reverse', v_ticket.id,
      coalesce(nullif(btrim(p_reason), ''), 'Linked reverse of kitchen consume'),
      p_actor_user_id
    )
    returning id into v_movement_id;

    update public.inventory_items
    set current_stock = current_stock + v_qty, updated_at = v_now
    where id = v_item.id;

    insert into public.inventory_consumption_event_lines (
      event_id, inventory_item_id, stock_movement_id, quantity, unit, recipe_id
    ) values (
      v_reverse_id, v_item.id, v_movement_id, v_qty, v_line.unit, v_line.recipe_id
    );

    v_restored := v_restored + 1;
  end loop;

  update public.inventory_consumption_events
  set status = 'reversed'
  where id = v_consume.id;

  insert into public.inventory_cogs_events (
    branch_id, order_id, kitchen_ticket_id, consumption_event_id,
    event_type, idempotency_key, amount, cost_source, status, posting_deferred_reason, metadata
  ) values (
    v_ticket.branch_id, v_ticket.order_id, v_ticket.id, v_reverse_id,
    'cogs_reverse_ready',
    'cogs:kitchen_ticket:' || v_ticket.id::text || ':reverse',
    null,
    'unavailable',
    'deferred',
    'Finance COGS reverse posting DEFERRED; event seam only (RC4-9).',
    jsonb_build_object('reversedLines', v_restored, 'reversedEventId', v_consume.id)
  )
  on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'ticketId', v_ticket.id,
    'idempotentReplay', false,
    'reversedLines', v_restored,
    'reverseEventId', v_reverse_id,
    'reversedConsumeEventId', v_consume.id
  );
end;
$$;

revoke all on function public.inventory_reverse_kitchen_consumption_atomic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.inventory_reverse_kitchen_consumption_atomic(uuid, uuid, text) to service_role;

commit;
