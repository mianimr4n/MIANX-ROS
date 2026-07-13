insert into public.roles (name, code, description, is_system_role)
values
  ('Super Admin', 'super-admin', 'Full system access across Telepizza operations.', true),
  ('Branch Manager', 'branch-manager', 'Branch operations, staff, and order oversight.', true),
  ('Kitchen Staff', 'kitchen', 'Kitchen order preparation workflows.', true),
  ('Cashier', 'cashier', 'POS and payment workflows.', true),
  ('Rider', 'rider', 'Delivery assignment and completion workflows.', true),
  ('Customer Support', 'customer-support', 'Customer support and order resolution.', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role;

insert into public.permissions (module, action, code, description)
values
  ('menu', 'read', 'menu.read', 'Read menu catalog and variants.'),
  ('menu', 'write', 'menu.write', 'Manage menu categories, items, and variants.'),
  ('branch', 'read', 'branch.read', 'Read branches and routing data.'),
  ('branch', 'manage', 'branch.manage', 'Manage branch settings and operations.'),
  ('order', 'read', 'order.read', 'Read orders and tracking events.'),
  ('order', 'create', 'order.create', 'Create new customer orders.'),
  ('order', 'manage', 'order.manage', 'Manage order state changes.'),
  ('delivery', 'read', 'delivery.read', 'Read delivery assignments and status.'),
  ('delivery', 'assign', 'delivery.assign', 'Assign riders to deliveries.'),
  ('delivery', 'update', 'delivery.update', 'Update rider delivery status.'),
  ('payment', 'read', 'payment.read', 'Read payment state and reconciliation data.'),
  ('payment', 'manage', 'payment.manage', 'Manage payment captures, updates, and refunds.'),
  ('staff', 'read', 'staff.read', 'Read staff and shift data.'),
  ('staff', 'manage', 'staff.manage', 'Manage staff, roles, and assignments.'),
  ('admin', 'access', 'admin.access', 'Access Telepizza admin controls.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select
  roles.id,
  permissions.id
from public.roles
join public.permissions on (
  (roles.code = 'super-admin')
  or (roles.code = 'branch-manager' and permissions.code in (
    'menu.read', 'menu.write', 'branch.read', 'branch.manage',
    'order.read', 'order.create', 'order.manage',
    'delivery.read', 'delivery.assign',
    'payment.read', 'payment.manage',
    'staff.read', 'staff.manage', 'admin.access'
  ))
  or (roles.code = 'kitchen' and permissions.code in ('order.read', 'order.manage'))
  or (roles.code = 'cashier' and permissions.code in ('order.read', 'order.manage', 'payment.read', 'payment.manage'))
  or (roles.code = 'rider' and permissions.code in ('delivery.read', 'delivery.update', 'order.read'))
  or (roles.code = 'customer-support' and permissions.code in ('order.read', 'delivery.read', 'payment.read'))
)
on conflict do nothing;

insert into public.branches (
  branch_code,
  name,
  city,
  area,
  address,
  phone,
  latitude,
  longitude,
  status,
  opening_hours
)
values
  (
    'royal-orchard',
    'Royal Orchard Branch',
    'Multan',
    'Musa Wala',
    'Royal Orchard Main Business Plaza, Musa Wala, Multan, 60000',
    '0304-1110495',
    30.17230000,
    71.47270000,
    'operating',
    '{"daily":"10:00 AM - 2:30 AM"}'::jsonb
  ),
  (
    'northern-bypass',
    'Northern Bypass Road Branch',
    'Multan',
    'Northern Bypass',
    'Northern Bypass Road, Multan',
    null,
    30.19850000,
    71.48930000,
    'coming-soon',
    '{"daily":"Coming Soon"}'::jsonb
  )
on conflict (branch_code) do update
set
  name = excluded.name,
  city = excluded.city,
  area = excluded.area,
  address = excluded.address,
  phone = excluded.phone,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status = excluded.status,
  opening_hours = excluded.opening_hours;

insert into public.menu_categories (name, slug, sort_order, is_active)
values
  ('Signature Pizzas', 'signature-pizzas', 10, true),
  ('Classic Pizzas', 'classic-pizzas', 20, true),
  ('Specialty Pizzas', 'specialty-pizzas', 30, true),
  ('Burgers', 'burgers', 40, true),
  ('Sandwiches', 'sandwiches', 50, true),
  ('Wings', 'wings', 60, true),
  ('Fries', 'fries', 70, true),
  ('Wraps & Rolls', 'wraps-rolls', 80, true),
  ('Pasta', 'pasta', 90, true),
  ('Chicken & Sides', 'chicken-sides', 100, true),
  ('Drinks', 'drinks', 110, true),
  ('Deals', 'deals', 120, true)
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
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'tele-special', 'Tele Special', 'Special chicken with special sauce, topped with olive, mushroom, and capsicum.', '/images/menu-pizza_f729e710.jpg', null, 'Signature', 'pizza', true, true),
  ((select id from public.menu_categories where slug = 'signature-pizzas'), 'peri-peri', 'Peri Peri', 'Peri peri sauce with tikka chicken, topped with kabab, sausages, and tomato.', '/images/menu-pizza_f729e710.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'tikka', 'Tikka', 'Tikka sauce with tikka chicken, topped with olive and onion.', '/images/menu-pizza_f729e710.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'classic-pizzas'), 'chicken-supreme', 'Chicken Supreme', 'Original red base sauce, three types of chicken, topped with olive, mushroom, jalapeno, and capsicum.', '/images/menu-pizza_f729e710.jpg', null, null, 'pizza', true, false),
  ((select id from public.menu_categories where slug = 'specialty-pizzas'), 'crown-crust', 'Crown Crust', 'Any flavour with chicken stuffing on the edges and Tele Pizza signature sauce.', '/images/menu-pizza_f729e710.jpg', null, null, 'pizza', true, true),
  ((select id from public.menu_categories where slug = 'burgers'), 'patty-burger', 'Patty Burger', 'Tele Pizza patty burger.', '/images/menu-burger_bf9b42fb.jpg', 299, null, 'burger', true, false),
  ((select id from public.menu_categories where slug = 'sandwiches'), 'crunchy-sandwich', 'Crunchy Sandwich', 'Served with dip sauce and fries.', '/images/sides-platter_782cdd37.jpg', 799, null, 'sandwich', true, false),
  ((select id from public.menu_categories where slug = 'wings'), 'fried-crispy-wings', 'Fried & Crispy Wings', 'Crispy fried chicken wings.', '/images/sides-platter_782cdd37.jpg', 599, null, 'wings', true, false),
  ((select id from public.menu_categories where slug = 'fries'), 'loaded-fries', 'Loaded Fries', 'Loaded fries.', '/images/sides-platter_782cdd37.jpg', 650, null, 'fries', true, false),
  ((select id from public.menu_categories where slug = 'wraps-rolls'), 'jumbo-wrap', 'Tele Pizza Special Jumbo Wrap', 'Tele Pizza special jumbo wrap.', '/images/sides-platter_782cdd37.jpg', 649, null, 'wrap', true, false),
  ((select id from public.menu_categories where slug = 'pasta'), 'crunchy-pasta', 'Crunchy Pasta', 'Crunchy pasta.', '/images/pasta-dish_6d0eeea5.jpg', 849, null, 'pasta', true, false),
  ((select id from public.menu_categories where slug = 'chicken-sides'), 'chicken-tender-strips', 'Chicken Tender Strips', 'Five pieces, served with dip sauce.', '/images/sides-platter_782cdd37.jpg', 590, null, 'side', true, false),
  ((select id from public.menu_categories where slug = 'drinks'), 'drink-1-5l', '1.5 Liter Drink', '1.5 liter soft drink.', '/images/desserts-drinks_397216c1.jpg', 210, null, 'drink', true, false),
  ((select id from public.menu_categories where slug = 'deals'), 'family-deal', 'Family Deal', '1 large pizza, 10 pcs wings, and 1.5 liter drink.', '/images/deals-section_ee7752d9.jpg', 2250, null, 'deal', true, true)
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
  ((select id from public.menu_items where slug = 'tele-special'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'tele-special'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'tele-special'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'peri-peri'), '6 inch Small', 'small', 499, 1, true, true),
  ((select id from public.menu_items where slug = 'peri-peri'), '9 inch Medium', 'medium', 950, 2, false, true),
  ((select id from public.menu_items where slug = 'peri-peri'), '12 inch Large', 'large', 1570, 3, false, true),
  ((select id from public.menu_items where slug = 'tikka'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'tikka'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'tikka'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'chicken-supreme'), '6 inch Small', 'small', 470, 1, true, true),
  ((select id from public.menu_items where slug = 'chicken-supreme'), '9 inch Medium', 'medium', 890, 2, false, true),
  ((select id from public.menu_items where slug = 'chicken-supreme'), '12 inch Large', 'large', 1470, 3, false, true),
  ((select id from public.menu_items where slug = 'crown-crust'), 'Medium', 'medium', 1199, 1, true, true),
  ((select id from public.menu_items where slug = 'crown-crust'), 'Large', 'large', 1799, 2, false, true)
on conflict (menu_item_id, label) do update
set
  size_code = excluded.size_code,
  price = excluded.price,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  is_available = excluded.is_available;
