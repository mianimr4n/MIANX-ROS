# PROC-01 — Phase 1 Customer Migrations Inventory & Apply Plan

**Agent:** Migration governance / prod reconcile
**Working branch:** `fix/prod-db-customer-phase1-reconcile`
**Base:** `main` @ `25e32ac` (and successors)
**Date:** 2026-07-22
**Status:** **RECONCILED — OWNER APPLY PENDING**
**Apply status:** **Not applied to production by this agent.** Owner-gated apply only.

---

## Executive summary

Three forward-only DDL migrations already in git add Phase 1 customer cloud tables (`customer_addresses`, `customer_favorites`, `order_reviews`). They match live API contracts (`/api/v1/me/addresses|favorites|reviews`). No new harden migration was required after contract diff.

**Production linked remote freeze head is still `20260718171000`.** Confirmed 2026-07-22 via `npx supabase migration list --linked` / `db push --linked --dry-run`. That explains production PostgREST:

```text
GET/HEAD/PATCH /rest/v1/customer_addresses → 404
```

(schema-missing — relation not in API cache). Applying the three `20260719*` migrations is the fix. Catalog content `20260718180000` is also pending but **must not** be bundled with CP DDL unless separately approved (it mutates menu rows).

Notification preferences (CP-7) remain **device-local only**. Loyalty/rewards have **no** SQL migrations — intentional.

---

## Linked dry-run evidence (2026-07-22, read-only)

```text
Remote head applied through: 20260718171000
Local-only / pending:
 • 20260718180000_sync_canonical_menu_catalog.sql   ← OPTIONAL (catalog content)
 • 20260719090000_customer_addresses.sql            ← REQUIRED (CP-1)
 • 20260719100000_customer_favorites.sql            ← REQUIRED (CP-5)
 • 20260719110000_order_reviews.sql                 ← REQUIRED (CP-6)
```

`ensure_customer_profile_for_auth_user` is already on remote (migration `20260716010000` applied).

---

## Migration inventory

| # | File | CP | Objects | Type | Prod applied |
|---|------|----|---------|------|--------------|
| 1 | `supabase/migrations/20260719090000_customer_addresses.sql` | CP-1 | `customer_addresses` + indexes + trigger + 4 RLS policies | DDL (additive) | ❌ pending |
| 2 | `supabase/migrations/20260719100000_customer_favorites.sql` | CP-5 | `customer_favorites` + index + 3 RLS policies | DDL (additive) | ❌ pending |
| 3 | `supabase/migrations/20260719110000_order_reviews.sql` | CP-6 | `order_reviews` + index + trigger + 3 RLS policies | DDL (additive) | ❌ pending |

**Out of Phase 1 customer scope:**

| File | Notes |
|------|-------|
| `20260718180000_sync_canonical_menu_catalog.sql` | **Content-only** menu upsert/deactivate. Separate owner decision. |

**CP-7 notification preferences:** No migration. Prefs live in browser `localStorage` via `apps/website/client/src/lib/customer-notification-prefs.ts`.

---

## Contract reconciliation (2026-07-22)

| Surface | API service | DDL match |
|---------|-------------|-----------|
| Addresses | `backend/api/src/services/addresses/customer-addresses.ts` | Columns + grants + RLS match `20260719090000` |
| Favorites | `backend/api/src/services/favorites/customer-favorites.ts` | Columns + grants + RLS match `20260719100000` |
| Reviews | `backend/api/src/services/reviews/customer-reviews.ts` | Columns + grants + RLS match `20260719110000` |
| Profile bootstrap | `backend/api/src/services/auth/supabase.ts` | RPC already on prod |

**New forward migration:** none required.

Static coverage extended in `tests/database/cp1-cp6-customer-migrations.test.mjs` (API column ↔ DDL assertions; freeze ordering; no loyalty/notifications invent).

---

## Dependency order

```
… (V1 freeze schema head)
20260718171000_db_hash_column_privilege_harden.sql   ← prod linked head (confirmed 2026-07-22)
20260718180000_sync_canonical_menu_catalog.sql       ← optional; EXCLUDE from CP apply by default
20260719090000_customer_addresses.sql                ← CP-1
20260719100000_customer_favorites.sql                ← CP-5
20260719110000_order_reviews.sql                     ← CP-6
```

### Hard dependencies (must exist before apply)

| Migration | Requires |
|-----------|----------|
| `20260719090000` | `auth.users`; `public.branches`; `public.set_updated_at()` |
| `20260719100000` | `auth.users` |
| `20260719110000` | `auth.users`; `public.orders.auth_user_id` + `status` including `'completed'` |

---

## Local verification (2026-07-22)

`supabase start` on a **fresh** local project currently fails at `20260718130000` because it `REVOKE`s `public.handle_new_user()` which never existed in git (prod-drift only). That does **not** block production apply (P0 already applied on linked remote).

Local CP verification used disposable Postgres + `scripts/local-verify-cp-migrations.mjs` (applies git migrations with local-only workarounds for the P0 revoke / empty `profiles` stub). Result:

```text
customer_addresses / customer_favorites / order_reviews → present
relrowsecurity = true for all three
service_role + authenticated SELECT on customer_addresses = true
ensure_customer_profile_for_auth_user(uuid,text,text) present
ALL_OK
```

Package validation on branch:

- `pnpm test:db` — pass (290 tests)
- `pnpm test:backend -- --pool=threads --no-file-parallelism` — pass
- `pnpm check` — pass

---

## Apply plan (linked remote — **owner-gated only**)

Per `docs/database/DATABASE-MIGRATION-WORKFLOW.md`. **Do not run from this PR alone.**

### Pre-apply gates

1. Owner unfreeze / change-control ticket for customer-platform schema (V1 freeze).
2. Backup / PITR verified; on-call identified.
3. Explicit written decision: **exclude** `20260718180000` catalog sync from this release (default).
4. Branch/PR tip SHA recorded.
5. Re-run dry-run immediately before apply and confirm pending set.

### Read-only verification (safe)

```sh
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

### Preferred apply path when catalog must stay out

If dry-run still lists `20260718180000` and owner has **not** approved catalog content:

1. **Do not** run bare `db push --linked` (it would apply catalog + CP together).
2. Apply only the three CP SQL files via approved linked SQL editor / `psql` with service credentials, then mark versions in `supabase_migrations.schema_migrations` using Supabase’s supported repair workflow — **or** temporarily move/hold the catalog file only with owner change-control (prefer repair after selective apply; never delete the migration from git).
3. Capture transcripts for every command.

If owner later approves catalog content, run a **second** change ticket for `20260718180000` alone.

### Apply when dry-run shows **only** the three `20260719*` files

```sh
# AFTER explicit owner approval
npx supabase db push --linked
```

### Post-apply proof (required before claiming fixed)

```sh
npx supabase migration list --linked
# expect remote = local for 20260719090000, 20260719100000, 20260719110000
```

```sql
select to_regclass('public.customer_addresses');
select to_regclass('public.customer_favorites');
select to_regclass('public.order_reviews');
select relname, relrowsecurity from pg_class
 where relname in ('customer_addresses','customer_favorites','order_reviews');
```

API / PostgREST smoke:

- `HEAD /rest/v1/customer_addresses` is **not** 404 (401 without JWT is OK)
- Authenticated `GET /api/v1/me/addresses` → `200` with `{ addresses: [] }` or rows (not schema-cache / relation errors)
- Authenticated favorites + reviews list endpoints same expectation

**No success claim without command transcripts.**

---

## Grants / RLS matrix

| Table | RLS | anon | authenticated | service_role | Policies |
|-------|-----|------|---------------|--------------|----------|
| `customer_addresses` | ON | none | SELECT, INSERT, UPDATE, DELETE | ALL | own-row `user_id = auth.uid()` |
| `customer_favorites` | ON | none | SELECT, INSERT, DELETE | ALL | own-row `user_id = auth.uid()` |
| `order_reviews` | ON | none | SELECT, INSERT, UPDATE | ALL | own-row; insert/update require owned `completed` order |

Backend `/me/*` uses **service_role**.

---

## Risk notes

| ID | Severity | Risk | Mitigation |
|----|----------|------|------------|
| R-01 | **High** | V1 freeze locks prod schema | Owner unfreeze before apply |
| R-02 | **High** | Addresses 404 until CP-1 applied | Apply `20260719090000`+ |
| R-03 | **Medium** | Dry-run includes catalog content | Exclude `20260718180000` by default |
| R-04 | **Low** | Fresh local `supabase start` fails on P0 `handle_new_user` revoke | Documented; prod already past P0; use `scripts/local-verify-cp-migrations.mjs` for local DDL proof |
| R-05 | **Info** | CP-7 / loyalty not in SQL | By design |

---

## Related documents

- `docs/database/DATABASE-MIGRATION-WORKFLOW.md`
- `docs/database/DATABASE-V1-FREEZE-DECLARATION.md`
- `docs/team/CP-0-OWNER-DECISION-PACK.md`
- `scripts/local-verify-cp-migrations.mjs`

---

## Attestation

- **Existing CP migrations modified:** None.
- **New harden migration:** None (contracts already match).
- **Production `db push`:** Not executed.
- **Merge to main:** Not performed by this workstream (PR only).
