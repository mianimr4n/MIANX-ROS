# Sprint 3 Slice 2B — Post-Merge Gate (IN PROGRESS)

**Date:** 2026-07-16  
**Code baseline:** `main` @ `0a5a730` (PR #29 merge)  
**Catalog freeze:** v1.2.0 unchanged (58 items / 13 categories verified)

---

## Outcome so far

| Step | Status | Evidence |
|---|---|---|
| Merge PR #29 | ✅ | `0a5a730` on `main` |
| Render API deploy | ✅ | `/api/v1/meta/modules` lists staff invites; admin invite → 401 without JWT; accept → 400 validation |
| Vercel website deploy | ✅ | `/staff/accept` + `invites/accept` present in production bundle |
| Catalog regression | ✅ | `verify-production-api.mjs` PASS (58/13/2) |
| Apply Slice 2B DB migrations | ❌ **BLOCKED** | No `SUPABASE_ACCESS_TOKEN` / linked project in cloud agent env; production migrate is a **human gate** |
| Invite → accept → `/auth/me` smoke | ⏳ Blocked on migrations | — |
| Slice 2B CLOSE | ⏳ | Write after smoke PASS |

---

## Migrations to apply (production project `pyeowxvacgypohrbvgee`)

1. `supabase/migrations/20260716100000_sprint3_slice2b_staff_permissions.sql`
2. `supabase/migrations/20260716101000_sprint3_slice2b_staff_invites.sql`
3. `supabase/migrations/20260716102000_sprint3_slice2b_accept_helper.sql`

### Owner / operator commands

```bash
# From repo root on main @ 0a5a730 (or later)
export SUPABASE_ACCESS_TOKEN=<personal access token with project access>
npx supabase link --project-ref pyeowxvacgypohrbvgee
npx supabase migration list --linked
npx supabase db push --linked
npx supabase migration list --linked   # confirm 20260716100000 / 01000 / 02000 present
```

After push, re-apply table grants if the known repo gap recurs (see `AGENTS.md`):

```bash
# Only if anon/authenticated/service_role lose table privileges after reset/push
# Prefer adding grants to migrations long-term; this is the operational workaround.
```

---

## Production smoke (after migrations)

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

## Next recommended action

**Human:** apply the three Slice 2B migrations to production Supabase, then authorize agent smoke + `SPRINT-03-SLICE-2B-CLOSE.md`.
