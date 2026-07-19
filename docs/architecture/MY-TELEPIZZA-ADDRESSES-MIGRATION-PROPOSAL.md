# Customer addresses cloud persistence

**Status:** D1 **APPROVED** (CP-0) — forward migration **committed** on `polish/my-telepizza-ux` as `20260719090000_customer_addresses.sql`. **Not claimed applied** in staging/production until env evidence exists.

**Sprint:** CP-1 (extends Sprint 4.5A My Telepizza)

**Why:** Device-local drafts must not be treated as account source of truth after cutover.

## Goal

Persist delivery addresses per authenticated customer with ownership + RLS, so My Telepizza and checkout can sync across devices.

## Minimal schema (draft)

```sql
-- D1 APPROVED — applied via 20260719090000_customer_addresses.sql on integration branch
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (label in ('Home', 'Office', 'Other')),
  line1 text not null,
  area text not null default '',
  city text not null default 'Multan',
  notes text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_addresses_one_default_per_user
  on public.customer_addresses (user_id)
  where is_default;

alter table public.customer_addresses enable row level security;

create policy customer_addresses_select_own
  on public.customer_addresses for select
  to authenticated
  using (user_id = auth.uid());

create policy customer_addresses_insert_own
  on public.customer_addresses for insert
  to authenticated
  with check (user_id = auth.uid());

create policy customer_addresses_update_own
  on public.customer_addresses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy customer_addresses_delete_own
  on public.customer_addresses for delete
  to authenticated
  using (user_id = auth.uid());
```

## API (after approval)

- `GET /api/v1/me/addresses`
- `POST /api/v1/me/addresses`
- `PATCH /api/v1/me/addresses/:id`
- `DELETE /api/v1/me/addresses/:id`
- Optional one-time import of device drafts (explicit customer confirm)

## Non-goals

- No GPS / geocoding secrets in client
- No RLS weakening for anon write
- No localStorage as source of truth after cutover

## Current hub behaviour (post CP-1)

When API + migration are up: cloud SoT via `/me/addresses`. Device drafts may remain for import only; `ADDRESSES_CLOUD_SYNC_AVAILABLE = true` when wired. Until migration apply in a given env, UI/API degrade honestly.

