create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name varchar(150) not null,
  email varchar(150) unique,
  phone varchar(30) unique,
  password_hash text,
  user_type text not null default 'customer' check (
    user_type in ('customer', 'staff', 'rider', 'admin', 'support', 'franchise')
  ),
  status text not null default 'invited' check (
    status in ('invited', 'active', 'inactive', 'suspended')
  ),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  code varchar(100) not null unique,
  description text,
  is_system_role boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  module varchar(100) not null,
  action varchar(100) not null,
  code varchar(150) not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  branch_code varchar(50) not null unique,
  name varchar(150) not null,
  city varchar(100) not null,
  area varchar(150),
  address text not null,
  phone varchar(30),
  email varchar(150),
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  status text not null default 'operating' check (
    status in ('operating', 'coming-soon', 'inactive')
  ),
  opening_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role_id, branch_id)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (role_id, permission_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users (id) on delete set null,
  full_name varchar(150) not null,
  phone varchar(30) not null,
  email varchar(150),
  date_of_birth date,
  gender varchar(30),
  status text not null default 'active' check (
    status in ('active', 'inactive', 'blocked')
  ),
  marketing_consent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(150) not null,
  slug varchar(150) not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories (id) on delete restrict,
  slug varchar(150) not null unique,
  name varchar(150) not null,
  description text,
  image_url text,
  base_price numeric(12, 2),
  badge varchar(80),
  product_type varchar(50) not null default 'food' check (
    product_type in ('pizza', 'burger', 'sandwich', 'wings', 'fries', 'wrap', 'pasta', 'side', 'drink', 'deal')
  ),
  is_available boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  label varchar(100) not null,
  size_code varchar(50),
  price numeric(12, 2) not null,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (menu_item_id, label)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number varchar(100) not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  branch_id uuid not null references public.branches (id) on delete restrict,
  order_type text not null check (
    order_type in ('delivery', 'pickup', 'dine-in')
  ),
  order_source text not null check (
    order_source in ('website', 'whatsapp', 'mobile', 'pos', 'admin')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'completed', 'cancelled')
  ),
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  delivery_fee numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'authorized', 'paid', 'failed', 'refunded')
  ),
  contact_name varchar(150) not null,
  contact_phone varchar(30) not null,
  delivery_address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  variant_id uuid references public.menu_item_variants (id) on delete set null,
  product_name varchar(150) not null,
  variant_name varchar(100),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null,
  instructions text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider_code varchar(100),
  payment_method varchar(50) not null,
  transaction_reference varchar(150) unique,
  amount numeric(12, 2) not null,
  currency varchar(10) not null default 'PKR',
  status text not null default 'pending' check (
    status in ('pending', 'authorized', 'paid', 'failed', 'refunded')
  ),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete restrict,
  full_name varchar(150) not null,
  phone varchar(30) not null,
  vehicle_type varchar(50) not null,
  vehicle_number varchar(100),
  status text not null default 'offline' check (
    status in ('offline', 'available', 'busy', 'inactive')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  rider_id uuid references public.riders (id) on delete set null,
  branch_id uuid not null references public.branches (id) on delete restrict,
  delivery_address text not null,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  status text not null default 'pending' check (
    status in ('pending', 'assigned', 'picked-up', 'delivered', 'failed', 'cancelled')
  ),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  employee_code varchar(50) not null unique,
  department varchar(100) not null,
  job_title varchar(100) not null,
  shift_name varchar(100),
  hire_date date,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'suspended')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_user_roles_branch_id on public.user_roles (branch_id);
create index if not exists idx_role_permissions_role_id on public.role_permissions (role_id);
create index if not exists idx_menu_items_category_id on public.menu_items (category_id);
create index if not exists idx_menu_item_variants_item_id on public.menu_item_variants (menu_item_id);
create index if not exists idx_orders_branch_status on public.orders (branch_id, status);
create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_riders_branch_status on public.riders (branch_id, status);
create index if not exists idx_deliveries_branch_status on public.deliveries (branch_id, status);
create index if not exists idx_staff_branch_status on public.staff (branch_id, status);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create trigger set_permissions_updated_at
before update on public.permissions
for each row execute function public.set_updated_at();

create trigger set_branches_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger set_menu_categories_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();

create trigger set_menu_items_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create trigger set_menu_item_variants_updated_at
before update on public.menu_item_variants
for each row execute function public.set_updated_at();

create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger set_riders_updated_at
before update on public.riders
for each row execute function public.set_updated_at();

create trigger set_deliveries_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create trigger set_staff_updated_at
before update on public.staff
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.customers enable row level security;
alter table public.branches enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.riders enable row level security;
alter table public.deliveries enable row level security;
alter table public.staff enable row level security;

create policy "Public can read branches"
on public.branches
for select
using (status <> 'inactive');

create policy "Public can read active menu categories"
on public.menu_categories
for select
using (is_active = true);

create policy "Public can read active menu items"
on public.menu_items
for select
using (is_available = true);

create policy "Public can read active menu variants"
on public.menu_item_variants
for select
using (is_available = true);
