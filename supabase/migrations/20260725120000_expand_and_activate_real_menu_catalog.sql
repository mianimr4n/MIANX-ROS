-- Expand and activate the complete real Telepizza menu catalog.
-- Founder Production Data Authorization: 2026-07-25 (menu expansion + full activation).
--
-- Canonical source of truth: REAL-MENU-EXTRACTION.md (Royal Orchard menu-board photos,
-- 131 priced entries / 24 printed sections), applied over the existing catalog that was
-- seeded by 20260718180000_sync_canonical_menu_catalog.sql.
--
-- HARD RULES (enforced below with assertions):
--   * NO TRUNCATE, NO DELETE, NO CASCADE.
--   * Upsert by slug / (menu_item_id, label) only — never treat UUID as identity.
--   * Existing category/item/variant IDs are preserved.
--   * order_items, modifier_groups, item_modifier_groups, modifier_options must not shrink.
--   * Production-only records not on the real board (jumbo-wrap, behari-kabab-pizza)
--     are left untouched — reported for owner decision, not deleted/activated here.

begin;

-- ---------------------------------------------------------------------------
-- 0) Pre-flight snapshot for safety assertions
-- ---------------------------------------------------------------------------
create temporary table _menu_migration_pre on commit drop as
select
  (select count(*) from public.order_items)            as order_items,
  (select count(*) from public.item_modifier_groups)   as item_modifier_groups,
  (select count(*) from public.modifier_options)       as modifier_options,
  (select count(*) from public.modifier_groups)        as modifier_groups,
  (select count(*) from public.menu_categories)        as menu_categories,
  (select count(*) from public.menu_items)             as menu_items,
  (select count(*) from public.menu_item_variants)     as menu_item_variants;

create temporary table _order_items_pre on commit drop as
select id, order_id, menu_item_id, variant_id from public.order_items;

-- ---------------------------------------------------------------------------
-- 1) Categories — upsert all 27 real-menu categories, all active
-- ---------------------------------------------------------------------------
insert into public.menu_categories (name, slug, sort_order, is_active)
values
  ('Signature Pizzas',   'signature-pizzas',   10,  true),
  ('Classic Pizzas',     'classic-pizzas',     20,  true),
  ('Specialty Pizzas',   'specialty-pizzas',   30,  true),
  ('Toppings',           'toppings',           35,  true),
  ('Burgers',            'burgers',            40,  true),
  ('Grill Burgers',      'grill-burgers',      42,  true),
  ('Smash Beef Burgers', 'smash-beef-burgers', 44,  true),
  ('Broast',             'broast',             45,  true),
  ('Sandwiches',         'sandwiches',         50,  true),
  ('Wings',              'wings',              60,  true),
  ('Fries',              'fries',              70,  true),
  ('Wraps & Rolls',      'wraps-rolls',        80,  true),
  ('Pasta',              'pasta',              90,  true),
  ('Appetizers',         'appetizers',         95,  true),
  ('Chicken & Sides',    'chicken-sides',      100, true),
  ('Dips',               'dips',               105, true),
  ('Drinks',             'drinks',             110, true),
  ('Deals',              'deals',              120, true),
  ('Welcome Drinks',     'welcome-drinks',     130, true),
  ('Classic Mojitos',    'mojitos',            135, true),
  ('Smoothies',          'smoothies',          140, true),
  ('Matcha',             'matcha',             145, true),
  ('Frappe',             'frappe',             150, true),
  ('Shakes',             'shakes',             155, true),
  ('Special Mocktails',  'special-mocktails',  160, true),
  ('Iced Coffee',        'iced-coffee',        165, true),
  ('Desserts',           'desserts',           170, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- 2) Existing items — real-board price/name corrections (IDs preserved)
-- ---------------------------------------------------------------------------
-- Specialty pizzas (base-price items)
update public.menu_items set base_price = 2050 where slug = 'stuffed-crust';
update public.menu_items set base_price = 1950 where slug = 'tele-extreme';
update public.menu_items set base_price = 2800 where slug = 'sixteen-inch-incher';
-- Chicken burgers
update public.menu_items set base_price = 550 where slug = 'zinger-burger';
update public.menu_items set base_price = 350 where slug = 'patty-burger';
-- Sandwiches
update public.menu_items set base_price = 930 where slug in ('special-sandwich','baked-smoked-sandwich','sizzling-sandwich');
update public.menu_items set base_price = 950 where slug = 'crunchy-sandwich';
-- Wings ("BBQ" is printed "Hot BBQ" on the real board)
update public.menu_items set base_price = 650, name = 'Hot BBQ' where slug = 'bbq-wings';
update public.menu_items set base_price = 650 where slug in ('fried-crispy-wings','creamo-wings');
update public.menu_items set base_price = 600 where slug in ('oven-baked-wings','flaming-wings');
-- Fries
update public.menu_items set base_price = 790 where slug = 'loaded-fries';
update public.menu_items set base_price = 250 where slug = 'french-fries';
update public.menu_items set base_price = 390 where slug = 'family-fries';
-- Wraps & rolls (board prints "Crunch"/"Dynamite" at 550; names kept)
update public.menu_items set base_price = 950 where slug = 'behari-roll';
update public.menu_items set base_price = 550 where slug in ('crunchy-wrap','dynamite-wrap');
-- Pasta (board splits Special 899 and Flaming 899; Flaming added as its own item below)
update public.menu_items set base_price = 980 where slug = 'crunchy-pasta';
update public.menu_items set base_price = 899, name = 'Special Pasta', description = 'Special pasta.' where slug = 'special-pasta';
-- Chicken & sides
update public.menu_items set base_price = 750 where slug = 'chicken-tender-strips';
update public.menu_items set base_price = 790 where slug = 'crispy-box';
update public.menu_items set base_price = 300 where slug = 'fried-chicken-chest';
update public.menu_items set base_price = 280 where slug = 'fried-chicken';
update public.menu_items set base_price = 490 where slug = 'nuggets';
update public.menu_items set base_price = 499 where slug = 'hot-shots';
-- Drinks
update public.menu_items set base_price = 250 where slug = 'drink-1-5l';
update public.menu_items set base_price = 200 where slug = 'drink-1l';
update public.menu_items set base_price = 140 where slug = 'drink-500ml';
update public.menu_items set base_price = 90  where slug = 'drink-345ml';
update public.menu_items set base_price = 130 where slug = 'large-water';
update public.menu_items set base_price = 70  where slug = 'small-water';
-- Deals
update public.menu_items set base_price = 2650 where slug = 'family-deal';
update public.menu_items set base_price = 2020 where slug = 'pizza-fest';
update public.menu_items set base_price = 3799 where slug = 'mega-offer';
update public.menu_items set base_price = 2600 where slug = 'pair-deal';
update public.menu_items set base_price = 2850 where slug = 'family-festival';
update public.menu_items set base_price = 1240 where slug = 'deal-for-two';
update public.menu_items set base_price = 1750 where slug = 'knock-out-deal';

-- ---------------------------------------------------------------------------
-- 3) Activation of the approved real catalog that was previously discontinued
--     (Broast is printed on the real board with matching prices; toppings are
--      the printed "Extra Topping" section.)
--     NOT activated: behari-kabab-pizza (not on the real board; owner decision).
-- ---------------------------------------------------------------------------
update public.menu_items
set is_available = true
where slug in ('quarter-broast','half-broast','full-broast','broast-garlic-dip','broast-mustard-dip')
  and is_available = false;

-- ---------------------------------------------------------------------------
-- 4) Pizza size-matrix — real board prices; Medium is printed 10" (label fix
--     via UPDATE so existing variant IDs are preserved, no duplicate rows)
-- ---------------------------------------------------------------------------
update public.menu_item_variants v
set label = '10 inch Medium'
from public.menu_items mi
where mi.id = v.menu_item_id
  and v.label = '9 inch Medium'
  and mi.slug in ('tele-special','peri-peri','bihari-kabab','kababish',
                  'tikka','bonfire','chicken-supreme','real-fajita','mexicana','cheese-lover');

-- Signature pizzas: 620 / 1250 / 1890
update public.menu_item_variants v
set price = case v.size_code when 'small' then 620 when 'medium' then 1250 else 1890 end
from public.menu_items mi
where mi.id = v.menu_item_id
  and mi.slug in ('tele-special','peri-peri','bihari-kabab','kababish');

-- Classic pizzas: 600 / 1200 / 1790
update public.menu_item_variants v
set price = case v.size_code when 'small' then 600 when 'medium' then 1200 else 1790 end
from public.menu_items mi
where mi.id = v.menu_item_id
  and mi.slug in ('tikka','bonfire','chicken-supreme','real-fajita','mexicana','cheese-lover');

-- Specialty M/L
update public.menu_item_variants v
set price = case v.size_code when 'medium' then 1470 else 2150 end
from public.menu_items mi
where mi.id = v.menu_item_id and mi.slug = 'chicago-extreme';

update public.menu_item_variants v
set price = case v.size_code when 'medium' then 1470 else 2099 end
from public.menu_items mi
where mi.id = v.menu_item_id and mi.slug = 'crown-crust';

-- ---------------------------------------------------------------------------
-- 5) New real-menu items (insert-or-update by slug; IDs preserved on re-run)
-- ---------------------------------------------------------------------------
insert into public.menu_items (
  category_id, slug, name, description, image_url, base_price, badge, product_type, is_available, is_featured
)
values
  -- Specialty pizza
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'malai-boti', 'Malai Boti', 'Malai boti sauce topped with malai boti chicken and cheese with olives, tomato and capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  -- Chicken burgers (existing Burgers category)
  ((select id from public.menu_categories where slug = 'burgers'), 'classic-crunch-burger', 'Classic Crunch Burger', 'Tender chicken chest fillet, crispy-coated with spices, served with iceberg and our signature sauce.', '/images/menu-burger.jpg', 450, null, 'burger', true, false),
  ((select id from public.menu_categories where slug = 'burgers'), 'big-boss-burger', 'Big Boss Burger', 'Big and juicy crispy chicken chest fillet with fresh iceberg, signature sauce, and bold spices.', '/images/menu-burger.jpg', 690, null, 'burger', true, false),
  -- Grill burgers (NEW on board)
  ((select id from public.menu_categories where slug = 'grill-burgers'), 'smokehouse-burger', 'Smokehouse Burger', 'Flame-grilled chicken fillet, fresh lettuce, a slice of cheese, crispy shallots, and two secret sauces.', '/images/menu-burger.jpg', 650, 'New', 'burger', true, false),
  ((select id from public.menu_categories where slug = 'grill-burgers'), 'grill-boss-burger', 'Grill Boss Burger', 'Two charcoal-grilled chicken fillets, fresh lettuce, one slice of cheese, crispy shallots, and two secret sauces.', '/images/menu-burger.jpg', 890, 'New', 'burger', true, false),
  ((select id from public.menu_categories where slug = 'grill-burgers'), 'chipotle-fire-burger', 'Chipotle Fire Burger', 'Two double flame-grilled chicken fillets, fresh lettuce, one slice of cheese, crispy shallots, one chipotle sauce, and one secret sauce.', '/images/menu-burger.jpg', 890, 'New', 'burger', true, false),
  -- Smash beef burgers (NEW on board)
  ((select id from public.menu_categories where slug = 'smash-beef-burgers'), 'classic-beef-burger', 'Classic Beef Burger', 'One juicy beef patty, a slice of cheese, fresh lettuce, caramelised onions, and two secret sauces.', '/images/menu-burger.jpg', 690, 'New', 'burger', true, false),
  ((select id from public.menu_categories where slug = 'smash-beef-burgers'), 'signature-beef-burger', 'Signature Beef Burger', 'Two juicy beef patties, two cheese slices, fresh lettuce, caramelised onions, and two secret sauces.', '/images/menu-burger.jpg', 1090, 'New', 'burger', true, false),
  ((select id from public.menu_categories where slug = 'smash-beef-burgers'), 'supreme-beef-burger', 'Supreme Beef Burger', 'Two juicy beef patties, two cheese slices, fresh lettuce, caramelised onions, jalapenos, and two secret sauces.', '/images/menu-burger.jpg', 1090, 'New', 'burger', true, false),
  -- Appetizers
  ((select id from public.menu_categories where slug = 'appetizers'), 'paratha-roll', 'Paratha Roll', 'Soft, flaky paratha filled with tender chicken, caramelised onions, and a rich, tangy sauce.', '/images/sides-platter.jpg', 390, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'appetizers'), 'mozzarella-jalapeno-sticks', 'Mozzarella Jalapeno Sticks', '4 crispy golden sticks made with chicken, filled with mozzarella cheese and spicy jalapenos, served with a rich dip.', '/images/sides-platter.jpg', 599, null, 'side', true, false),
  -- Wraps (jumbo + grill + lil crunch)
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'wrap-it-hot-grilled-jumbo', 'Wrap it Hot Grilled Jumbo', 'Grilled jumbo wrap.', '/images/sides-platter.jpg', 950, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'jalapeno-kick-grilled-jumbo', 'Jalapeno Kick Grilled Jumbo', 'Grilled jumbo wrap with jalapenos.', '/images/sides-platter.jpg', 950, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'wrap-it-hot', 'Wrap it Hot', 'Grilled chicken wrapped in a warm tortilla with fresh vegetables, crispy fries, jalapenos, and our signature sauce.', '/images/sides-platter.jpg', 650, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'jalapeno-kick', 'Jalapeno Kick', 'Grilled chicken wrapped in a warm tortilla with fresh vegetables, crispy fries, jalapenos, and chipotle sauce.', '/images/sides-platter.jpg', 650, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'lil-crunch-wrap', 'Lil Crunch Wrap', 'Little crunch wrap.', '/images/sides-platter.jpg', 400, 'New', 'wrap', true, false),
  -- Pasta
  ((select id from public.menu_categories where slug = 'pasta'), 'flaming-pasta', 'Flaming Pasta', 'Flaming pasta.', '/images/pasta-dish.jpg', 899, null, 'pasta', true, false),
  ((select id from public.menu_categories where slug = 'pasta'), 'alfredo-pasta', 'Alfredo Pasta', 'Alfredo pasta.', '/images/pasta-dish.jpg', 1100, 'New', 'pasta', true, false),
  -- telebar: Welcome drinks
  ((select id from public.menu_categories where slug = 'welcome-drinks'), 'mint-margarita', 'Mint Margarita', 'Fresh mint margarita.', '/images/desserts-drinks.jpg', 350, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'welcome-drinks'), 'fresh-lime', 'Fresh Lime', 'Fresh lime.', '/images/desserts-drinks.jpg', 300, null, 'drink', true, false),
  -- telebar: Classic mojitos
  ((select id from public.menu_categories where slug = 'mojitos'), 'passion-fruit-mojito', 'Passion Fruit', 'Passion fruit mojito.', '/images/desserts-drinks.jpg', 520, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'mojitos'), 'kiwi-coconut-mojito', 'Kiwi Coconut', 'Kiwi coconut mojito.', '/images/desserts-drinks.jpg', 520, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'mojitos'), 'strawberry-mojito', 'Strawberry', 'Strawberry mojito.', '/images/desserts-drinks.jpg', 520, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'mojitos'), 'tropical-blue-mojito', 'Tropical Blue', 'Tropical blue mojito.', '/images/desserts-drinks.jpg', 440, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'mojitos'), 'mango-coconut-mojito', 'Mango Coconut', 'Mango coconut mojito.', '/images/desserts-drinks.jpg', 520, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'mojitos'), 'classic-mojito', 'Classic Mojito', 'Classic mojito.', '/images/desserts-drinks.jpg', 350, null, 'drink', true, false),
  -- telebar: Smoothies
  ((select id from public.menu_categories where slug = 'smoothies'), 'kiwi-smoothie', 'Kiwi Smoothie', 'Kiwi smoothie.', '/images/desserts-drinks.jpg', 699, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'smoothies'), 'passion-fruit-smoothie', 'Passion Fruit Smoothie', 'Passion fruit smoothie.', '/images/desserts-drinks.jpg', 699, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'smoothies'), 'mango-banana-smoothie', 'Mango Banana', 'Mango banana smoothie.', '/images/desserts-drinks.jpg', 599, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'smoothies'), 'tropical-smoothie', 'Tropical Smoothie', 'Tropical smoothie.', '/images/desserts-drinks.jpg', 650, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'smoothies'), 'mango-smoothie', 'Mango Smoothie', 'Mango smoothie.', '/images/desserts-drinks.jpg', 599, null, 'drink', true, false),
  -- telebar: Matcha
  ((select id from public.menu_categories where slug = 'matcha'), 'telespecial-matcha', 'Telespecial', 'Telespecial matcha.', '/images/desserts-drinks.jpg', 799, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'matcha'), 'blueberry-matcha', 'Blueberry', 'Blueberry matcha.', '/images/desserts-drinks.jpg', 899, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'matcha'), 'rose-matcha', 'Rose', 'Rose matcha.', '/images/desserts-drinks.jpg', 850, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'matcha'), 'coconut-matcha', 'Coconut', 'Coconut matcha.', '/images/desserts-drinks.jpg', 799, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'matcha'), 'strawberry-matcha', 'Strawberry Matcha', 'Strawberry matcha.', '/images/desserts-drinks.jpg', 799, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'matcha'), 'mango-matcha', 'Mango Matcha', 'Mango matcha.', '/images/desserts-drinks.jpg', 799, null, 'drink', true, false),
  -- telebar: Frappe
  ((select id from public.menu_categories where slug = 'frappe'), 'chocolate-frappe', 'Chocolate Frappe', 'Chocolate frappe.', '/images/desserts-drinks.jpg', 590, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'frappe'), 'cookies-cream-frappe', 'Cookies & Cream', 'Cookies and cream frappe.', '/images/desserts-drinks.jpg', 590, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'frappe'), 'caramel-frappe', 'Caramel Frappe', 'Caramel frappe.', '/images/desserts-drinks.jpg', 650, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'frappe'), 'vanilla-frappe', 'Vanilla Frappe', 'Vanilla frappe.', '/images/desserts-drinks.jpg', 650, null, 'drink', true, false),
  -- telebar: Shakes ("Choclate" board typo corrected)
  ((select id from public.menu_categories where slug = 'shakes'), 'lotus-shake', 'Lotus Shake', 'Lotus shake.', '/images/desserts-drinks.jpg', 699, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'shakes'), 'salted-caramel-shake', 'Salted Caramel', 'Salted caramel shake.', '/images/desserts-drinks.jpg', 650, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'shakes'), 'oreo-shake', 'Oreo Shake', 'Oreo shake.', '/images/desserts-drinks.jpg', 650, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'shakes'), 'strawberry-shake', 'Strawberry Shake', 'Strawberry shake.', '/images/desserts-drinks.jpg', 650, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'shakes'), 'classic-shake', 'Classic Shake', 'Classic shake.', '/images/desserts-drinks.jpg', 499, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'shakes'), 'chocolate-shake', 'Chocolate Shake', 'Chocolate shake.', '/images/desserts-drinks.jpg', 550, null, 'drink', true, false),
  -- telebar: Special mocktails
  ((select id from public.menu_categories where slug = 'special-mocktails'), 'pina-colada', 'Pina Colada', 'Pina colada mocktail.', '/images/desserts-drinks.jpg', 550, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'special-mocktails'), 'sunset-paradise', 'Sunset Paradise', 'Sunset paradise mocktail.', '/images/desserts-drinks.jpg', 570, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'special-mocktails'), 'peach-mango', 'Peach Mango', 'Peach mango mocktail.', '/images/desserts-drinks.jpg', 399, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'special-mocktails'), 'peach-ice-tea', 'Peach Ice Tea', 'Peach iced tea.', '/images/desserts-drinks.jpg', 450, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'special-mocktails'), 'mango-lime', 'Mango Lime', 'Mango lime mocktail.', '/images/desserts-drinks.jpg', 599, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'special-mocktails'), 'strawberry-daiquiri', 'Strawberry Daiquiri', 'Strawberry daiquiri mocktail.', '/images/desserts-drinks.jpg', 550, null, 'drink', true, false),
  -- telebar: Iced coffee
  ((select id from public.menu_categories where slug = 'iced-coffee'), 'latte-over-iced', 'Latte Over Iced', 'Latte over ice.', '/images/desserts-drinks.jpg', 450, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'iced-coffee'), 'iced-caramel-latte', 'Iced Caramel Latte', 'Iced caramel latte.', '/images/desserts-drinks.jpg', 599, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'iced-coffee'), 'iced-mocha', 'Iced Mocha', 'Iced mocha.', '/images/desserts-drinks.jpg', 599, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'iced-coffee'), 'iced-coffee', 'Iced Coffee', 'Iced coffee.', '/images/desserts-drinks.jpg', 450, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'iced-coffee'), 'over-ice-spanish-latte', 'Over Ice Spanish Latte', 'Spanish latte over ice.', '/images/desserts-drinks.jpg', 450, null, 'drink', true, false),
  -- telebar: Sweet endings / desserts
  ((select id from public.menu_categories where slug = 'desserts'), 'molten-lava-cake', 'Molten Lava Cake', 'Molten lava cake. Ice cream scoop available as add-on.', '/images/desserts-drinks.jpg', 399, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'desserts'), 'lotus-three-milk-cake', 'Lotus Three Milk Cake', 'Lotus three-milk cake.', '/images/desserts-drinks.jpg', 580, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'desserts'), 'chocolate-brownie', 'Chocolate Brownie', 'Chocolate brownie. Ice cream scoop available as add-on.', '/images/desserts-drinks.jpg', 350, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'desserts'), 'ice-cream-scoop', 'Ice Cream Scoop', 'Ice cream scoop add-on for desserts.', '/images/desserts-drinks.jpg', 99, null, 'side', true, false)
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

-- ---------------------------------------------------------------------------
-- 6) New size-matrix variants (Malai Boti: 620 / 1270 / 1890)
-- ---------------------------------------------------------------------------
insert into public.menu_item_variants (menu_item_id, label, size_code, price, sort_order, is_default, is_available)
values
  ((select id from public.menu_items where slug = 'malai-boti'), '6 inch Small',   'small',  620,  1, true,  true),
  ((select id from public.menu_items where slug = 'malai-boti'), '10 inch Medium', 'medium', 1270, 2, false, true),
  ((select id from public.menu_items where slug = 'malai-boti'), '12 inch Large',  'large',  1890, 3, false, true)
on conflict (menu_item_id, label) do update
set
  size_code = excluded.size_code,
  price = excluded.price,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  is_available = excluded.is_available;

-- Ensure every canonical variant is available (none are intentionally off).
update public.menu_item_variants v
set is_available = true
from public.menu_items mi
where mi.id = v.menu_item_id
  and mi.slug <> 'behari-kabab-pizza'
  and v.is_available = false;

-- ---------------------------------------------------------------------------
-- 7) Re-align linked modifier option price_delta to updated catalog prices
--     (same canonical rule as 20260718180000; no new relationships invented)
-- ---------------------------------------------------------------------------
update public.modifier_options mo
set
  price_delta = mi.base_price,
  updated_at = timezone('utc', now())
from public.menu_items mi
where mo.linked_menu_item_id = mi.id
  and mi.slug in (
    'drink-345ml', 'drink-500ml', 'drink-1l', 'drink-1-5l',
    'french-fries', 'family-fries', 'loaded-fries',
    'extra-cheese-slice'
  )
  and mi.base_price is not null;

-- ---------------------------------------------------------------------------
-- 8) Safety assertions — abort the whole transaction on any violation
-- ---------------------------------------------------------------------------
do $$
declare
  pre record;
  bad_count integer;
begin
  select * into pre from _menu_migration_pre;

  -- Relationship/order tables must never shrink.
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

  -- Catalog tables must never shrink (no deletes happened).
  if (select count(*) from public.menu_categories) < pre.menu_categories then
    raise exception 'ASSERTION FAILED: menu_categories count reduced';
  end if;
  if (select count(*) from public.menu_items) < pre.menu_items then
    raise exception 'ASSERTION FAILED: menu_items count reduced';
  end if;
  if (select count(*) from public.menu_item_variants) < pre.menu_item_variants then
    raise exception 'ASSERTION FAILED: menu_item_variants count reduced';
  end if;

  -- Every pre-existing order_item keeps identical menu/variant references.
  select count(*) into bad_count
  from _order_items_pre p
  left join public.order_items oi on oi.id = p.id
  where oi.id is null
     or oi.menu_item_id is distinct from p.menu_item_id
     or oi.variant_id is distinct from p.variant_id;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: % order_items lost or changed menu references', bad_count;
  end if;

  -- No duplicate slugs / variant keys (unique constraints back this up).
  select count(*) into bad_count from (
    select slug from public.menu_categories group by slug having count(*) > 1
  ) d;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: duplicate category slugs';
  end if;
  select count(*) into bad_count from (
    select slug from public.menu_items group by slug having count(*) > 1
  ) d;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: duplicate item slugs';
  end if;
  select count(*) into bad_count from (
    select menu_item_id, label from public.menu_item_variants group by menu_item_id, label having count(*) > 1
  ) d;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: duplicate variant keys';
  end if;

  -- Prices must be non-negative.
  select count(*) into bad_count from public.menu_items where base_price is not null and base_price < 0;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: negative menu_items.base_price';
  end if;
  select count(*) into bad_count from public.menu_item_variants where price < 0;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: negative menu_item_variants.price';
  end if;

  -- Referential sanity: every variant -> item, every item -> category.
  select count(*) into bad_count
  from public.menu_item_variants v
  left join public.menu_items mi on mi.id = v.menu_item_id
  where mi.id is null;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: orphan menu_item_variants';
  end if;
  select count(*) into bad_count
  from public.menu_items mi
  left join public.menu_categories c on c.id = mi.category_id
  where c.id is null;
  if bad_count > 0 then
    raise exception 'ASSERTION FAILED: orphan menu_items';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Verification (read-only, post-apply):
--   select count(*) from menu_categories;                          -- 27
--   select count(*) from menu_categories where is_active;          -- 27
--   select count(*) from menu_items;                               -- 129
--   select count(*) from menu_items where is_available;            -- 128 (behari-kabab-pizza stays off)
--   select count(*) from menu_item_variants;                       -- 43
--
-- Production-only records intentionally untouched (owner decision pending):
--   * jumbo-wrap ('Tele Pizza Special Jumbo Wrap', 649) — not printed on the real board.
--   * behari-kabab-pizza (549, unavailable) — not printed on the real board.
-- ---------------------------------------------------------------------------

commit;
