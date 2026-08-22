-- =============================================================================
-- ADR-046 — Catalog tenancy: menu_categories / menu_items become organization-owned
-- =============================================================================
-- Implements ADR-045 Section 2, Option A (fully isolated per-tenant catalogs),
-- as accepted by the Founder. Adds organization_id to menu_categories and
-- menu_items, backfills every existing row to Telepizza's organization_id
-- (zero behavior change for the live tenant), and converts the global
-- unique(slug) constraints to unique(organization_id, slug) so a future
-- tenant can reuse slugs like "family-deal" independently.
--
-- menu_item_variants is NOT given its own organization_id column -- it is
-- tightly owned by menu_items via menu_item_id (on delete cascade) and
-- inherits scoping through that relationship, matching how this repo already
-- treats menu_item_variants as a child of menu_items everywhere else.
--
-- branch_menu_item_overrides is untouched -- per its own comment it is
-- "INACTIVE by design... No runtime path reads it," a future per-branch
-- pricing feature unrelated to tenant ownership of the catalog itself.
--
-- Additive, forward-only. Safe to re-run.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) menu_categories
-- ---------------------------------------------------------------------------
alter table public.menu_categories
  add column if not exists organization_id uuid;

update public.menu_categories
set organization_id = '00000000-0000-4000-8000-000000000001'::uuid
where organization_id is null;

alter table public.menu_categories
  alter column organization_id set default '00000000-0000-4000-8000-000000000001'::uuid,
  alter column organization_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'menu_categories_organization_id_fkey'
      and conrelid = 'public.menu_categories'::regclass
  ) then
    alter table public.menu_categories
      add constraint menu_categories_organization_id_fkey
      foreign key (organization_id)
      references public.organizations (id)
      on update restrict on delete restrict;
  end if;
end
$$;

-- Global unique(slug) -> per-organization unique(organization_id, slug).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'menu_categories_slug_key'
      and conrelid = 'public.menu_categories'::regclass
  ) then
    alter table public.menu_categories drop constraint menu_categories_slug_key;
  end if;
end
$$;

create unique index if not exists menu_categories_organization_id_slug_idx
  on public.menu_categories (organization_id, slug);

create index if not exists menu_categories_organization_id_idx
  on public.menu_categories (organization_id);

-- ---------------------------------------------------------------------------
-- 2) menu_items
-- ---------------------------------------------------------------------------
alter table public.menu_items
  add column if not exists organization_id uuid;

update public.menu_items
set organization_id = '00000000-0000-4000-8000-000000000001'::uuid
where organization_id is null;

alter table public.menu_items
  alter column organization_id set default '00000000-0000-4000-8000-000000000001'::uuid,
  alter column organization_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'menu_items_organization_id_fkey'
      and conrelid = 'public.menu_items'::regclass
  ) then
    alter table public.menu_items
      add constraint menu_items_organization_id_fkey
      foreign key (organization_id)
      references public.organizations (id)
      on update restrict on delete restrict;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'menu_items_slug_key'
      and conrelid = 'public.menu_items'::regclass
  ) then
    alter table public.menu_items drop constraint menu_items_slug_key;
  end if;
end
$$;

create unique index if not exists menu_items_organization_id_slug_idx
  on public.menu_items (organization_id, slug);

create index if not exists menu_items_organization_id_idx
  on public.menu_items (organization_id);

-- A menu item's organization_id must always agree with its category's --
-- guards against a future bug assigning an item to another tenant's category.
create or replace function public.enforce_menu_item_organization_matches_category()
returns trigger
language plpgsql
as $$
declare
  v_category_org uuid;
begin
  select organization_id into v_category_org
  from public.menu_categories
  where id = new.category_id;

  if v_category_org is null then
    raise exception 'menu_items.category_id % does not resolve to a menu_categories row', new.category_id;
  end if;

  if v_category_org <> new.organization_id then
    raise exception 'menu_items.organization_id (%) must match its category''s organization_id (%)', new.organization_id, v_category_org;
  end if;

  return new;
end;
$$;

drop trigger if exists menu_items_organization_matches_category on public.menu_items;
create trigger menu_items_organization_matches_category
before insert or update of organization_id, category_id on public.menu_items
for each row execute function public.enforce_menu_item_organization_matches_category();

commit;
