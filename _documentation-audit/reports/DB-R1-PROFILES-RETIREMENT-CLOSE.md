# DB-R1 — public.profiles retirement close report

**Status:** PASS AND CLOSED  
**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee` (Telepizza)  
**Branch:** `fix/db-r1-retire-profiles`  
**Migration:** `supabase/migrations/20260718130100_p1_retire_unmanaged_profiles.sql`  
**Owner gate:** Formally approved for DB-R1 / P1 only

## Freeze position (unchanged overall)

```text
DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
```

R1 complete does **not** unfreeze. Still blocked on DB-R2…R7 (modifiers prod apply, restaurant tables/QR, dine-in, kitchen, POS foundations, RLS extensions).

## PHASE 1 — Pre-flight

| Check | Result |
|---|---|
| Latest `main` pulled; clean tree | PASS (branched from `origin/main` @ `03f4a20`) |
| Linked project ref | `pyeowxvacgypohrbvgee` |
| PR #65 (DB-R0) | OPEN — not merged; P0 migration file included on this branch so local history matches remote applied versions |
| Design SQL | Missing on main; recovered from `audit/database-pre-freeze-completeness` and archived at `docs/database/remediation/P1_retire_unmanaged_profiles.sql` |
| Proposed name `20260718120100_…` | **Not used** — would reorder before applied P0 `20260718130000`; used `20260718130100_…` instead |
| App refs `from('profiles')` / `public.profiles` in `apps/` + `backend/` | **0** (docs-only mentions OK) |
| Production `SELECT count(*) FROM public.profiles` | **0** |

### Migration list (pre-apply)

| Version | Local | Remote |
|---|---|---|
| `20260718120000` (modifiers / DB-R2) | present | **not applied** (intentional) |
| `20260718130000` (P0 / DB-R0) | present | applied |
| `20260718130100` (P1 / DB-R1) | present | pending |

Full dry-run blocked on modifiers-before-P0 ordering. Same isolation method as DB-R0: temporarily move modifiers aside → dry-run/push P1 only → restore.

Isolated dry-run would push only:

- `20260718130100_p1_retire_unmanaged_profiles.sql`

## PHASE 2 — Apply

- Isolated `20260718120000_product_modifier_system.sql` to `.tmp/db-r1-isolation/`
- `npx supabase db push --linked` applied **P1 only**
- Restored modifiers file (still local-only / not applied)
- **No DB-R2 / modifiers apply**

## PHASE 3 — Post-apply verification

| Check | Result |
|---|---|
| `to_regclass('public.profiles')` | **null** |
| `handle_new_user` in `pg_proc` (public) | **0 rows** |
| Auth triggers on `auth.users` (non-internal) | **`on_auth_user_created` → `handle_auth_user_created` only** |

Live bootstrap path intact; dead profiles writer removed.

### Migration list (post-apply)

| Version | Local | Remote |
|---|---|---|
| `20260718120000` (modifiers) | present | **not applied** |
| `20260718130000` (P0) | present | applied |
| `20260718130100` (P1) | present | **applied** |

## PHASE 4 — Regression

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test:db` | PASS (131) |
| `pnpm test:backend` | PASS (128) |
| `pnpm build:website` | PASS |
| `git diff --check` | PASS |

### Production API smoke (counts / status only)

| Check | Result |
|---|---|
| `GET /healthz` | 200 |
| `GET /readyz` | 200, `issues: []` |
| Catalog meta | **13 / 58 / 3 / 40 / 7** |
| Branches | **2** |
| `GET /api/v1/auth/me` (no token) | 401 (expected) |
| Staff invites | Not exercised with credentials this turn |

No credentials or PII recorded in this report.

## Safety confirmation

- Dropped empty unmanaged `public.profiles` only (guard refused if count > 0)
- Did **not** drop `public.users`
- Did **not** apply modifiers or other schema slices
- No secrets in repo artifacts

## Next step

**DB-R2** — product modifier system production apply — requires separate owner gate. Do not `db push` modifiers without explicit approval (remote history still has a version gap vs local modifiers timestamp).

---

DB-R1 — PUBLIC.PROFILES RETIREMENT: PASS AND CLOSED
