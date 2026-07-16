-- Owner menu board sync (regular board prices).
-- Aligns Supabase catalog with apps/website/client/src/data/menu-data.ts.
-- Preserves freeze counts: 13 public categories / 58 browse items / 3 toppings / 40 variants / 7 deals.
-- Changes vs prior catalog:
--   REMOVE: Broast category + SKUs; specialty behari-kabab-pizza (flat 549)
--   ADD: Dips category + 4 dips; zinger-burger; special-pasta
-- Forward-only and idempotent.

begin;

-- 1) Public Dips category (replaces Broast in the 13-tab set)
insert into public.menu_categories (name, slug, sort_order, is_active)
values ('Dips', 'dips', 105, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 2) Retire Broast from customer browse
update public.menu_categories
set is_active = false, sort_order = 999
where slug = 'broast';

update public.menu_items
set is_available = false, is_featured = false
where slug in (
  'quarter-broast',
  'half-broast',
  'full-broast',
  'broast-garlic-dip',
  'broast-mustard-dip',
  'behari-kabab-pizza'
);

update public.menu_item_variants
set is_available = false
where menu_item_id in (
  select id from public.menu_items
  where slug in (
    'quarter-broast',
    'half-broast',
    'full-broast',
    'broast-garlic-dip',
    'broast-mustard-dip',
    'behari-kabab-pizza'
  )
);

-- 3) Upsert owner-board SKUs (new + description/price refresh)
insert into public.menu_items (
  category_id, slug, name, description, image_url, base_price, badge, product_type, is_available, is_featured
)
values
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'tele-special', 'Tele Special', 'Special chicken with special sauce, topped with olive, mushroom & capsicum.', '/images/menu-pizza.jpg', null, 'Signature', 'pizza', true, true),
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'peri-peri', 'Peri Peri', 'Peri peri sauce with tikka chicken topped with kabab, sausages & tomato.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'bihari-kabab', 'Bihari Kabab', 'Garlic sauce with tikka chicken topped kabab slice, onion & mushroom.', '/images/menu-pizza.jpg', null, 'Hot', 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'kababish', 'Kababish', 'Special sauce with fajita chicken topped with kabab mushroom & capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'tikka', 'Tikka', 'Tikka sauce with tikka chicken topped with olive & onion.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'bonfire', 'Bonfire', 'Bonfire sauce with fajita chicken topped with jalapeno, mushroom & tomato.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'chicken-supreme', 'Chicken Supreme', 'Original red base sauce, three types of chicken topped with olive, mushroom jalapeno & capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'real-fajita', 'Real Fajita', 'Fajita sauce with fajita chicken topped with onion & capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'mexicana', 'Mexicana', 'Special sauce with smoked chicken topped with sausages, black olive, tomato & capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'cheese-lover', 'Cheese Lover', 'Original red base sauce loaded with mozzarella cheese.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'chicago-extreme', 'Chicago Extreme', 'Double layers extreme pizza with 2 premium sauces, lots of cheese & chicken.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'crown-crust', 'Crown Crust', 'Any flavour with chicken stuffing on edges & Tele Pizza signature sauce.', '/images/menu-pizza.jpg', null, 'Chef Special', 'pizza', true, true),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'stuffed-crust', 'Stuffed Crust', 'Any flavour with kabab stuffing on edges.', '/images/menu-pizza.jpg', 1749, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'tele-extreme', 'Tele Extreme Pizza', '2 premium sauces with loaded chicken & lots of cheese.', '/images/menu-pizza.jpg', 1699, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'sixteen-inch-incher', '16" Incher', 'Sixteen-inch specialty pizza.', '/images/menu-pizza.jpg', 2399, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'burgers'), 'zinger-burger', 'Zinger Burger', 'Crispy zinger burger.', '/images/menu-burger.jpg', 450, 'Popular', 'burger', true, true),
  ((select id from public.menu_categories where slug = 'burgers'), 'patty-burger', 'Patty Burger', 'Tele Pizza patty burger.', '/images/menu-burger.jpg', 299, null, 'burger', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'crunchy-sandwich', 'Crunchy Sandwich', 'Served with dip sauce & fries.', '/images/sides-platter.jpg', 799, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'special-sandwich', 'Special Sandwich', 'Served with dip sauce & fries.', '/images/sides-platter.jpg', 749, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'baked-smoked-sandwich', 'Baked Smoked', 'Served with dip sauce & fries.', '/images/sides-platter.jpg', 749, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'sizzling-sandwich', 'Sizzling Sandwich', 'Served with dip sauce & fries.', '/images/sides-platter.jpg', 749, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'jumbo-wrap', 'Tele Pizza Special Jumbo Wrap', 'Tele Pizza special jumbo wrap.', '/images/sides-platter.jpg', 649, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'crunchy-wrap', 'Crunchy Wrap', 'Crunchy chicken wrap.', '/images/sides-platter.jpg', 399, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'dynamite-wrap', 'Dynamite Wrap', 'Dynamite-flavoured wrap.', '/images/sides-platter.jpg', 399, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'behari-roll', 'Behari Roll', '4 pcs special chicken with special sauce, wrapped in crispy tortilla baked with lots of cheese, mushroom & olives, served with dip sauce & fries.', '/images/sides-platter.jpg', 799, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'pasta'), 'crunchy-pasta', 'Crunchy Pasta', 'Crunchy pasta.', '/images/pasta-dish.jpg', 849, 'Hot', 'pasta', true, false),
  ((select id from public.menu_categories where slug = 'pasta'), 'special-pasta', 'Special Pasta / Flaming Pasta', 'Special flaming pasta.', '/images/pasta-dish.jpg', 749, null, 'pasta', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'fried-crispy-wings', 'Fried & Crispy', 'Crispy fried chicken wings.', '/images/sides-platter.jpg', 599, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'bbq-wings', 'BBQ', 'BBQ-flavoured chicken wings.', '/images/sides-platter.jpg', 599, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'creamo-wings', 'Creamo', 'Creamy-style chicken wings.', '/images/sides-platter.jpg', 599, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'oven-baked-wings', 'Oven Baked', 'Oven-baked chicken wings.', '/images/sides-platter.jpg', 549, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'flaming-wings', 'Flaming', 'Spicy flaming chicken wings.', '/images/sides-platter.jpg', 549, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'fries'), 'loaded-fries', 'Loaded Fries', 'Loaded fries.', '/images/sides-platter.jpg', 650, null, 'fries', true, false),
  ((select id from public.menu_categories where slug = 'fries'), 'french-fries', 'French Fries', 'French fries.', '/images/sides-platter.jpg', 199, null, 'fries', true, false),
  ((select id from public.menu_categories where slug = 'fries'), 'family-fries', 'Family Fries', 'Family-size fries.', '/images/sides-platter.jpg', 350, null, 'fries', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'chicken-tender-strips', 'Chicken Tender Strips', '5 pcs juicy chicken tender strips with blend of spices, served with secret delicious dip sauce.', '/images/sides-platter.jpg', 590, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'crispy-box', 'Crispy Box', '3 pcs crispy chicken (1 Chest, 1 Drum, 1 Wing) with 1 Garlic Ranch.', '/images/sides-platter.jpg', 670, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'fried-chicken-chest', 'Fried Chicken (Chest)', 'Fried chicken chest piece.', '/images/sides-platter.jpg', 250, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'fried-chicken', 'Fried Chicken', 'Fried chicken piece.', '/images/sides-platter.jpg', 220, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'nuggets', 'Nuggets', '10 pieces.', '/images/sides-platter.jpg', 449, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'hot-shots', 'Hot Shots', '10 pieces.', '/images/sides-platter.jpg', 449, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'dips'), 'special-sauce-dip', 'Special Sauce', 'Tele Pizza special sauce dip.', '/images/sides-platter.jpg', 50, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'dips'), 'bone-fire-dip', 'Bone Fire', 'Bone fire sauce dip.', '/images/sides-platter.jpg', 50, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'dips'), 'dip-sauce', 'Dip Sauce', 'Classic dip sauce.', '/images/sides-platter.jpg', 50, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'dips'), 'garlic-ranch-dip', 'Garlic Ranch', 'Garlic ranch dip.', '/images/sides-platter.jpg', 50, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-1-5l', '1.5 Liter', '1.5 liter soft drink.', '/images/desserts-drinks.jpg', 210, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-1l', '1 Liter', '1 liter soft drink.', '/images/desserts-drinks.jpg', 170, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-500ml', '500 ml', '500 ml soft drink.', '/images/desserts-drinks.jpg', 110, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-345ml', '345 ml', '345 ml soft drink.', '/images/desserts-drinks.jpg', 70, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'large-water', 'Large Water', 'Large bottled water.', '/images/desserts-drinks.jpg', 99, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'small-water', 'Small Water', 'Small bottled water.', '/images/desserts-drinks.jpg', 50, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'family-deal', 'Family Deal', '1 Large Pizza + 10 Pcs Wings + 1.5 Liter Drink.', '/images/promos/family-deal.jpg', 2250, null, 'deal', true, true),
  ((select id from public.menu_categories where slug = 'deals'), 'pizza-fest', 'Pizza Fest', '1 Large Pizza + 1.5 Liter Drink.', '/images/promos/pizza-fest.jpg', 1680, 'Hot', 'deal', true, true),
  ((select id from public.menu_categories where slug = 'deals'), 'mega-offer', 'Mega Offer', '2 Large Pizza + 1.5 Liter Coke.', '/images/products/deal-combo.jpg', 3140, null, 'deal', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'pair-deal', 'Pair Deal', '2 Medium Pizza + 1.5 Liter Coke.', '/images/promos/pair-deal.jpg', 1999, 'Hot', 'deal', true, true),
  ((select id from public.menu_categories where slug = 'deals'), 'family-festival', 'Family Festival', '5 Zinger Burger + 1.5 Drink.', '/images/products/deal-combo.jpg', 2350, null, 'deal', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'deal-for-two', 'Deal for 2', '2 Zinger Burger + 2 Drink 345ml.', '/images/products/deal-combo.jpg', 999, null, 'deal', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'knock-out-deal', 'Knock Out Deal', '3 Zinger Burger + 1 Liter Drink.', '/images/promos/knock-out-deal.jpg', 1440, null, 'deal', true, false)
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

-- 4) Ensure size-matrix variants stay available at board prices
insert into public.menu_item_variants (menu_item_id, label, size_code, price, sort_order, is_default, is_available)
values
  ((select id from public.menu_items where slug = 'tele-special'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'tele-special'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'tele-special'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'peri-peri'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'peri-peri'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'peri-peri'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'bihari-kabab'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'bihari-kabab'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'bihari-kabab'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'kababish'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'kababish'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'kababish'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'tikka'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'tikka'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'tikka'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'bonfire'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'bonfire'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'bonfire'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'chicken-supreme'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'chicken-supreme'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'chicken-supreme'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'real-fajita'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'real-fajita'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'real-fajita'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'mexicana'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'mexicana'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'mexicana'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'cheese-lover'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'cheese-lover'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'cheese-lover'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'chicago-extreme'), 'Medium', 'medium', 1199, 1, true, true),
  ((select id from public.menu_items where slug = 'chicago-extreme'), 'Large', 'large', 1899, 2, false, true),
  ((select id from public.menu_items where slug = 'crown-crust'), 'Medium', 'medium', 1199, 1, true, true),
  ((select id from public.menu_items where slug = 'crown-crust'), 'Large', 'large', 1799, 2, false, true),
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

-- Verification SQL (manual):
-- select count(*) from menu_categories where is_active and slug <> 'toppings'; -- expect 13
-- select count(*) from menu_items where is_available and product_type <> 'topping'; -- expect 58
-- select count(*) from menu_items where product_type = 'topping' and is_available; -- expect 3
-- select count(*) from menu_item_variants v join menu_items i on i.id = v.menu_item_id
--   where v.is_available and i.is_available; -- expect 40

commit;
