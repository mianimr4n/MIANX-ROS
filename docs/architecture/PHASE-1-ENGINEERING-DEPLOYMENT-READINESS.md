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
| WP-10 | Automated test/check/build gate | **READY** |
| WP-11 | Docs reconciliation (audit / program / inventory) | **READY** |
| WP-12 | PR #87 body / status (open, unmerged) | **READY** |
| WP-13 | Deployment-readiness documentation (this file) | **READY** |
| WP-14 | CP-7 UAT owner sign-off | **OWNER BLOCKED** |
| WP-15 | Explicit production migration / deployment approval | **OWNER BLOCKED** |

### Tip commit map (on `polish/my-telepizza-ux`)

Prior agent SHAs from side branches were selectively integrated under **rebased** OIDs on this tip. Verify ancestry against tip, not the old side-branch SHAs:

| Package | Tip commit | Message |
|---|---|---|
| FAV-01 / WP-04 | `1a2beee` | strengthen FAV-01 product detail favorites coverage |
| SEC-01 / WP-05 + WP-09 | `8a1af3b` | order_reviews RLS regression tests |
| PROC-01 / WP-08 | `99be107` | Phase 1 customer migrations inventory |
| DOC/tests / WP-11 | `7b6befa` | reconcile DOC-01 scoreboard and CP isolation tests |
| WP-06 Settings discoverability | `e66ec24` | surface Settings from My Telepizza hub |
| WP-13 evidence | `a35bc5f` (+ successors) | verification evidence and linked-migration gate |

Do **not** treat `57d7844` / `e56effe` / `e8caf6c` / `4ba84f4` as tip ancestors — those OIDs lived on parallel fix branches before cherry-pick/rebase onto polish.

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

Independent re-verification on tip `a35bc5f` (`polish/my-telepizza-ux`, 2026-07-19) — all engineering gates green. Linked Supabase commands remain owner-gated:

- `pnpm install --frozen-lockfile` — pass
- `pnpm check` — pass
- `pnpm test` / `pnpm test:db` — 238 pass / 0 fail
- `pnpm test:backend` — 222 pass / 0 fail (29 files)
- `pnpm build:website` — pass
- `git diff --check` — pass
- `npx supabase migration list --linked` → **blocked**: project not linked — Owner runs with linked credentials (WP-15); **no apply performed**
- `npx supabase db push --linked --dry-run` → same link precondition; **not applied**

**Verdict (engineering only):** WP-01..WP-13 **READY**. WP-14 / WP-15 remain **OWNER BLOCKED**. Do not claim Phase 1 PASS AND CLOSED.
