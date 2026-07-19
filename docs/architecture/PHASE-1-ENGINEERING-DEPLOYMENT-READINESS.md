# Phase 1 — Engineering & Deployment Readiness (no deploy)

**Product:** Telepizza Pakistan · Powered by Mianx.ai  
**Branch:** `polish/my-telepizza-ux` · **PR:** #87  
**Status:** Engineering ready for owner gates — **do not claim Phase 1 PASS AND CLOSED**  
**Rule:** This document does **not** authorize merge, staging/production migration apply, or any deploy.

---

## WP readiness matrix

| WP | Scope | Status |
|---|---|---|
| WP-01 | My Telepizza hub polish / cloud SoT | **READY** |
| WP-02 | Menu search a11y | **READY** |
| WP-03 | Checkout cloud addresses + phone normalize | **READY** |
| WP-04 | Favorites (Menu + PD hearts, Favorites page, tests) | **READY** |
| WP-05 | Reviews (RLS + API + IDOR tests) | **READY** |
| WP-06 | Settings discoverability from hub + `/settings` | **READY** |
| WP-07 | Notifications honesty (device prefs; no fake SMTP) | **READY** |
| WP-08 | Migration inventory / sequencing docs (no apply) | **READY** |
| WP-09 | Security isolation tests (reviews RLS /me RBAC) | **READY** |
| WP-10 | Automated test/check/build gate | **READY** (re-verify on tip) |
| WP-11 | Docs reconciliation (audit / program / inventory) | **READY** |
| WP-12 | PR #87 body / status (open, unmerged) | **READY** |
| WP-13 | Deployment-readiness documentation (this file) | **READY** |
| WP-14 | CP-7 UAT owner sign-off | **OWNER BLOCKED** |
| WP-15 | Explicit production migration / deployment approval | **OWNER BLOCKED** |

---

## Category C owner blockers (may remain)

1. Genuine Support Email  
2. Genuine Reply-To Email  
3. Verified Sending Domain  
4. Email Provider Account Name  
5. CP-7 UAT owner sign-off (WP-14)  
6. Explicit production migration/deployment approval (WP-15)

Evidence pack: `docs/team/CP-0-OWNER-DECISION-PACK.md`, `docs/team/CP-7-PHASE-1-UAT-CHECKLIST.md`,  
`docs/architecture/PHASE-1-CUSTOMER-MIGRATIONS-INVENTORY.md`.

---

## Migration sequencing (documentation only)

Do **not** run against linked staging/production without WP-15 approval:

1. `20260719090000_customer_addresses.sql`  
2. `20260719100000_customer_favorites.sql`  
3. `20260719110000_order_reviews.sql`  
4. Re-apply `GRANT`s after any `db reset` (see `AGENTS.md`)

See inventory for dry-run / list commands. Automated evidence: `tests/database/cp1-cp6-customer-migrations.test.mjs`.

---

## Explicit non-claims

- Not deployed  
- Migrations not applied to staging/production by this PR  
- Live SMTP / transactional email not ready  
- Phase 1 not PASS AND CLOSED until Category C cleared + WP-14/WP-15

---

## Engineering verification evidence (agent tip)

Commands run on `polish/my-telepizza-ux` tip (all passed except linked Supabase — not configured in this environment):

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm test` (238 tests, fail 0)
- `pnpm test:db`
- `pnpm test:backend` (222 tests, fail 0)
- `pnpm build:website`
- `git diff --check`
- `npx supabase migration list --linked` → **blocked**: project not linked (`LegacyProjectNotLinkedError`) — Owner runs with linked credentials (WP-15); no apply performed
- `npx supabase db push --linked --dry-run` → same link precondition; **not applied**
