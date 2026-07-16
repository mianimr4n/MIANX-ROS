# Sprint 3.5 — Merge & Production Validation (CLOSED)

**Date:** 2026-07-16  
**Branch baseline:** `main` @ `dd6ebec`  
**Catalog freeze:** v1.2.0 unchanged (58 items / 13 categories verified)

---

## Outcome

**Sprint 3.5: CLOSED**

Authorization foundation (Slice 2A) and canonical authentication architecture are merged, migrated, and production-verified.

---

## Completed checklist

| Step | Evidence | Status |
|---|---|---|
| Merge PR #27 (architecture SSOT) | Merge `4ca2e97` | ✅ |
| Canonical status follow-up | `dd6ebec` — Status → **Canonical** | ✅ |
| Apply `20260716010000` (Slice 1 auth foundation) | Remote migration list | ✅ |
| Apply `20260716020000` (Slice 2A authz foundation) | Remote migration list | ✅ |
| DB: customer permissions = 0 | `permission_count: 0` | ✅ |
| DB: `idx_users_auth_user_id` present | Index exists | ✅ |
| Production API health / ready | `/healthz` 200, `/readyz` 200 | ✅ |
| Auth module summary live | `/me principal, and authorization foundation` | ✅ |
| Catalog regression | `verify-production-api` PASS (58/13/2) | ✅ |
| Spoofed headers ineffective on `/auth/me` | 401 without Bearer (role/branch headers ignored) | ✅ |
| Customer `/auth/me` | 200; roles=`customer`; permissions=`[]`; spoofIgnored | ✅ |
| Branch staff principal | 200; `branch-manager`; branchIds includes Royal Orchard; permissions > 0 | ✅ |
| Super-admin principal | 200; `isSuperAdmin=true` | ✅ |
| Suspended user | 403 `USER_ACCESS_DISABLED` (spoof role ignored) | ✅ |
| Ephemeral smoke users cleaned up | Auth/app users/`user_roles` returned to **0** after smoke | ✅ |

---

## Merge history (Sprint 3 auth)

| PR | Commit | Content |
|---|---|---|
| #25 | `d12073a` / `141de83` | Slice 1 customer auth foundation |
| #26 | `96fb0b4` / `f7fa2c4` | Slice 2A authorization foundation |
| #27 | `4ca2e97` / `35c830c` | Proposed canonical architecture doc |
| follow-up | `dd6ebec` | Mark architecture doc **Canonical** |

---

## Notes

1. **Render redeploy:** Production API already served Slice 2A auth summary before a manual redeploy. Owner-selected manual Render redeploy remains optional hygiene; no blocker observed.
2. **Vercel:** Docs-only / already-deployed API path; website catalog path unchanged. No Vercel redeploy required for Sprint 3.5 close.
3. **Internal audit reports** remain untracked and intentionally out of git:
   - `_documentation-audit/reports/SPRINT-03-CUSTOMER-STAFF-AUTH-ARCHITECTURE.md`
   - `_documentation-audit/reports/SPRINT-03-PR-REVIEW.md`

---

## Explicitly NOT started

- Slice 2B — Staff invites
- Slice 2C — Customer phone OTP
- Slice 2D — Order/branch RLS
- Admin / POS / Kitchen / Delivery unlock

---

## Next recommended milestone

**Slice 2B — Staff invite system** (only after product/owner authorization), using:

`docs/architecture/AUTHENTICATION_ARCHITECTURE.md` as the canonical SSOT.
