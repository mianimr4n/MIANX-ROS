-- Product modifier system (additive; does not mutate historical order_items).
-- Size pricing remains on menu_item_variants; this schema covers crust/extras/addons
-- and order-time modifier snapshots for Admin CRUD without code changes.
--
-- Apply via approved migration workflow only — do not run against production ad hoc.

-- ---------------------------------------------------------------------------
-- 1) Catalog tables
-- ---------------------------------------------------------------------------

create table if not exists public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null,
  name varchar(120) not null,
  description text,
  selection_type text not null default 'single'
    check (selection_type in ('single', 'multi')),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_modifier_groups_code unique (code),
  constraint chk_modifier_groups_max_select
    check (max_select is null or max_select >= min_select)
);

create table if not exists public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  modifier_group_id uuid not null
    references public.modifier_groups (id) on delete cascade,
  code varchar(80) not null,
  name varchar(150) not null,
  price_delta numeric(12, 2) not null default 0,
  -- Optional size-tier map: {"small":50,"medium":100,"large":150}
  price_delta_by_size jsonb,
  -- When this option represents a size choice (for tier-aware extras)
  size_code varchar(40),
  linked_menu_item_id uuid
    references public.menu_items (id) on delete set null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_modifier_options_group_code unique (modifier_group_id, code),
  constraint chk_modifier_options_price_delta check (price_delta >= 0)
);

create table if not exists public.item_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null
    references public.menu_items (id) on delete cascade,
  modifier_group_id uuid not null
    references public.modifier_groups (id) on delete cascade,
  is_required boolean,
  min_select integer,
  max_select integer,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_item_modifier_groups unique (menu_item_id, modifier_group_id),
  constraint chk_item_modifier_groups_min check (min_select is null or min_select >= 0),
  constraint chk_item_modifier_groups_max
    check (
      max_select is null
      or min_select is null
      or max_select >= min_select
    )
);

-- Historical stability: snapshot columns + nullable FK to live option
create table if not exists public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null
    references public.order_items (id) on delete cascade,
  modifier_option_id uuid
    references public.modifier_options (id) on delete set null,
  group_code varchar(80) not null,
  group_name varchar(120) not null,
  option_code varchar(80) not null,
  option_name varchar(150) not null,
  price_delta numeric(12, 2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_modifier_options_group
  on public.modifier_options (modifier_group_id, sort_order);

create index if not exists idx_item_modifier_groups_item
  on public.item_modifier_groups (menu_item_id, sort_order);

create index if not exists idx_item_modifier_groups_group
  on public.item_modifier_groups (modifier_group_id);

create index if not exists idx_order_item_modifiers_order_item
  on public.order_item_modifiers (order_item_id, sort_order);

drop trigger if exists set_modifier_groups_updated_at on public.modifier_groups;
create trigger set_modifier_groups_updated_at
before update on public.modifier_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_modifier_options_updated_at on public.modifier_options;
create trigger set_modifier_options_updated_at
before update on public.modifier_options
for each row execute function public.set_updated_at();

drop trigger if exists set_item_modifier_groups_updated_at on public.item_modifier_groups;
create trigger set_item_modifier_groups_updated_at
before update on public.item_modifier_groups
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS + locked grants (catalog SELECT; order modifiers like order_items)
-- ---------------------------------------------------------------------------

alter table public.modifier_groups enable row level security;
alter table public.modifier_options enable row level security;
alter table public.item_modifier_groups enable row level security;
alter table public.order_item_modifiers enable row level security;

drop policy if exists "Public can read active modifier groups" on public.modifier_groups;
create policy "Public can read active modifier groups"
on public.modifier_groups
for select
using (is_active = true);

drop policy if exists "Public can read active modifier options" on public.modifier_options;
create policy "Public can read active modifier options"
on public.modifier_options
for select
using (
  is_active = true
  and exists (
    select 1
    from public.modifier_groups g
    where g.id = modifier_options.modifier_group_id
      and g.is_active = true
  )
);

drop policy if exists "Public can read active item modifier groups" on public.item_modifier_groups;
create policy "Public can read active item modifier groups"
on public.item_modifier_groups
for select
using (
  is_active = true
  and exists (
    select 1
    from public.menu_items mi
    where mi.id = item_modifier_groups.menu_item_id
      and mi.is_available = true
  )
);

drop policy if exists "Customers select own order item modifiers" on public.order_item_modifiers;
create policy "Customers select own order item modifiers"
on public.order_item_modifiers
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    where oi.id = order_item_modifiers.order_item_id
      and public.current_customer_owns_order(oi.order_id)
  )
);

drop policy if exists "Staff select branch order item modifiers" on public.order_item_modifiers;
create policy "Staff select branch order item modifiers"
on public.order_item_modifiers
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_modifiers.order_item_id
      and public.current_user_has_branch_access(o.branch_id)
  )
);

revoke all on table public.modifier_groups from anon, authenticated;
revoke all on table public.modifier_options from anon, authenticated;
revoke all on table public.item_modifier_groups from anon, authenticated;
revoke all on table public.order_item_modifiers from anon, authenticated;

grant select on table public.modifier_groups to anon, authenticated;
grant select on table public.modifier_options to anon, authenticated;
grant select on table public.item_modifier_groups to anon, authenticated;

grant select on table public.order_item_modifiers to authenticated;

grant select, insert, update, delete on table public.modifier_groups to service_role;
grant select, insert, update, delete on table public.modifier_options to service_role;
grant select, insert, update, delete on table public.item_modifier_groups to service_role;
grant select, insert, update, delete on table public.order_item_modifiers to service_role;

-- ---------------------------------------------------------------------------
-- 3) Seed reusable groups + options
-- ---------------------------------------------------------------------------

insert into public.modifier_groups (
  code, name, description, selection_type, min_select, max_select, is_required, sort_order
) values
  (
    'size',
    'Size',
    'Reusable size group for items without menu_item_variants. Pizzas keep variants for size pricing.',
    'single', 1, 1, true, 10
  ),
  (
    'crust',
    'Crust',
    'Crust style for pizzas',
    'single', 1, 1, true, 20
  ),
  (
    'extra-chicken',
    'Extra chicken',
    'Optional chicken add-on (size-tiered)',
    'multi', 0, 1, false, 30
  ),
  (
    'extra-cheese',
    'Extra cheese',
    'Optional cheese add-ons',
    'multi', 0, 3, false, 40
  ),
  (
    'extra-vegetables',
    'Extra vegetables',
    'Optional vegetable toppings',
    'multi', 0, 8, false, 50
  ),
  (
    'extra-toppings',
    'Extra toppings',
    'Additional premium toppings',
    'multi', 0, 6, false, 60
  ),
  (
    'add-drinks',
    'Add drinks',
    'Optional drink add-on (linked menu SKUs)',
    'single', 0, 1, false, 70
  ),
  (
    'add-sides',
    'Add sides',
    'Optional side add-on (linked menu SKUs)',
    'single', 0, 1, false, 80
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  selection_type = excluded.selection_type,
  min_select = excluded.min_select,
  max_select = excluded.max_select,
  is_required = excluded.is_required,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

-- Size options (available for Admin wiring; not auto-attached to variant pizzas)
insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, size_code, is_default, sort_order
)
select g.id, v.code, v.name, v.price_delta, v.size_code, v.is_default, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('small', '6 inch Small', 0::numeric, 'small', true, 1),
    ('medium', '9 inch Medium', 0::numeric, 'medium', false, 2),
    ('large', '12 inch Large', 0::numeric, 'large', false, 3)
) as v(code, name, price_delta, size_code, is_default, sort_order)
where g.code = 'size'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  size_code = excluded.size_code,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, is_default, sort_order
)
select g.id, v.code, v.name, v.price_delta, v.is_default, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('classic', 'Classic Crust', 0::numeric, true, 1),
    ('thin', 'Thin Crust', 0::numeric, false, 2),
    ('thick', 'Thick Crust', 50::numeric, false, 3),
    ('cheese-burst', 'Cheese Burst Crust', 150::numeric, false, 4)
) as v(code, name, price_delta, is_default, sort_order)
where g.code = 'crust'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, price_delta_by_size,
  linked_menu_item_id, is_default, sort_order
)
select
  g.id,
  'extra-chicken',
  'Extra Chicken',
  50,
  '{"small":50,"medium":100,"large":150}'::jsonb,
  (select id from public.menu_items where slug = 'extra-chicken' limit 1),
  false,
  1
from public.modifier_groups g
where g.code = 'extra-chicken'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  price_delta_by_size = excluded.price_delta_by_size,
  linked_menu_item_id = excluded.linked_menu_item_id,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, price_delta_by_size,
  linked_menu_item_id, is_default, sort_order
)
select g.id, v.code, v.name, v.price_delta, v.price_delta_by_size::jsonb, mi.id, false, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('extra-cheese', 'Extra Cheese', 50::numeric, '{"small":50,"medium":100,"large":150}', 'extra-cheese', 1),
    ('extra-cheese-slice', 'Extra Cheese Slice', 50::numeric, null, 'extra-cheese-slice', 2)
) as v(code, name, price_delta, price_delta_by_size, linked_slug, sort_order)
left join public.menu_items mi on mi.slug = v.linked_slug
where g.code = 'extra-cheese'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  price_delta_by_size = excluded.price_delta_by_size,
  linked_menu_item_id = excluded.linked_menu_item_id,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, is_default, sort_order
)
select g.id, v.code, v.name, v.price_delta, false, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('olives', 'Olives', 40::numeric, 1),
    ('mushrooms', 'Mushrooms', 40::numeric, 2),
    ('onions', 'Onions', 30::numeric, 3),
    ('bell-peppers', 'Bell Peppers', 30::numeric, 4),
    ('jalapenos', 'Jalapeños', 40::numeric, 5),
    ('sweet-corn', 'Sweet Corn', 30::numeric, 6),
    ('tomatoes', 'Tomatoes', 30::numeric, 7)
) as v(code, name, price_delta, sort_order)
where g.code = 'extra-vegetables'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, is_default, sort_order
)
select g.id, v.code, v.name, v.price_delta, false, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('pepperoni', 'Pepperoni', 80::numeric, 1),
    ('smoked-chicken', 'Smoked Chicken', 80::numeric, 2),
    ('bbq-chicken', 'BBQ Chicken', 80::numeric, 3)
) as v(code, name, price_delta, sort_order)
where g.code = 'extra-toppings'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, linked_menu_item_id, is_default, sort_order
)
select g.id, v.code, coalesce(mi.name, v.name), coalesce(mi.base_price, v.price_delta), mi.id, false, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('drink-345ml', 'Drink 345ml', 70::numeric, 1),
    ('drink-500ml', 'Drink 500ml', 100::numeric, 2),
    ('drink-1l', 'Drink 1L', 150::numeric, 3),
    ('drink-1-5l', 'Drink 1.5L', 200::numeric, 4)
) as v(code, name, price_delta, sort_order)
left join public.menu_items mi on mi.slug = v.code
where g.code = 'add-drinks'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  linked_menu_item_id = excluded.linked_menu_item_id,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.modifier_options (
  modifier_group_id, code, name, price_delta, linked_menu_item_id, is_default, sort_order
)
select g.id, v.code, coalesce(mi.name, v.name), coalesce(mi.base_price, v.price_delta), mi.id, false, v.sort_order
from public.modifier_groups g
cross join (
  values
    ('french-fries', 'French Fries', 199::numeric, 1),
    ('family-fries', 'Family Fries', 449::numeric, 2),
    ('loaded-fries', 'Loaded Fries', 399::numeric, 3)
) as v(code, name, price_delta, sort_order)
left join public.menu_items mi on mi.slug = v.code
where g.code = 'add-sides'
on conflict (modifier_group_id, code) do update set
  name = excluded.name,
  price_delta = excluded.price_delta,
  linked_menu_item_id = excluded.linked_menu_item_id,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- 4) Attach pizza catalog items (variants remain the size source)
-- ---------------------------------------------------------------------------

insert into public.item_modifier_groups (
  menu_item_id, modifier_group_id, sort_order, is_active
)
select mi.id, g.id, g.sort_order, true
from public.menu_items mi
cross join public.modifier_groups g
where mi.slug in (
  'tele-special',
  'peri-peri',
  'bihari-kabab',
  'kababish',
  'tikka',
  'bonfire',
  'chicken-supreme',
  'real-fajita',
  'mexicana',
  'cheese-lover',
  'chicago-extreme',
  'crown-crust',
  'stuffed-crust',
  'tele-extreme',
  'sixteen-inch-incher'
)
  and g.code in (
    'crust',
    'extra-chicken',
    'extra-cheese',
    'extra-vegetables',
    'extra-toppings',
    'add-drinks',
    'add-sides'
  )
  and mi.is_available = true
on conflict (menu_item_id, modifier_group_id) do update set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());
