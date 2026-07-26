-- Canonical single-price menu domain (additive, forward-only).
--
-- Founder decision (2026-07-25): one canonical menu across Customer Website, Admin ERP,
-- POS, Orders, Kitchen, Reports and future channels. Every sellable SKU has exactly one
-- current selling price. `menu_item_variants` stops being the pricing model.
--
-- This migration is ADDITIVE ONLY:
--   * no TRUNCATE, no DELETE, no CASCADE, no DROP of catalog tables/columns
--   * every existing menu_items.id is preserved (the default variant keeps the original row)
--   * non-default variants become NEW sellable SKU rows in the same category
--   * order_items.variant_id stays intact and readable (historical compatibility)
--   * menu_item_variants is DEPRECATED, not dropped (see comment at the end)
--
-- Idempotency: conversion is driven off public.menu_variant_sku_mappings, so re-running
-- this migration performs no further inserts and no destructive changes.

begin;

-- ---------------------------------------------------------------------------
-- 0) Pre-flight snapshot for safety assertions
-- ---------------------------------------------------------------------------
create temporary table _canon_pre on commit drop as
select
  (select count(*) from public.order_items)          as order_items,
  (select count(*) from public.item_modifier_groups) as item_modifier_groups,
  (select count(*) from public.modifier_options)     as modifier_options,
  (select count(*) from public.modifier_groups)      as modifier_groups,
  (select count(*) from public.menu_categories)      as menu_categories,
  (select count(*) from public.menu_items)           as menu_items,
  (select count(*) from public.menu_item_variants)   as menu_item_variants;

create temporary table _order_items_pre on commit drop as
select id, order_id, menu_item_id, variant_id from public.order_items;

-- ---------------------------------------------------------------------------
-- 1) Canonical SKU columns on menu_items
-- ---------------------------------------------------------------------------
alter table public.menu_items
  add column if not exists product_group_slug text,
  add column if not exists size_label text,
  add column if not exists size_code text,
  add column if not exists price numeric(10, 2),
  add column if not exists sort_order integer not null default 0;

comment on column public.menu_items.product_group_slug is
  'Presentation-only grouping key. SKUs sharing this value are shown as one product family. Never used for pricing indirection.';
comment on column public.menu_items.size_label is
  'Human-readable size/option label for this SKU (for example "10 inch Medium"). Null for single-option products.';
comment on column public.menu_items.size_code is
  'Machine-readable size tier (small/medium/large) used to match size-scaled modifier pricing. Null for single-option products.';
comment on column public.menu_items.price is
  'The single current selling price of this SKU in PKR. Server-authoritative: the only price source for new orders.';
comment on column public.menu_items.base_price is
  'DEPRECATED legacy price column. Superseded by menu_items.price. Retained for rollback only; do not read at runtime.';

-- ---------------------------------------------------------------------------
-- 2) Variant -> SKU compatibility mapping table
-- ---------------------------------------------------------------------------
create table if not exists public.menu_variant_sku_mappings (
  old_variant_id uuid primary key,
  new_menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  migrated_at timestamptz not null default timezone('utc', now())
);

comment on table public.menu_variant_sku_mappings is
  'Maps every legacy menu_item_variants row to the canonical sellable SKU it became. Keeps historical order_items.variant_id readable after the single-price refactor.';

create index if not exists menu_variant_sku_mappings_new_item_idx
  on public.menu_variant_sku_mappings (new_menu_item_id);

-- ---------------------------------------------------------------------------
-- 3) Menu audit events (price / availability / catalog changes)
-- ---------------------------------------------------------------------------
create table if not exists public.menu_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  resource_type text not null check (resource_type in ('menu_category', 'menu_item')),
  resource_id uuid not null,
  action text not null,
  scope text not null default 'global' check (scope in ('global', 'branch')),
  branch_id uuid references public.branches(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.menu_audit_events is
  'Append-only audit trail for canonical menu changes. Price edits record previous and new price in before_data/after_data.';

create index if not exists menu_audit_events_resource_idx
  on public.menu_audit_events (resource_type, resource_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) Optional future branch override table (DESIGNED BUT INACTIVE)
--     Pricing does NOT consult this table in this slice. Branch price divergence
--     requires separate Founder authorization before any runtime path reads it.
-- ---------------------------------------------------------------------------
create table if not exists public.branch_menu_item_overrides (
  branch_id uuid not null references public.branches(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  price_override numeric(10, 2) check (price_override is null or price_override >= 0),
  availability_override boolean,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (branch_id, menu_item_id)
);

comment on table public.branch_menu_item_overrides is
  'INACTIVE by design. Reserved for future branch-specific price/availability overrides. No runtime path reads it; effective price remains menu_items.price.';

-- ---------------------------------------------------------------------------
-- 5) Backfill canonical fields for every existing item
-- ---------------------------------------------------------------------------
update public.menu_items
set product_group_slug = slug
where product_group_slug is null;

-- Single-option products: legacy base_price becomes the canonical price.
update public.menu_items mi
set price = mi.base_price
where mi.price is null
  and mi.base_price is not null;

-- ---------------------------------------------------------------------------
-- 6) Convert independently priced variants into sellable SKUs
--     * lowest-sort_order variant keeps the original menu_items row (ID preserved)
--     * every other variant becomes a new SKU row in the same category
--     * already-mapped variants are skipped, making the whole block idempotent
-- ---------------------------------------------------------------------------
do $$
declare
  v_item record;
  v_variant record;
  v_rank integer;
  v_suffix text;
  v_new_slug text;
  v_new_id uuid;
  v_group_slug text;
begin
  for v_item in
    select mi.id, mi.slug, mi.name, mi.category_id, mi.description, mi.image_url,
           mi.badge, mi.product_type, mi.is_available, mi.is_featured, mi.product_group_slug
    from public.menu_items mi
    where exists (
      select 1
      from public.menu_item_variants v
      where v.menu_item_id = mi.id
        and not exists (
          select 1 from public.menu_variant_sku_mappings m where m.old_variant_id = v.id
        )
    )
    order by mi.slug
  loop
    v_group_slug := coalesce(v_item.product_group_slug, v_item.slug);
    v_rank := 0;

    for v_variant in
      select v.id, v.label, v.size_code, v.price, v.sort_order, v.is_default, v.is_available
      from public.menu_item_variants v
      where v.menu_item_id = v_item.id
      order by v.sort_order, v.label
    loop
      v_rank := v_rank + 1;

      -- Stable, readable SKU suffix: prefer the machine size tier, else slugify the label.
      v_suffix := coalesce(
        nullif(lower(regexp_replace(coalesce(v_variant.size_code, ''), '[^a-zA-Z0-9]+', '-', 'g')), ''),
        nullif(trim(both '-' from lower(regexp_replace(v_variant.label, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
        'option-' || v_rank::text
      );
      v_new_slug := v_group_slug || '-' || v_suffix;

      if v_rank = 1 then
        -- Preserve the original row/ID as the first sellable SKU of the family.
        update public.menu_items
        set slug = v_new_slug,
            name = v_item.name || ' — ' || v_variant.label,
            product_group_slug = v_group_slug,
            size_label = v_variant.label,
            size_code = v_variant.size_code,
            price = v_variant.price,
            sort_order = v_rank,
            is_available = v_item.is_available and v_variant.is_available
        where id = v_item.id;

        v_new_id := v_item.id;
      else
        insert into public.menu_items (
          category_id, slug, name, description, image_url, base_price, badge, product_type,
          is_available, is_featured, product_group_slug, size_label, size_code, price, sort_order
        )
        values (
          v_item.category_id, v_new_slug, v_item.name || ' — ' || v_variant.label,
          v_item.description, v_item.image_url, null, v_item.badge, v_item.product_type,
          v_item.is_available and v_variant.is_available, false,
          v_group_slug, v_variant.label, v_variant.size_code, v_variant.price, v_rank
        )
        on conflict (slug) do update
        set category_id = excluded.category_id,
            name = excluded.name,
            description = excluded.description,
            image_url = excluded.image_url,
            badge = excluded.badge,
            product_type = excluded.product_type,
            is_available = excluded.is_available,
            product_group_slug = excluded.product_group_slug,
            size_label = excluded.size_label,
            size_code = excluded.size_code,
            price = excluded.price,
            sort_order = excluded.sort_order
        returning id into v_new_id;

        -- Mirror the family's modifier groups onto the new SKU (no invented relationships).
        insert into public.item_modifier_groups (
          menu_item_id, modifier_group_id, branch_id, is_required, min_select, max_select,
          sort_order, is_active, is_available
        )
        select v_new_id, img.modifier_group_id, img.branch_id, img.is_required, img.min_select,
               img.max_select, img.sort_order, img.is_active, img.is_available
        from public.item_modifier_groups img
        where img.menu_item_id = v_item.id
        on conflict (menu_item_id, modifier_group_id, branch_id) do nothing;
      end if;

      insert into public.menu_variant_sku_mappings (old_variant_id, new_menu_item_id)
      values (v_variant.id, v_new_id)
      on conflict (old_variant_id) do update
      set new_menu_item_id = excluded.new_menu_item_id;
    end loop;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 7) Canonical invariants
-- ---------------------------------------------------------------------------
update public.menu_items set sort_order = 0 where sort_order is null;

alter table public.menu_items
  alter column price set not null;

alter table public.menu_items
  drop constraint if exists menu_items_price_non_negative;
alter table public.menu_items
  add constraint menu_items_price_non_negative check (price >= 0);

create index if not exists menu_items_product_group_slug_idx
  on public.menu_items (product_group_slug);
create index if not exists menu_items_category_sort_idx
  on public.menu_items (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- 8) Deprecate menu_item_variants (retained for rollback + order history)
-- ---------------------------------------------------------------------------
comment on table public.menu_item_variants is
  'DEPRECATED 2026-07-25 by the canonical single-price menu domain. Not a pricing source and not exposed by any API. Every row is mapped to a sellable SKU in public.menu_variant_sku_mappings. Retained only for rollback and historical order readability; do not insert new rows and do not drop until production verification confirms safe removal.';

comment on column public.order_items.variant_id is
  'Historical reference to the deprecated menu_item_variants row captured at order time. New orders leave this null and rely on order_items.menu_item_id plus the name/price snapshots.';

-- ---------------------------------------------------------------------------
-- 9) RLS, policies and grants for the new tables
-- ---------------------------------------------------------------------------
alter table public.menu_variant_sku_mappings enable row level security;
alter table public.menu_audit_events enable row level security;
alter table public.branch_menu_item_overrides enable row level security;

drop policy if exists "Public can read variant sku mappings" on public.menu_variant_sku_mappings;
create policy "Public can read variant sku mappings" on public.menu_variant_sku_mappings
for select using (true);

drop policy if exists "Staff select menu audit events" on public.menu_audit_events;
create policy "Staff select menu audit events" on public.menu_audit_events
for select to authenticated using (
  branch_id is null or public.current_user_has_branch_access(branch_id)
);

drop policy if exists "Staff select branch menu overrides" on public.branch_menu_item_overrides;
create policy "Staff select branch menu overrides" on public.branch_menu_item_overrides
for select to authenticated using (public.current_user_has_branch_access(branch_id));

revoke all on table public.menu_audit_events, public.branch_menu_item_overrides from anon, authenticated;
grant select on table public.menu_variant_sku_mappings to anon, authenticated;
grant select on table public.menu_audit_events, public.branch_menu_item_overrides to authenticated;
grant select, insert, update, delete on table
  public.menu_variant_sku_mappings,
  public.menu_audit_events,
  public.branch_menu_item_overrides
to service_role;

-- ---------------------------------------------------------------------------
-- 10) Safety assertions — abort the whole transaction on any violation
-- ---------------------------------------------------------------------------
do $$
declare
  pre record;
  bad_count integer;
begin
  select * into pre from _canon_pre;

  if (select count(*) from public.order_items) < pre.order_items then
    raise exception 'ASSERTION FAILED: order_items count reduced';
  end if;
  if (select count(*) from public.item_modifier_groups) < pre.item_modifier_groups then
    raise exception 'ASSERTION FAILED: item_modifier_groups count reduced';
  end if;
  if (select count(*) from public.modifier_options) < pre.modifier_options then
    raise exception 'ASSERTION FAILED: modifier_options count reduced';
  end if;
  if (select count(*) from public.modifier_groups) < pre.modifier_groups then
    raise exception 'ASSERTION FAILED: modifier_groups count reduced';
  end if;
  if (select count(*) from public.menu_categories) < pre.menu_categories then
    raise exception 'ASSERTION FAILED: menu_categories count reduced';
  end if;
  if (select count(*) from public.menu_items) < pre.menu_items then
    raise exception 'ASSERTION FAILED: menu_items count reduced';
  end if;
  if (select count(*) from public.menu_item_variants) <> pre.menu_item_variants then
    raise exception 'ASSERTION FAILED: menu_item_variants must be preserved untouched';
  end if;

  -- Historical order lines keep their exact references.
  select count(*) into bad_count
  from _order_items_pre p
  left join public.order_items oi on oi.id = p.id
  where oi.id is null
     or oi.menu_item_id is distinct from p.menu_item_id
     or oi.variant_id is distinct from p.variant_id;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: % order_items lost or changed references', bad_count;
  end if;

  -- Every legacy variant resolves to exactly one sellable SKU.
  select count(*) into bad_count
  from public.menu_item_variants v
  left join public.menu_variant_sku_mappings m on m.old_variant_id = v.id
  where m.old_variant_id is null;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: % variants have no SKU mapping', bad_count;
  end if;

  -- Every historical order line that referenced a variant still resolves to a SKU.
  select count(*) into bad_count
  from public.order_items oi
  where oi.variant_id is not null
    and not exists (select 1 from public.menu_variant_sku_mappings m where m.old_variant_id = oi.variant_id);
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: % historical order lines reference an unmapped variant', bad_count;
  end if;

  -- One price per SKU, never negative, never null.
  select count(*) into bad_count from public.menu_items where price is null or price < 0;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: % SKUs without a single non-negative price', bad_count;
  end if;

  -- Slug uniqueness and referential sanity.
  select count(*) into bad_count from (
    select slug from public.menu_items group by slug having count(*) > 1
  ) d;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: duplicate SKU slugs';
  end if;
  select count(*) into bad_count
  from public.menu_items mi
  left join public.menu_categories c on c.id = mi.category_id
  where c.id is null;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: orphan menu_items';
  end if;

  -- A family must not mix null and non-null size labels (grouping would be ambiguous).
  select count(*) into bad_count from (
    select product_group_slug
    from public.menu_items
    where product_group_slug is not null
    group by product_group_slug
    having count(*) > 1 and count(size_label) <> count(*)
  ) d;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: % product families mix sized and unsized SKUs', bad_count;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Verification (read-only, post-apply):
--   select count(*) from menu_items;                                     -- sellable SKU count
--   select count(distinct product_group_slug) from menu_items;           -- product-family count
--   select count(*) from menu_items where price is null;                 -- 0
--   select count(*) from menu_variant_sku_mappings;                      -- one row per legacy variant
--
-- Rollback: menu_item_variants is untouched and base_price is retained, so the previous
-- runtime can be restored by reverting application code. Reverting the SKU split itself
-- requires the documented rollback plan in docs/architecture/CANONICAL-MENU-DOMAIN.md.
-- ---------------------------------------------------------------------------

commit;
