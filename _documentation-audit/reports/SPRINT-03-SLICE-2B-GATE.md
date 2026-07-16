# Sprint 3 Slice 2B — Post-Merge Gate

**Date:** 2026-07-16  
**Code baseline:** `main` @ `0a5a730` (PR #29 merge)  
**Catalog freeze:** v1.2.0 unchanged (58 items / 13 categories verified)

---

## Outcome

| Step | Status | Evidence |
|---|---|---|
| Merge PR #29 | ✅ | `0a5a730` on `main` |
| Render API deploy | ✅ | Invite admin + accept routes live |
| Vercel website deploy | ✅ | `/staff/accept` in production bundle |
| Catalog regression | ✅ | `verify-production-api.mjs` PASS (58/13/2) |
| Apply Slice 2B DB migrations | ✅ | Remote list includes `20260716100000` / `01000` / `02000` |
| Schema objects | ✅ | `staff_invites`, `staff_invite_events`, permissions, `finalize_staff_invite_acceptance` |
| Invite → accept → `/auth/me` smoke | ⏳ Ready for owner/agent smoke | — |
| Slice 2B CLOSE | ⏳ | After smoke PASS |

---

## Migrations applied (production `pyeowxvacgypohrbvgee`)

1. `20260716100000_sprint3_slice2b_staff_permissions.sql`
2. `20260716101000_sprint3_slice2b_staff_invites.sql`
3. `20260716102000_sprint3_slice2b_accept_helper.sql`

---

## Production smoke checklist

1. As super-admin JWT: `POST /api/v1/admin/staff/invites` → send → capture `inviteUrl`
2. Open `/staff/accept?token=…` on https://telepizza-website.vercel.app
3. Set password → accept
4. `GET /api/v1/auth/me` → staff roles/permissions/branchIds from DB
5. Spoof `x-telepizza-role` / branch headers without Bearer → still 401
6. Clean up ephemeral smoke users/invites

---

## Explicitly NOT started

- Slice 2C — Customer phone OTP
- Slice 2D — Order/branch RLS
- Admin / POS / Kitchen / Delivery unlock
- Email provider for invites (API `inviteUrl` only)

---

## Next

Run production smoke, then write `SPRINT-03-SLICE-2B-CLOSE.md`.
