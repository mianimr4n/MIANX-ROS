# Sprint 3 · Slice 2D — Order/Branch RLS — Production Close Report

**Scope:** Slice 2D order/branch Row Level Security only. No customer identity-linking,
no OTP, no Sprint 4.5, no Kitchen/Rider/POS/Admin features, no catalog/pricing changes.

**PR:** https://github.com/mianimr4n/telepizza/pull/49
**Branch:** `feature/sprint-3-slice-2d-order-rls`
**Migration:** `supabase/migrations/20260716140000_sprint3_slice2d_order_branch_rls.sql`

---

## 0. Status summary

| Phase | Result |
|---|---|
| Phase 1 — Final security review | ✅ PASS |
| Phase 2 — Validation (check/tests/build/diff) | ✅ PASS |
| Phase 5 — Live RLS runtime smoke (LOCAL Supabase) | ✅ PASS (30/30 persona checks, 14/14 API checks) |
| Phase 6 — Cleanup (local test data) | ✅ DONE (baseline restored) |
| **Phase 3 — Mark ready + merge PR #49** | ⛔ **BLOCKED — requires owner action** (agent GitHub access is read-only; no merge/ready capability) |
| **Phase 4 — Production migration → `pyeowxvacgypohrbvgee`** | ⛔ **BLOCKED — requires owner action** (no `SUPABASE_ACCESS_TOKEN` / DB password in agent env; project not linked) |
| **Phase 5 — Production live RLS smoke** | ⛔ **BLOCKED** — depends on Phase 4 |

The security implementation is verified **at runtime** against a fully-migrated local
Supabase (all 14 migrations incl. Slice 2D). The only outstanding items are the
production-privileged actions (merge + `db push` + prod smoke), which are intentionally
gated to the owner — consistent with the PR directive *"Do not merge/apply production
migration until owner review."*

---

## 1. PR and merge SHA

- PR #49 — state: **OPEN (draft)**, base `main`, head `feature/sprint-3-slice-2d-order-rls`.
- Feature branch HEAD reviewed/validated: `4901083` (pre-report). This report adds one docs commit.
- `origin/main` at review time: `e956444`.
- **Merge SHA: N/A — not merged** (blocked; see §11 runbook).

## 2. Migration history (before / after)

**Local (agent) — applied cleanly via `supabase db reset`, 14 migrations, Slice 2D last:**

```
20260713190000_foundation_schema
20260713191000_seed_foundation_data
20260714100000_sync_verified_menu_catalog
20260714120000_grant_public_access
20260715120000_pizza_toppings_catalog
20260715153000_option_b_toppings_catalog_repair
20260716010000_sprint3_customer_auth_foundation
20260716020000_sprint3_authorization_foundation
20260716100000_sprint3_slice2b_staff_permissions
20260716101000_sprint3_slice2b_staff_invites
20260716102000_sprint3_slice2b_accept_helper
20260716103000_sprint3_slice2b_locked_decisions
20260716120000_sprint4_1_orders_quote_snapshots
20260716140000_sprint3_slice2d_order_branch_rls   <-- Slice 2D
```

**Production (`pyeowxvacgypohrbvgee`):** migration history **NOT captured** and dry-run
**NOT executed** — the agent environment has no Supabase access token / DB password and
the project is not linked (`supabase/.temp/project-ref` absent). Owner must run the
pre-check + dry-run in §11.

## 3. Backup / pre-check evidence

- **Local pre-state:** `orders = 0`, `order_items/order_status_logs/deliveries/payments = 0`
  before smoke; restored to the same baseline after cleanup (§8).
- **Production pre-check:** ⛔ pending owner (counts of orders/items/status logs/deliveries/
  payments, RLS flags, existing policies, and pre-existing production orders must be captured
  before `db push` per §11).

## 4. Helper functions (DB-verified on local)

All six helpers are `SECURITY DEFINER` with `search_path=public`, contain no dynamic SQL,
read **only** `auth.uid()` + `public.*` tables (never JWT `user_metadata`/`app_metadata`,
never request headers), require `status='active'`, and are null-safe. `EXECUTE` is revoked
from `public` and granted only to `authenticated, service_role`.

| Function | security_definer | search_path | Purpose |
|---|---|---|---|
| `current_app_user_id()` | t | public | Map `auth.uid()` → `public.users.id` |
| `current_user_is_active()` | t | public | Active-status gate |
| `current_user_is_super_admin()` | t | public | DB-role-derived super-admin (role code + `user_type<>'customer'` + active) |
| `current_user_branch_ids()` | t | public | Branch ids from `user_roles.branch_id` only |
| `current_user_has_branch_access(uuid)` | t | public | Active + (super-admin OR assigned branch) |
| `current_customer_owns_order(uuid)` | t | public | Ownership via verified `auth_user_id` OR active customer relation |

No recursion/policy loops: the ownership helper is `SECURITY DEFINER` (bypasses `orders`
RLS), and it is used only in `order_items`/`order_status_logs`/`deliveries` policies — not
in the `orders` policy.

## 5. Policy matrix (DB-verified on local)

RLS enabled on all five operational tables. Eight policies, all `SELECT`, all `to authenticated`.
`payments` has **no** authenticated/anon policy and **no** SELECT grant.

| Table | Policy | Cmd | Roles |
|---|---|---|---|
| orders | Customers select own orders | SELECT | authenticated |
| orders | Staff select branch orders | SELECT | authenticated |
| order_items | Customers select own order items | SELECT | authenticated |
| order_items | Staff select branch order items | SELECT | authenticated |
| order_status_logs | Customers select own order status logs | SELECT | authenticated |
| order_status_logs | Staff select branch order status logs | SELECT | authenticated |
| deliveries | Customers select own deliveries | SELECT | authenticated |
| deliveries | Staff select branch deliveries | SELECT | authenticated |
| payments | *(none — service-role only)* | — | — |

**Privileges (DB-verified):** `authenticated` = `SELECT` only on the four order tables
(INSERT/UPDATE/DELETE revoked; runtime PATCH blocked). `anon` = no privileges on any of the
five tables. `payments` = zero `authenticated`/`anon` privileges.

## 6. Persona smoke results (LOCAL, real user access tokens via PostgREST — not service role)

Personas created via GoTrue admin + password-grant tokens; orders/items/status-logs/
deliveries/payments seeded for Royal Orchard (RO) and Northern Bypass (NB).

| Persona | Expectation | Result |
|---|---|---|
| Customer A | SELECT own order + own items/status/delivery = visible | ✅ |
| Customer A | SELECT customer B order / items / delivery = 0 | ✅ |
| Customer A | SELECT `payments` = permission denied | ✅ |
| Customer A | UPDATE own order status / totals = blocked | ✅ |
| Customer B | Mirror isolation (own visible, A hidden) | ✅ |
| RO staff | RO order/items visible; NB = 0 | ✅ |
| RO staff | spoofed `x-telepizza-role`/`x-telepizza-branch-id` → NB still 0 | ✅ |
| NB staff | NB visible; RO = 0 | ✅ |
| Super-admin (active) | both RO + NB visible | ✅ |
| Suspended customer | own order = 0 | ✅ |
| Suspended staff | assigned-branch order = 0 | ✅ |
| Rider (no branch role) | orders + deliveries = 0 | ✅ |
| Anon | orders/items/status_logs/deliveries/payments = 0 / denied | ✅ |

**Totals: 30/30 PASS.**

## 7. API regression (LOCAL backend `:4000` + local Supabase)

| Check | Result |
|---|---|
| `/healthz` 200 · `/readyz` 200 | ✅ |
| `/api/v1/auth/me` (Bearer) returns profile | ✅ |
| Guest quote 200 | ✅ |
| Guest create 201; order `auth_user_id` = NULL | ✅ |
| Guest track (`?phone=`) 200 | ✅ |
| Authenticated create 201; `auth_user_id` = verified Bearer uid | ✅ |
| Idempotency replay (same key+body) → 200, same order, `idempotentReplay` | ✅ |
| Idempotency conflict (same key, different body) → 409 | ✅ |
| Catalog freeze `13 / 58 / 3 / 40 / 7` (categories/items/toppings/variants/deals) | ✅ |
| Branches = 2 (royal-orchard, northern-bypass) | ✅ |
| Google/email auth flows | untouched (no diff in this PR) |
| Staff invites | ✅ covered by `test:backend` (80 passed) |

**Totals: 14/14 PASS** (plus catalog/branch freeze confirmed).

Automated suite: `pnpm check` PASS · `pnpm test:db` **75 PASS** · `pnpm test:backend`
**80 PASS** · `pnpm build:website` PASS · `git diff --check` CLEAN ·
`pnpm install --frozen-lockfile` PASS.

## 8. Cleanup evidence (LOCAL)

All temporary auth users, `public.users`, `customers`, `user_roles`, `orders`,
`order_items`, `order_status_logs`, `deliveries`, `payments`, and idempotency rows removed.
Post-cleanup verification: `orders=0`, test users `=0`, `order_items/order_status_logs/
deliveries/payments = 0`. Local DB returned to pre-smoke baseline.

**Production cleanup:** N/A — no production smoke was run (Phase 4/5 blocked). No production
rows were created or touched by the agent.

## 9. Scope hygiene

PR #49 contains exactly: the Slice 2D migration, backend compatibility changes
(`createOptionalAuth` + optional `auth_user_id` on create), tests
(`orders-slice2d-auth.test.ts`, `sprint3-slice2d-order-rls.test.mjs`), and docs. 11 files,
+916/−41. **No** `.env`/secrets, **no** `package-lock.json`, **no** generated bundles, **no**
auth UI/profile changes, **no** catalog changes, **no** deploy config churn. `auth_user_id`
is never taken from body/headers (schema has no such field; zod strips unknowns; handler sets
it only from the verified Bearer identity).

## 10. Known limitations

1. **`order_status_logs.note` is row-visible to the owning customer.** Confirmed at runtime
   (customer A could read an `INTERNAL-STAFF-NOTE` value on their own order's status log). The
   migration explicitly defers customer-vs-staff column visibility for Slice 2D; there is no
   staff note-writing path in this slice, so no internal notes are populated yet in practice.
   **Recommendation:** add a visibility flag or column-restricted view before any staff
   lifecycle/notes API ships.
2. **Defense-in-depth grant tidy-up:** `authenticated` still holds `TRUNCATE`/`REFERENCES`/
   `TRIGGER` on the four order tables (only `INSERT/UPDATE/DELETE` were revoked). These are
   **not reachable** through the PostgREST/Kong client surface (no TRUNCATE endpoint;
   REFERENCES/TRIGGER need a direct DB connection that JWT roles do not have), so they are not
   exploitable via the app. **Recommendation (follow-up, not a 2D blocker):** also
   `revoke truncate, references, trigger` on these tables.
3. **Rider access** is correctly deferred (no rider-specific policy; a rider without a
   branch-scoped `user_roles` row sees nothing). Note the generic staff-branch policy keys off
   any `user_roles.branch_id`; if a rider is later given a branch-scoped role they would inherit
   branch-staff visibility. Rider assignment-scoped access remains future work.
4. **Production apply + merge are pending owner action** (agent tooling/credential limits).

## 11. Owner runbook (to complete Phases 3–6 in production)

**Merge (Phase 3):**
```
gh pr ready 49
# confirm required checks are green, then:
gh pr merge 49 --squash   # or the repo's standard strategy
git checkout main && git pull origin main
git rev-parse HEAD        # record merge SHA
```

**Production migration (Phase 4):**
```
export SUPABASE_ACCESS_TOKEN=<owner token>
supabase link --project-ref pyeowxvacgypohrbvgee
# Pre-check (capture BEFORE):
#   - supabase migration list --linked
#   - counts of orders/order_items/order_status_logs/deliveries/payments
#   - RLS enabled flags + existing policies + pre-existing production orders
npx supabase db push --linked --dry-run     # confirm ONLY 20260716140000_...slice2d... is pending
npx supabase db push --linked --yes
```

**Production live RLS smoke (Phase 5):** repeat the persona matrix in §6 against production
using short-lived test identities and **real user tokens** (never service role); then remove
all temporary rows/users (Phase 6) and confirm pre-existing production orders are untouched.
The exact scripts used locally are reproducible (persona creation via GoTrue admin +
password-grant, PostgREST SELECT/PATCH assertions, tagged cleanup by `@rls.test` /
`RLS-SMOKE-` markers).

## 12. Next unlocked task

With Slice 2D order/branch RLS applied, the next gated work is the **branch/staff operational
read surfaces** (Kitchen/Branch order views) that depend on this RLS hard gate — to be started
only under their own slice. **Do not** start customer identity-linking or Sprint 4.5 as part
of this close.

---

SPRINT 3 SLICE 2D — ORDER BRANCH RLS: SECURITY REVIEW + VALIDATION + LOCAL RUNTIME RLS **PASS**.
PRODUCTION MERGE / MIGRATION / PROD-SMOKE **PENDING OWNER ACTION** (blocked in agent environment; runbook in §11).
