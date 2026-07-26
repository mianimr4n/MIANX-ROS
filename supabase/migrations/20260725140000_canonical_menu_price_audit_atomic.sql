-- Canonical menu corrective: transactional price audit + variant write guard.
--
-- Additive only. Does not drop menu_item_variants. Does not TRUNCATE/DELETE catalog.
-- Price changes must update menu_items.price and insert menu_audit_events in ONE transaction.

begin;

-- ---------------------------------------------------------------------------
-- 1) Correlation / idempotency on audit events
-- ---------------------------------------------------------------------------
alter table public.menu_audit_events
  add column if not exists correlation_id text;

comment on column public.menu_audit_events.correlation_id is
  'Optional client/request correlation id. When present, identical (resource_id, action, correlation_id) replays are idempotent.';

create unique index if not exists menu_audit_events_correlation_uidx
  on public.menu_audit_events (resource_id, action, correlation_id)
  where correlation_id is not null and btrim(correlation_id) <> '';

-- ---------------------------------------------------------------------------
-- 2) Atomic price update: lock → validate → update → audit → commit together
-- ---------------------------------------------------------------------------
create or replace function public.update_menu_item_price_atomic(
  p_menu_item_id uuid,
  p_new_price numeric,
  p_actor_user_id uuid,
  p_correlation_id text default null,
  p_expected_old_price numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.menu_items%rowtype;
  v_old_price numeric;
  v_audit_id uuid;
  v_existing record;
  v_corr text;
begin
  if p_menu_item_id is null then
    raise exception 'MENU_ITEM_ID_REQUIRED' using errcode = 'P0001';
  end if;
  if p_new_price is null or p_new_price < 0 or p_new_price <> round(p_new_price, 2) then
    raise exception 'PRICE_INVALID' using errcode = 'P0001';
  end if;

  v_corr := nullif(btrim(coalesce(p_correlation_id, '')), '');

  -- Idempotent replay: same correlation for the same item/action returns prior result.
  if v_corr is not null then
    select id, before_data, after_data, created_at
      into v_existing
    from public.menu_audit_events
    where resource_type = 'menu_item'
      and resource_id = p_menu_item_id
      and action = 'item.price_change'
      and correlation_id = v_corr
    limit 1;

    if found then
      return jsonb_build_object(
        'menuItemId', p_menu_item_id,
        'price', (v_existing.after_data ->> 'price')::numeric,
        'oldPrice', (v_existing.before_data ->> 'price')::numeric,
        'auditId', v_existing.id,
        'idempotentReplay', true,
        'changed', false,
        'createdAt', v_existing.created_at
      );
    end if;
  end if;

  select * into v_row
  from public.menu_items
  where id = p_menu_item_id
  for update;

  if not found then
    raise exception 'MENU_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_old_price := coalesce(v_row.price, v_row.base_price, 0);

  if p_expected_old_price is not null and v_old_price <> p_expected_old_price then
    raise exception 'PRICE_CONFLICT' using errcode = 'P0001';
  end if;

  -- Unchanged price: no audit row, consistent response.
  if v_old_price = p_new_price then
    return jsonb_build_object(
      'menuItemId', p_menu_item_id,
      'price', v_old_price,
      'oldPrice', v_old_price,
      'auditId', null,
      'idempotentReplay', false,
      'changed', false
    );
  end if;

  update public.menu_items
  set price = p_new_price,
      updated_at = timezone('utc', now())
  where id = p_menu_item_id;

  insert into public.menu_audit_events (
    actor_user_id,
    resource_type,
    resource_id,
    action,
    scope,
    branch_id,
    before_data,
    after_data,
    note,
    correlation_id
  ) values (
    p_actor_user_id,
    'menu_item',
    p_menu_item_id,
    'item.price_change',
    'global',
    null,
    jsonb_build_object('price', v_old_price, 'slug', v_row.slug, 'name', v_row.name),
    jsonb_build_object('price', p_new_price, 'slug', v_row.slug, 'name', v_row.name),
    'atomic price update',
    v_corr
  )
  returning id into v_audit_id;

  return jsonb_build_object(
    'menuItemId', p_menu_item_id,
    'price', p_new_price,
    'oldPrice', v_old_price,
    'auditId', v_audit_id,
    'idempotentReplay', false,
    'changed', true
  );
end;
$$;

comment on function public.update_menu_item_price_atomic(uuid, numeric, uuid, text, numeric) is
  'Atomically updates menu_items.price and inserts menu_audit_events. Audit failure rolls back the price change. Service-role only.';

revoke all on function public.update_menu_item_price_atomic(uuid, numeric, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.update_menu_item_price_atomic(uuid, numeric, uuid, text, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Block new operational writes to deprecated menu_item_variants
--    Migrations may set: select set_config('telepizza.allow_variant_writes', 'on', true);
-- ---------------------------------------------------------------------------
create or replace function public.prevent_menu_item_variant_writes()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('telepizza.allow_variant_writes', true), 'off') = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception
    'MENU_ITEM_VARIANTS_DEPRECATED: menu_item_variants is deprecated. Use menu_items.price / sellable SKUs. Historical rows are retained read-only.'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_prevent_menu_item_variant_writes on public.menu_item_variants;
create trigger trg_prevent_menu_item_variant_writes
  before insert or update or delete on public.menu_item_variants
  for each row
  execute function public.prevent_menu_item_variant_writes();

comment on function public.prevent_menu_item_variant_writes() is
  'Blocks INSERT/UPDATE/DELETE on deprecated menu_item_variants unless telepizza.allow_variant_writes=on for the current transaction.';

commit;
