# PROC-01 — Phase 1 Customer Migrations Inventory & Apply Plan

**Agent:** Migration governance / prod reconcile
**Working branch:** `fix/prod-db-customer-phase1-reconcile`
**Base:** `main` @ `25e32ac` (and successors)
**Date:** 2026-07-22 (production apply completed)
**Status:** **APPLIED — OWNER-APPROVED ORDERED CHAIN**
**Apply status:** **Applied to linked production** 2026-07-22 via Windows `npx supabase db push --linked` (no WSL).
**Linked project:** `Telepizza` / ref `pyeowxvacgypohrbvgee` (CLI linked)
**Branch tip at apply:** `d233440` on `fix/prod-db-customer-phase1-reconcile` (from `main` @ `25e32ac`)

---

## Executive summary

Three forward-only DDL migrations already in git add Phase 1 customer cloud tables (`customer_addresses`, `customer_favorites`, `order_reviews`). They match live API contracts (`/api/v1/me/addresses|favorites|reviews`). **Path A: no new harden migration.**

**Production linked remote head is now `20260719110000`.** Owner approved the normal ordered chain after a final static catalog audit (no `DELETE`/`TRUNCATE`/`DROP`/`ALTER TABLE`). Applied together:

1. `20260718180000_sync_canonical_menu_catalog.sql`
2. `20260719090000_customer_addresses.sql`
3. `20260719100000_customer_favorites.sql`
4. `20260719110000_order_reviews.sql`

Notification preferences (CP-7) remain **device-local only**. Loyalty/rewards have **no** SQL migrations — intentional.

**PR #97 remains open — not merged by this workstream.**

---

## Catalog static audit (pre-apply gate)

File: `supabase/migrations/20260718180000_sync_canonical_menu_catalog.sql`

| Check | Result |
|-------|--------|
| `DELETE FROM` / `TRUNCATE` / `DROP` / `ALTER TABLE` / `CREATE TABLE` / `CASCADE` | **ABSENT** |
| Mutations | Upsert categories/items/variants by slug; soft-deactivate broast + `behari-kabab-pizza`; align linked `modifier_options.price_delta` |
| Transaction | `BEGIN` / `COMMIT` |
| Local dry-run script | `node scripts/dry-run-canonical-menu-migration.mjs` → **PASS** |
| Verdict | **PASS** for ordered apply (content upserts are intentional; owner-approved) |

Post-apply catalog freeze counts on linked remote: **13 / 58 / 3 / 40**, available broast **0**.

---

## Linked apply evidence (2026-07-22)

CLI: supabase `2.109.1` via Windows PowerShell / `npx` (WSL not used). Project: Telepizza (`pyeowxvacgypohrbvgee`).

**Pre-apply dry-run pending set:**

```text
 • 20260718180000_sync_canonical_menu_catalog.sql
 • 20260719090000_customer_addresses.sql
 • 20260719100000_customer_favorites.sql
 • 20260719110000_order_reviews.sql
```

**Push:** `npx supabase db push --linked` — all four applied (idempotent `DROP … IF EXISTS` notices only).

**Post-apply `migration list --linked`:** local = remote through `20260719110000`.

| Version | Name | Classification | Action |
|---------|------|----------------|--------|
| `20260718180000` | sync_canonical_menu_catalog | CONTENT DATA (owner-approved) | **Applied** |
| `20260719090000` | customer_addresses | REQUIRED CUSTOMER DDL | **Applied** |
| `20260719100000` | customer_favorites | REQUIRED CUSTOMER DDL | **Applied** |
| `20260719110000` | order_reviews | REQUIRED CUSTOMER DDL | **Applied** |

---

## Migration inventory

| # | File | CP | Objects | Type | Prod applied |
|---|------|----|---------|------|--------------|
| 1 | `supabase/migrations/20260719090000_customer_addresses.sql` | CP-1 | `customer_addresses` + indexes + trigger + 4 RLS policies | DDL (additive) | ✅ applied 2026-07-22 |
| 2 | `supabase/migrations/20260719100000_customer_favorites.sql` | CP-5 | `customer_favorites` + index + 3 RLS policies | DDL (additive) | ✅ applied 2026-07-22 |
| 3 | `supabase/migrations/20260719110000_order_reviews.sql` | CP-6 | `order_reviews` + index + trigger + 3 RLS policies | DDL (additive) | ✅ applied 2026-07-22 |

**Applied with CP chain (owner-approved catalog):**

| File | Notes |
|------|-------|
| `20260718180000_sync_canonical_menu_catalog.sql` | **Content-only** menu upsert/deactivate. Static audit PASS; applied in ordered push. |

**CP-7 notification preferences:** No migration. Prefs live in browser `localStorage` via `apps/website/client/src/lib/customer-notification-prefs.ts`.

---

## Contract matrix (Path A — no new migration)

### `customer_addresses` (CP-1 / `20260719090000`)

| Field | Value |
|-------|-------|
| API reads | `GET /me/addresses` via service_role `listAddresses` |
| API writes | POST/PATCH/DELETE + import via service_role |
| Required columns | `id`, `user_id` (→ `auth.users`), `label`, `recipient_name`, `phone`, `line1`, `line2`, `landmark`, `area`, `city`, `delivery_zone`, `preferred_branch_id`, `is_default`, `status`, `created_at`, `updated_at` |
| Not in DB (by design) | Website `notes` / delivery notes — device-local only |
| Constraints | PK `id`; FK `user_id`; FK `preferred_branch_id`→`branches`; label/status checks; line1 nonempty |
| Indexes | one default active per user (partial unique); `user_id,status,created_at`; preferred branch |
| RLS | ON; select/insert/update/delete own (`user_id = auth.uid()`) |
| Grants | authenticated SELECT/INSERT/UPDATE/DELETE; service_role ALL; anon revoked |
| Migration | `20260719090000_customer_addresses.sql` |

### `customer_favorites` (CP-5 / `20260719100000`)

| Field | Value |
|-------|-------|
| API reads | `GET /me/favorites` |
| API writes | PUT/DELETE `/me/favorites/:itemCode` |
| Required columns | `id`, `user_id`, `menu_item_code`, `created_at` |
| Constraints | unique `(user_id, menu_item_code)`; code nonempty; **no FK** to `menu_items` (stable text code) |
| Indexes | `(user_id, created_at desc)` |
| RLS | ON; select/insert/delete own |
| Grants | authenticated SELECT/INSERT/DELETE; service_role ALL; anon revoked |
| Migration | `20260719100000_customer_favorites.sql` |

### `order_reviews` (CP-6 / `20260719110000`)

| Field | Value |
|-------|-------|
| API reads | `GET /me/reviews` |
| API writes | POST/PATCH `/me/orders/:orderNumber/review` |
| Required columns | `id`, `order_id`, `auth_user_id`, `rating`, `comment`, `status`, `created_at`, `updated_at` |
| Constraints | unique `order_id`; rating 1–5; status visible/hidden/flagged |
| Indexes | `(auth_user_id, created_at desc)` |
| RLS | ON; select own; insert/update require owned `orders.status = 'completed'` |
| Grants | authenticated SELECT/INSERT/UPDATE; service_role ALL; anon revoked |
| Migration | `20260719110000_order_reviews.sql` |

### `ensure_customer_profile_for_auth_user`

| Field | Value |
|-------|-------|
| API reads/writes | Called from `backend/api/src/services/auth/supabase.ts` bootstrap on missing profile |
| Defining migration | `20260716010000_sprint3_customer_auth_foundation.sql` (**before** freeze head; already on remote) |
| Execute grants | P0 harden grants execute to `service_role` |
| Action | **Do not duplicate** |

**Schema-contract gaps:** none. **New forward migration:** none.

Static coverage: `tests/database/cp1-cp6-customer-migrations.test.mjs`.

---

## Dependency order

```
… (V1 freeze schema head)
20260718171000_db_hash_column_privilege_harden.sql   ← previous prod head
20260718180000_sync_canonical_menu_catalog.sql       ← applied (owner-approved)
20260719090000_customer_addresses.sql                ← CP-1 applied
20260719100000_customer_favorites.sql                ← CP-5 applied
20260719110000_order_reviews.sql                     ← CP-6 applied ← current prod head
```

### Hard dependencies (must exist before apply)

| Migration | Requires |
|-----------|----------|
| `20260719090000` | `auth.users`; `public.branches`; `public.set_updated_at()` |
| `20260719100000` | `auth.users` |
| `20260719110000` | `auth.users`; `public.orders.auth_user_id` + `status` including `'completed'` |

---

## Local verification (2026-07-22 re-verify)

`supabase start` on a **fresh** local project currently fails at `20260718130000` because it `REVOKE`s `public.handle_new_user()` which never existed in git (prod-drift only). That does **not** block production apply (P0 already applied on linked remote).

Local CP verification used disposable Postgres + `scripts/local-verify-cp-migrations.mjs`. Result: **ALL_OK**

| Proof | Result |
|-------|--------|
| `to_regclass` addresses/favorites/reviews | present |
| `relrowsecurity` | true for all three |
| Policies | 10 own-row policies (4+3+3) |
| Indexes | one-default, user_active, favorites unique, reviews auth_user, etc. |
| Grants | authenticated DML as designed; service_role full; anon absent |
| Bootstrap RPC | `ensure_customer_profile_for_auth_user(uuid,text,text)` present |

Package validation (re-verify):

- `pnpm check` — pass
- `pnpm test:db` — **292** pass / 0 fail
- `pnpm test:backend -- --pool=threads --no-file-parallelism` — **29** files / **222** tests pass
- `pnpm test` — pass (db + backend)
- `pnpm build:website` — pass
- `git diff --check` — pass

Local authenticated `/me/*` smoke: **not run** (no local Supabase API + test user session in this pass; do not invent tokens).

**Production database apply has not been executed.**

---

## Apply plan (linked remote) — **EXECUTED 2026-07-22**

Per `docs/database/DATABASE-MIGRATION-WORKFLOW.md`. Owner approved ordered chain including catalog after static audit PASS.

### What ran

```sh
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

Host: Windows PowerShell + `npx supabase` `2.109.1` (WSL/Docker **not** used).

### Post-apply proof (captured)

```sh
npx supabase migration list --linked
# local = remote through 20260719110000
```

```sql
-- to_regclass → customer_addresses, customer_favorites, order_reviews (all present)
-- relrowsecurity = true for all three
-- pg_policies: 10 own-row policies (4+3+3)
```

Catalog freeze: `13 / 58 / 3 / 40`, available broast `0`.

PostgREST (anon): tables exist in schema; `anon` has no grants → **401/42501** (not 404).  
PostgREST (service_role): **200** `content-range=*/0` on all three.

Production API `https://telepizza-api.onrender.com`:

| Probe | Result |
|-------|--------|
| Unauth `GET /api/v1/me/addresses\|favorites\|reviews` | **401** `UNAUTHORIZED` (not schema-missing) |
| Auth `GET /me/addresses` | **200** `{ ok:true, data:{ addresses:[] } }` |
| Auth `GET /me/favorites` | **200** `{ ok:true, data:{ favorites:[] } }` |
| Auth `GET /me/reviews` | **200** `{ ok:true, data:{ reviews:[] } }` |

Auth smoke used a throwaway GoTrue user (admin-created); hard delete blocked by existing `auth_user_id cannot be changed` guard — user **banned** instead.

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
| R-03 | **Medium** | Catalog content mutates menu on ordered push | Static audit PASS; owner approved inclusion 2026-07-22 |
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
- **Production `db push`:** Executed 2026-07-22 (ordered chain of four; owner-approved).
- **Remote head after apply:** `20260719110000`.
- **Merge to main:** Not performed by this workstream (PR #97 remains open).
