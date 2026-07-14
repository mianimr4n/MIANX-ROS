-- Sync Supabase catalog with apps/website/client/src/data/menu-data.ts (verified menu).
-- Ensures website checkout slugs resolve for API order creation.

insert into public.menu_categories (name, slug, sort_order, is_active)
values ('Broast', 'broast', 45, true)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.menu_items (
  category_id, slug, name, description, image_url, base_price, badge, product_type, is_available, is_featured
)
values
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'bihari-kabab', 'Bihari Kabab', 'Garlic sauce with tikka chicken, topped with kabab slice, onion, and mushroom.', '/images/menu-pizza.jpg', null, 'Hot', 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'kababish', 'Kababish', 'Special sauce with fajita chicken, topped with kabab, mushroom, and capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'bonfire', 'Bonfire', 'Bonfire sauce with fajita chicken, topped with jalapeno, mushroom, and tomato.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'real-fajita', 'Real Fajita', 'Fajita sauce with fajita chicken, topped with onion and capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'mexicana', 'Mexicana', 'Special sauce with smoked chicken, topped with sausages, black olive, tomato, and capsicum.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'cheese-lover', 'Cheese Lover', 'Original red base sauce, loaded with mozzarella cheese.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'behari-kabab-pizza', 'Behari Kabab Pizza', 'Specialty Behari Kabab pizza.', '/images/menu-pizza.jpg', 549, 'Starting Price', 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'chicago-extreme', 'Chicago Extreme', 'Double-layer pizza with two premium sauces, lots of cheese, and chicken.', '/images/menu-pizza.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'stuffed-crust', 'Stuffed Crust', 'Any flavour with kabab stuffing on the edges.', '/images/menu-pizza.jpg', 1749, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'tele-extreme', 'Tele Extreme Pizza', 'Two premium sauces with loaded chicken and lots of cheese.', '/images/menu-pizza.jpg', 1699, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'sixteen-inch-incher', '16" Incher', 'Large 16-inch specialty pizza.', '/images/menu-pizza.jpg', 2399, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'special-sandwich', 'Special Sandwich', 'Served with dip sauce and fries.', '/images/sides-platter.jpg', 749, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'baked-smoked-sandwich', 'Baked Smoked Sandwich', 'Served with dip sauce and fries.', '/images/sides-platter.jpg', 749, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'sizzling-sandwich', 'Sizzling Sandwich', 'Served with dip sauce and fries.', '/images/sides-platter.jpg', 749, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'bbq-wings', 'BBQ Wings', 'BBQ-flavoured chicken wings.', '/images/sides-platter.jpg', 599, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'creamo-wings', 'Creamo Wings', 'Creamy-style chicken wings.', '/images/sides-platter.jpg', 599, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'oven-baked-wings', 'Oven Baked Wings', 'Oven-baked chicken wings.', '/images/sides-platter.jpg', 549, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'flaming-wings', 'Flaming Wings', 'Spicy flaming chicken wings.', '/images/sides-platter.jpg', 549, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'fries'), 'french-fries', 'French Fries', 'French fries.', '/images/sides-platter.jpg', 199, null, 'fries', true, false),
  ((select id from public.menu_categories where slug = 'fries'), 'family-fries', 'Family Fries', 'Family-size fries.', '/images/sides-platter.jpg', 350, null, 'fries', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'crunchy-wrap', 'Crunchy Wrap', 'Crunchy chicken wrap.', '/images/sides-platter.jpg', 399, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'dynamite-wrap', 'Dynamite Wrap', 'Dynamite-flavoured wrap.', '/images/sides-platter.jpg', 399, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'behari-roll', 'Behari Roll', 'Four pieces with special chicken and sauce, baked with cheese, mushroom, and olives; served with dip sauce and fries.', '/images/sides-platter.jpg', 799, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'broast'), 'quarter-broast', 'Quarter Broast', '1 Leg & 1 Thigh OR 1 Wing & 1 Chest, 1 Bun, Fries, (1 Dip) Garlic Dip OR Mustard Dip.', '/images/sides-platter.jpg', 750, 'Hot', 'side', true, true),
  ((select id from public.menu_categories where slug = 'broast'), 'half-broast', 'Half Broast', '1 Leg, 1 Thigh, 1 wing, 1 chest, 1 Bun, Fries, (3 Dips) 1 Garlic Dip, 1 Mustard Dip & 1 Tangy Dip.', '/images/sides-platter.jpg', 1390, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'broast'), 'full-broast', 'Full Broast', '2 Legs, 2 Thighs, 2 wings, 2 chests, 2 Buns, Fries, (6 Dips) 2 Garlic Dips, 2 Mustard Dips & 2 Tangy Dips.', '/images/sides-platter.jpg', 2590, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'broast'), 'broast-garlic-dip', 'Extra Garlic Dip', 'Extra garlic sauce dip for broast.', '/images/sides-platter.jpg', 60, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'broast'), 'broast-mustard-dip', 'Extra Mustard Dip', 'Extra mustard sauce dip for broast.', '/images/sides-platter.jpg', 60, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'crispy-box', 'Crispy Box', 'Three pieces of crispy chicken with one garlic ranch dip.', '/images/sides-platter.jpg', 670, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'fried-chicken-chest', 'Fried Chicken — Chest', 'Fried chicken chest piece.', '/images/sides-platter.jpg', 250, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'fried-chicken', 'Fried Chicken', 'Fried chicken piece.', '/images/sides-platter.jpg', 220, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'nuggets', 'Nuggets', '10 pieces.', '/images/sides-platter.jpg', 449, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'hot-shots', 'Hot Shots', '10 pieces.', '/images/sides-platter.jpg', 449, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-1l', '1 Liter Drink', '1 liter soft drink.', '/images/desserts-drinks.jpg', 170, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-500ml', '500 ml Drink', '500 ml soft drink.', '/images/desserts-drinks.jpg', 110, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-345ml', '345 ml Drink', '345 ml soft drink.', '/images/desserts-drinks.jpg', 70, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'large-water', 'Large Water', 'Large bottled water.', '/images/desserts-drinks.jpg', 99, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'small-water', 'Small Water', 'Small bottled water.', '/images/desserts-drinks.jpg', 50, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'pizza-fest', 'Pizza Fest', '1 large pizza and 1.5 liter drink.', '/images/promos/pizza-fest.jpg', 1680, 'Hot', 'deal', true, true),
  ((select id from public.menu_categories where slug = 'deals'), 'mega-offer', 'Mega Offer', '2 large pizzas and 1.5 liter Coke.', '/images/deals-section.jpg', 3140, null, 'deal', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'pair-deal', 'Pair Deal', '2 medium pizzas and 1.5 liter Coke.', '/images/promos/pair-deal.jpg', 1999, 'Hot', 'deal', true, true),
  ((select id from public.menu_categories where slug = 'deals'), 'family-festival', 'Family Festival', '5 Zinger burgers and 1.5 liter drink.', '/images/deals-section.jpg', 2350, null, 'deal', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'deal-for-two', 'Deal for 2', '2 Zinger burgers and 2 drinks of 345 ml.', '/images/deals-section.jpg', 999, null, 'deal', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'knock-out-deal', 'Knock Out Deal', '3 Zinger burgers and 1 liter drink.', '/images/promos/knock-out-deal.jpg', 1440, null, 'deal', true, false)
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

insert into public.menu_item_variants (menu_item_id, label, size_code, price, sort_order, is_default, is_available)
values
  ((select id from public.menu_items where slug = 'bihari-kabab'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'bihari-kabab'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'bihari-kabab'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'kababish'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'kababish'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'kababish'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'bonfire'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'bonfire'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'bonfire'), '12 inch Large', 'large', 1470, 3, false, true),
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
  ((select id from public.menu_items where slug = 'chicago-extreme'), 'Large', 'large', 1899, 2, false, true)
on conflict (menu_item_id, label) do update
set
  size_code = excluded.size_code,
  price = excluded.price,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  is_available = excluded.is_available;
