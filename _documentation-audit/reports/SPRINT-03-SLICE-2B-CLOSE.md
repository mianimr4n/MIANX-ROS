# Sprint 3 Slice 2B — CLOSE

**Date:** 2026-07-16  
**Final status:** **PASS AND CLOSED**  
**Catalog freeze:** v1.2.0 unchanged (58 items / 13 categories / 2 branches)

---

## Outcome

**SPRINT 3 SLICE 2B: PASS AND CLOSED**

Staff invitation system (locked owner decisions D1–D8) is merged, migrated, deployed, and production-verified.

---

## PR and merge

| Item | Value |
|---|---|
| PR | [#31](https://github.com/mianimr4n/telepizza/pull/31) |
| Branch | `feature/sprint-3-staff-invites` |
| Merge strategy | Merge commit (not squash) |
| Merge commit SHA | `8527f2824bdf111da7dd28e8f0c6ce1bca135f1f` |
| Merged at | 2026-07-16T02:52:41Z |
| Pre-merge security fix | `d8a4523` — vendor error leakage wrapped to safe `SERVICE_UNAVAILABLE` |

### Commits included

1. `d7c3831` — DB locked-decision migration  
2. `5e0fad2` — API super-admin gates + safe accept  
3. `e287d7c` — `/staff/accept` read-only preview UI  
4. `5b350b0` — tests  
5. `ea7bae7` / `e16ff68` — architecture D1–D8 docs  
6. `d8a4523` — safe error mapping  

---

## Phase 1 — Security review

**Verdict: PASS** (one blocking fix applied before merge)

| # | Check | Result |
|---|---|---|
| 1 | No raw token persisted | ✅ `token_hash` only |
| 2 | SHA-256 one-way hash | ✅ |
| 3 | Timing-safe compare | ✅ `timingSafeEqual` |
| 4 | Resend invalidates old token | ✅ |
| 5 | Expired/revoked/replay fail safely | ✅ `410 INVITE_NOT_ACCEPTABLE` |
| 6 | Existing auth email no escalation | ✅ `INVITE_ACCOUNT_CONFLICT` |
| 7 | Accept cannot override email/role/branch | ✅ |
| 8 | Super-admin invite impossible | ✅ API + DB |
| 9 | Customer invite role impossible | ✅ |
| 10 | Non-operating/missing branch rejected | ✅ |
| 11 | BM/customer cannot list/create/revoke | ✅ `requireSuperAdmin` |
| 12 | Spoof headers ineffective | ✅ |
| 13 | No service-role/vendor leak | ✅ fixed in `d8a4523` |
| 14 | Audit has no token/hash/password/url | ✅ |
| 15 | Rate limiting server-enforced | ✅ 3/24h send; accept throttle |
| 16 | Accept avoids partial privilege | ✅ delete auth user on finalize fail |
| 17 | Slice 1 signup remains customer-only | ✅ |
| 18 | v1.2.0 catalog untouched | ✅ |

---

## Phase 2 — Validation (pre-merge)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ |
| `pnpm check` | ✅ |
| `pnpm test:db` | ✅ 32 |
| `pnpm test:backend` | ✅ 52 |
| `pnpm build:website` | ✅ |
| `git diff --check` | ✅ |
| Working tree clean | ✅ |
| Diff scope Slice 2B only (8 files) | ✅ |
| No secrets staged | ✅ |

---

## Phase 4 — Production migration

| Item | Value |
|---|---|
| Project | `pyeowxvacgypohrbvgee` |
| Applied | `20260716103000_sprint3_slice2b_locked_decisions.sql` |
| Pre-check | Unapplied on remote (local present, remote empty) |
| Backup | Logical snapshots under `/tmp/slice2b-pre-migrate-backup/` (roles, permissions, role_permissions, users, user_roles, branches, migration history, staff_invites) |
| Post-check remote list | `20260716103000` present on remote |

### Post-apply verification

| Check | Result |
|---|---|
| `staff_invites` / `staff_invite_events` exist | ✅ |
| Indexes (`token_hash` unique, pending email unique, status, branch) | ✅ |
| `enforce_staff_invite_rules` requires operating branch; denies SA/customer | ✅ |
| `auth_user_email_exists` present | ✅ |
| `finalize_staff_invite_acceptance` hardened | ✅ |
| Grants: service_role only (no anon/authenticated writes) | ✅ |
| Catalog table behavior unchanged (API 58/13) | ✅ |

---

## Phase 5 — Deploy

| Surface | Evidence |
|---|---|
| Render API | Auto-deploy from `main` @ `8527f28`; `/healthz` 200, `/readyz` 200; preview route live |
| Vercel website | 200; bundle includes `staff/invites/preview`, read-only role fields |
| Catalog regression | `verify-production-api.mjs` PASS — **58 items / 13 categories / 2 branches** |

---

## Phase 6 — Production smoke

All steps **PASS** (ephemeral `smoke2b.*@telepizza.test` accounts).

| Area | Result |
|---|---|
| A. Super-admin create + inviteUrl once + GET no secrets + resend rotate + old token 410 + new preview | ✅ |
| B. Accept + staff `/auth/me` (cashier + Royal Orchard branch) + replay 410 | ✅ |
| C. BM/customer denied; spoof headers; SA/customer role invite rejected; missing branch rejected | ✅ |
| D. Existing auth → `INVITE_ACCOUNT_CONFLICT`; revoked cannot resend | ✅ |
| E. Customer `/auth/me` + catalog 58 regression | ✅ |
| F. Cleanup | ✅ `smoke2b.%` users = 0; invites cleaned |

---

## Security verification (production)

- Raw token never returned on GET; create/send/resend return `inviteUrl` only  
- Token rotation invalidates prior hash  
- `INVITE_ACCOUNT_CONFLICT` blocks silent conversion  
- DB-derived `requireSuperAdmin` gates all invite admin APIs  
- Role/branch assigned only from stored invite row  

---

## Blockers

None.

---

## Explicitly NOT started

- Slice 2C — Customer phone OTP  
- Slice 2D — Order/branch RLS  
- Admin / POS / Kitchen / Rider app unlock  
- Email provider for invites  

---

## Final line

**SPRINT 3 SLICE 2B: PASS AND CLOSED**
