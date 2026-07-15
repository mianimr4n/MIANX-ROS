-- Sprint 2 Stage 2 (Option B): Pizza toppings as shared internal catalog SKUs (BFR-012 BOTH).
-- Extends product_type for topping; seeds an INTERNAL Toppings grouping + verified prices.
-- Customer browse stays at 13 public categories — Toppings is NEVER a customer menu tab.
-- Customizer / Admin / POS / Kitchen / Inventory resolve SKUs by product_type = topping.
-- Does NOT reprice existing pizza SKUs (BFR-001 HYBRID / BFR-003 REPRICE hold).

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

-- Internal catalog grouping only (Admin / inventory organization).
-- Public customer APIs and website browse MUST filter slug = 'toppings' out of category chips.
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

-- Ensure Behari Kabab Pizza remains available at current verified temporary price (BFR-003).
update public.menu_items
set
  is_available = true,
  base_price = coalesce(base_price, 549),
  badge = coalesce(nullif(badge, ''), 'Starting Price')
where slug = 'behari-kabab-pizza';
