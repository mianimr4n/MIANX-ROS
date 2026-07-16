# Sprint 3 Slice 2B — CLOSE

**Date:** 2026-07-16  
**Code baseline:** `main` @ `0a5a730` (PR #29)  
**Catalog freeze:** v1.2.0 unchanged (58 items / 13 categories)

---

## Outcome

**Slice 2B: CLOSED**

Staff invite system is merged, migrated, and production-verified.

---

## Completed checklist

| Step | Evidence | Status |
|---|---|---|
| Merge PR #29 | `0a5a730` | ✅ |
| Apply `20260716100000` staff permissions | Remote migration list | ✅ |
| Apply `20260716101000` staff_invites + events | Remote migration list | ✅ |
| Apply `20260716102000` accept helper | Remote migration list | ✅ |
| Schema objects present | tables + `finalize_staff_invite_acceptance` | ✅ |
| Render API invite routes | create 201 / accept 201 | ✅ |
| Website `/staff/accept` | Vercel bundle contains route | ✅ |
| Catalog regression | 58 items / 13 categories | ✅ |
| Spoof headers without Bearer | `/auth/me` → 401 | ✅ |
| Super-admin `/auth/me` | roles=`super-admin`, `staff.create` | ✅ |
| Create+send invite | 201 + `inviteUrl`/`token` once | ✅ |
| Accept invite | 201 `profileReady=true` | ✅ |
| Staff `/auth/me` | roles=`cashier`, branchIds=Royal Orchard | ✅ |
| Customer denied invite list | 403 | ✅ |
| Ephemeral smoke users cleaned | `smoke.%` users/invites = 0 | ✅ |

---

## Smoke notes

- Body `roleCode` / `branchId` on accept are ignored (role/branch from invite row only).
- Customer principals cannot call admin invite APIs.
- Catalog path unchanged under freeze.

---

## Explicitly NOT started

- Slice 2C — Customer phone OTP  
- Slice 2D — Order/branch RLS  
- Admin / POS / Kitchen / Delivery unlock  
- Email provider for invites (API `inviteUrl` only)

---

## Next recommended milestone

**Slice 2C — Customer phone OTP** (only after product/owner authorization), using `docs/architecture/AUTHENTICATION_ARCHITECTURE.md` as SSOT.
