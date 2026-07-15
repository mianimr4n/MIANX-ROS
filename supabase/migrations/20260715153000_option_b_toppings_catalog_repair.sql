-- Sprint 2 Option B repair (forward-only).
-- Root cause (production audit 2026-07-15):
--   product_type exists from foundation schema (20260713190000).
--   Migration 20260715120000 exists in git but was NEVER applied to production
--   (0 topping categories, 0 topping SKUs, API has no toppings[]).
-- This repair is idempotent and safe whether 20260715120000 ran or not.
-- Do NOT rewrite 20260715120000 (shared branch history).

begin;

alter table public.menu_items
  drop constraint if exists menu_items_product_type_check;

alter table public.menu_items
  add constraint menu_items_product_type_check check (
    product_type in (
      'pizza',
      'burger',
      'sandwich',
      'wings',
      'fries',
      'wrap',
      'pasta',
      'side',
      'drink',
      'deal',
      'topping'
    )
  );

-- Internal Admin/org grouping only. Customer browse MUST exclude slug='toppings'.
insert into public.menu_categories (name, slug, sort_order, is_active)
values ('Toppings', 'toppings', 130, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.menu_items (
  category_id,
  slug,
  name,
  description,
  image_url,
  base_price,
  badge,
  product_type,
  is_available,
  is_featured
)
values
  (
    (select id from public.menu_categories where slug = 'toppings'),
    'extra-chicken',
    'Extra Chicken',
    'Extra chicken topping for pizza. Size tier matches small / medium / large pizza.',
    '/images/menu-pizza.jpg',
    null,
    null,
    'topping',
    true,
    false
  ),
  (
    (select id from public.menu_categories where slug = 'toppings'),
    'extra-cheese',
    'Extra Cheese',
    'Extra cheese topping for pizza. Size tier matches small / medium / large pizza.',
    '/images/menu-pizza.jpg',
    null,
    null,
    'topping',
    true,
    false
  ),
  (
    (select id from public.menu_categories where slug = 'toppings'),
    'extra-cheese-slice',
    'Extra Cheese Slice',
    'Extra cheese slice topping for pizza (single verified price).',
    '/images/menu-pizza.jpg',
    60,
    null,
    'topping',
    true,
    false
  )
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  base_price = excluded.base_price,
  badge = excluded.badge,
  product_type = excluded.product_type,
  is_available = excluded.is_available,
  is_featured = excluded.is_featured;

insert into public.menu_item_variants (
  menu_item_id,
  label,
  size_code,
  price,
  sort_order,
  is_default,
  is_available
)
values
  ((select id from public.menu_items where slug = 'extra-chicken'), 'Small', 'small', 50, 1, true, true),
  ((select id from public.menu_items where slug = 'extra-chicken'), 'Medium', 'medium', 100, 2, false, true),
  ((select id from public.menu_items where slug = 'extra-chicken'), 'Large', 'large', 150, 3, false, true),
  ((select id from public.menu_items where slug = 'extra-cheese'), 'Small', 'small', 50, 1, true, true),
  ((select id from public.menu_items where slug = 'extra-cheese'), 'Medium', 'medium', 100, 2, false, true),
  ((select id from public.menu_items where slug = 'extra-cheese'), 'Large', 'large', 150, 3, false, true)
on conflict (menu_item_id, label) do update
set
  size_code = excluded.size_code,
  price = excluded.price,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  is_available = excluded.is_available;

-- BFR-003: keep Behari Kabab Pizza available at temporary verified baseline.
-- Do not invent Medium/Large variants here.
update public.menu_items
set
  is_available = true,
  base_price = coalesce(base_price, 549),
  badge = coalesce(nullif(badge, ''), 'Starting Price')
where slug = 'behari-kabab-pizza';

commit;

-- ---------------------------------------------------------------------------
-- Verification SQL (run after apply; expect 1 / 3 / 6 / 1)
-- ---------------------------------------------------------------------------
-- select count(*) as public_categories
-- from public.menu_categories
-- where is_active and slug <> 'toppings';
--
-- select count(*) as topping_skus
-- from public.menu_items
-- where product_type = 'topping' and slug in ('extra-chicken','extra-cheese','extra-cheese-slice');
--
-- select count(*) as topping_size_variants
-- from public.menu_item_variants v
-- join public.menu_items i on i.id = v.menu_item_id
-- where i.slug in ('extra-chicken','extra-cheese') and v.size_code in ('small','medium','large');
--
-- select slug, base_price, badge
-- from public.menu_items
-- where slug = 'behari-kabab-pizza';
--
-- Rollback guidance (manual; do not auto-run):
--   delete from public.menu_item_variants
--   where menu_item_id in (select id from public.menu_items where product_type = 'topping');
--   delete from public.menu_items where product_type = 'topping';
--   delete from public.menu_categories where slug = 'toppings';
--   -- then restore product_type check without 'topping' only if no topping rows remain
