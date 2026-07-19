# PROC-01 — Phase 1 Customer Migrations Inventory & Apply Plan

**Agent:** C (Migration Governance)  
**Branch audited:** `origin/polish/my-telepizza-ux`  
**Governance branch:** `fix/phase-1-migration-governance`  
**Date:** 2026-07-19  
**Status:** **PROC-01 READY FOR REVIEW**  
**Apply status:** **Not applied to production by this agent.** Owner-gated apply only.

---

## Executive summary

Three forward-only DDL migrations on `polish/my-telepizza-ux` add Phase 1 customer cloud tables (`customer_addresses`, `customer_favorites`, `order_reviews`). They are timestamp-ordered, git-tracked (commit `af33722`), free of secrets, and contain no row-level data rewrites. Notification preferences (CP-7) remain **device-local only** — no SQL migration exists or is required for Phase 1 scope.

Production linked remote remains at Database V1 freeze head **`20260718171000`** per `docs/database/DATABASE-V1-FREEZE-DECLARATION.md`. All three Phase 1 migrations are **ahead of prod** and require explicit owner unfreeze / change-control before linked apply.

---

## Migration inventory

| # | File | CP | Objects | Type | Git | Prod applied |
|---|------|----|---------|------|-----|--------------|
| 1 | `supabase/migrations/20260719090000_customer_addresses.sql` | CP-1 | `customer_addresses` + indexes + trigger + 4 RLS policies | DDL (additive) | ✅ `af33722` on polish | ❌ Not by this agent |
| 2 | `supabase/migrations/20260719100000_customer_favorites.sql` | CP-5 | `customer_favorites` + index + 3 RLS policies | DDL (additive) | ✅ `af33722` on polish | ❌ Not by this agent |
| 3 | `supabase/migrations/20260719110000_order_reviews.sql` | CP-6 | `order_reviews` + index + trigger + 3 RLS policies | DDL (additive) | ✅ `af33722` on polish | ❌ Not by this agent |

**Out of Phase 1 scope (same branch, do not conflate):**

| File | Notes |
|------|-------|
| `20260718180000_sync_canonical_menu_catalog.sql` | **Content-only** menu upsert/deactivate. Not a Phase 1 customer migration. Has its own owner-approval banner. Applies catalog row changes — not silent schema, but **does mutate menu data**. Separate apply decision from CP-1/5/6. |

**CP-7 notification preferences:** No migration. Prefs live in browser `localStorage` via `apps/website/client/src/lib/customer-notification-prefs.ts` (`telepizza.customer.notification-prefs.*`). Future cloud prefs would need a new migration + CP-0 email readiness.

---

## Dependency order

Apply strictly in filename (timestamp) order after all prior migrations through the chosen baseline.

```
… (V1 freeze schema head)
20260718171000_db_hash_column_privilege_harden.sql   ← prod linked head (2026-07-18 attestation)
20260718180000_sync_canonical_menu_catalog.sql       ← optional content; not required for CP-1/5/6 DDL
20260719090000_customer_addresses.sql                ← CP-1
20260719100000_customer_favorites.sql                ← CP-5
20260719110000_order_reviews.sql                     ← CP-6
```

### Hard dependencies (must exist before apply)

| Migration | Requires |
|-----------|----------|
| `20260719090000` | `auth.users`; `public.branches`; `public.set_updated_at()` from `20260713190000_foundation_schema.sql` |
| `20260719100000` | `auth.users` |
| `20260719110000` | `auth.users`; `public.orders` with `auth_user_id` + `status` check including `'completed'` from `20260716140000_sprint3_slice2d_order_branch_rls.sql` |

### Soft / app-layer dependencies

| Concern | Where enforced |
|---------|----------------|
| Max 20 active addresses | API (`MAX_ACTIVE_CUSTOMER_ADDRESSES` in `customer-addresses.ts`), not DB constraint |
| Soft-archive (`status = 'archived'`) | API + column check; no hard-delete requirement |
| Review 24h edit window | API (`EDIT_WINDOW_MS`); RLS allows update while order stays `completed` |
| Favorites keyed by `menu_item_code` | Text code, not FK to `menu_items` — catalog drift is an app concern |

---

## Apply plan (linked remote — **do not run from audit**)

Per `docs/database/DATABASE-MIGRATION-WORKFLOW.md`. **This agent did not execute these commands.**

### Pre-apply gates

1. Owner unfreeze / change-control ticket for customer-platform schema (V1 freeze currently locks prod schema expansion).
2. CP-0 D1 addresses policy signed (`docs/team/CP-0-OWNER-DECISION-PACK.md`).
3. Backup / PITR verified; on-call identified.
4. Local branch matches reviewed commit (`af33722` or successor on merge target).

### Read-only verification (safe)

```sh
# From repo root — compare local vs linked history (no writes)
npx supabase migration list --linked

# Preview pending migrations (no writes)
npx supabase db push --linked --dry-run
```

Expected dry-run includes (at minimum) the three `20260719*` files if prod is still at `20260718171000`. If `20260718180000` is also pending, treat catalog content apply as a **separate owner decision**.

### Apply (owner-approved release step only)

```sh
# AFTER explicit owner approval — NOT part of PROC-01 audit
npx supabase db push --linked
```

### Post-apply verification

```sh
pnpm test:db    # static migration matrix incl. tests/database/cp1-cp6-customer-migrations.test.mjs
pnpm test:backend
```

SQL smoke (read-only):

```sql
select to_regclass('public.customer_addresses');
select to_regclass('public.customer_favorites');
select to_regclass('public.order_reviews');

select relname, relrowsecurity from pg_class
 where relname in ('customer_addresses','customer_favorites','order_reviews');
```

API smoke (staging / linked): `GET/PATCH /api/v1/me/addresses`, favorites, reviews routes behind auth — see `backend/api/src/modules/me/routes.ts`.

---

## Grants / RLS matrix

| Table | RLS | anon | authenticated | service_role | Policies |
|-------|-----|------|---------------|--------------|----------|
| `customer_addresses` | ON | none (revoked) | SELECT, INSERT, UPDATE, DELETE | ALL | select/insert/update/delete own (`user_id = auth.uid()`) |
| `customer_favorites` | ON | none (revoked) | SELECT, INSERT, DELETE (no UPDATE grant) | ALL | select/insert/delete own (`user_id = auth.uid()`) |
| `order_reviews` | ON | none (revoked) | SELECT, INSERT, UPDATE (no DELETE grant) | ALL | select/insert/update own; insert/update require linked `orders` row with `auth_user_id = auth.uid()` and `status = 'completed'` |

**Pattern:** Each migration follows post-`20260718130000` hardening style — explicit `REVOKE ALL` from client roles, least-privilege `GRANT` to `authenticated`, full access to `service_role`. Backend `/me/*` services use **service_role** (`customer-addresses.ts`, `customer-favorites.ts`, `customer-reviews.ts`).

**P0 interaction:** `20260718130000_p0_harden_grants_and_definer_execute.sql` runs before these tables exist. New tables carry their own grant statements; no follow-up grant migration required for Phase 1 DDL.

---

## Governance verification checklist

| Check | Result | Evidence |
|-------|--------|----------|
| Tracked in git on polish | ✅ PASS | `git log origin/polish/my-telepizza-ux -- supabase/migrations/20260719*` → `af33722` |
| Timestamp-ordered, no duplicate prefixes | ✅ PASS | Unique `20260719090000`, `100000`, `110000`; full folder scan shows no collisions |
| No conflicting migrations (same table) | ✅ PASS | Single migration per table |
| Forward-only / no prod data rewrite in CP-1/5/6 | ✅ PASS | `CREATE TABLE IF NOT EXISTS` + policies only; no `UPDATE`/`DELETE`/`TRUNCATE` on existing data |
| No secrets in SQL | ✅ PASS | No passwords, JWTs, API keys, or connection strings |
| Static test coverage | ✅ PASS | `tests/database/cp1-cp6-customer-migrations.test.mjs` |
| Prod apply honesty | ✅ PASS | Not applied by Agent C; prod head documented as `20260718171000` |

---

## Risk notes

| ID | Severity | Risk | Mitigation |
|----|----------|------|------------|
| R-01 | **High** | V1 freeze locks prod schema; Phase 1 tables are post-freeze | Owner unfreeze + ticket before `db push --linked` |
| R-02 | **High** | Features 503 until migrations applied in target env | Apply plan + post-apply API smoke; hub shows honest degraded state until then |
| R-03 | **Medium** | `20260718180000` catalog content may appear in same dry-run | Split owner decision: schema (CP-1/5/6) vs catalog content |
| R-04 | **Low** | `order_reviews` RLS update policy does not column-restrict `status`; direct PostgREST client could mutate moderation field | API uses service_role; moderation should stay server-side. Optional hardening: column-level trigger or narrow policy (Agent B if desired) |
| R-05 | **Low** | Max-20-active addresses enforced in API only | Accept for Phase 1; document for future DB constraint if abuse seen |
| R-06 | **Info** | CP-7 prefs are localStorage — no cross-device sync | By design until SMTP + cloud prefs migration |
| R-07 | **Info** | `customer_addresses` duplicate `revoke … from anon` line | Cosmetic only; no apply blocker |

---

## Findings table (PROC-01)

| ID | Area | Finding | Severity | Action |
|----|------|---------|----------|--------|
| F-01 | Inventory | Three Phase 1 DDL migrations present and ordered on polish | — | Document only ✅ |
| F-02 | CP-7 | No `notification_preferences` table; localStorage SoT | Info | Document only ✅ |
| F-03 | Prod state | Linked prod at `20260718171000`; Phase 1 unapplied | High | Owner-gated apply plan (above) |
| F-04 | Freeze policy | Customer tables expand schema post-V1-lock | High | Unfreeze ticket required before prod |
| F-05 | Reviews RLS | No DELETE policy; `status` not column-guarded on UPDATE | Low | Document for Agent B; optional hardening |
| F-06 | Addresses | Redundant anon revoke in SQL | Info | No change required (doc preferred) |
| F-07 | Catalog | `20260718180000` is separate content migration | Medium | Do not bundle with CP-1 apply without review |
| F-08 | Secrets | None found in migration files | — | ✅ |
| F-09 | Data safety | No silent prod row rewrite in CP-1/5/6 | — | ✅ |

---

## Related documents

- `docs/architecture/PHASE-1-CUSTOMER-PLATFORM-COMPLETION-AUDIT.md`
- `docs/architecture/PHASE-1-CUSTOMER-PLATFORM-COMPLETION-PROGRAM.md`
- `docs/architecture/MY-TELEPIZZA-ADDRESSES-MIGRATION-PROPOSAL.md`
- `docs/team/CP-0-OWNER-DECISION-PACK.md`
- `docs/database/DATABASE-MIGRATION-WORKFLOW.md`
- `docs/database/DATABASE-V1-FREEZE-DECLARATION.md`
- `docs/team/database/SCHEMA-GOVERNANCE.md`

---

## Agent C attestation

- **Migrations modified:** None (documentation only).
- **`20260719110000_order_reviews.sql`:** Not edited (Agent B owns).
- **Production `db push`:** Not executed.
- **Merge:** Not performed.

**PROC-01 READY FOR REVIEW**
