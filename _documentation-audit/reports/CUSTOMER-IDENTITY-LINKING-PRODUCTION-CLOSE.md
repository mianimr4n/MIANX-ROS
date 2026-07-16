# Customer Google + Email + Phone Identity Linking — Production Close Report

**Date:** 2026-07-16
**Scope:** Customer identity linking (Google OAuth + email/password on one auth user) and the
Pakistani phone **E.164** safety migration. No OTP (Slice 2C), no Sprint 4.5, no staff/branch
feature work, no catalog/pricing changes.

**PR:** #50 — `feat(auth): customer Google + email password + phone identity linking`
**Merge SHA:** `dd07558c4c1daeac3d127cf96c0fdac20174a4da` (merged 2026-07-16T14:53:30Z)
**Migration:** `supabase/migrations/20260716150000_customer_identity_phone_e164.sql`
**Implementation detail:** see `CUSTOMER-IDENTITY-LINKING-IMPLEMENTATION.md`.

---

## 0. Status summary

| Item | Result |
|---|---|
| Migration `20260716150000` merged (PR #50) | ✅ merge `dd07558` |
| Migration applied to production `pyeowxvacgypohrbvgee` | ✅ owner-confirmed |
| Production verification (read-only) | ✅ PASS |
| Local runtime verification (identical applied SQL) | ✅ PASS (11/11 identity checks) |
| Temporary smoke data cleanup | ✅ DONE (local baseline restored; no prod smoke rows) |

## 1. What the migration does

`20260716150000_customer_identity_phone_e164.sql` (idempotent, transactional):
- Normalizes blank `public.users.phone` values to `NULL`.
- Adds `users_phone_e164_check`: `phone IS NULL OR phone ~ '^\+923[0-9]{9}$'`
  (Pakistani mobile in E.164, e.g. `+923001234567`).
- Adds partial unique index `users_phone_e164_uidx on public.users(phone) where phone is not null`
  (duplicate-phone protection; complements the pre-existing `UNIQUE`).
- Does **not** alter Slice 2D order RLS, and does **not** grant anon/authenticated anything new.

Privilege guards from the customer-auth foundation remain in force: the
`prevent_users_privilege_escalation` trigger blocks changes to `auth_user_id`, `user_type`,
`password_hash`, and blocks `status` changes by `authenticated`. `password_hash` stays `NULL`
(passwords live only in Supabase Auth).

## 2. Verification methods

- **Production endpoint (read-only, non-mutating):** deployed website
  `telepizza-website.vercel.app`, API `telepizza-api.onrender.com`, and GoTrue settings on
  `pyeowxvacgypohrbvgee.supabase.co`. No synthetic identities/orders were written to production.
- **Local runtime (byte-identical applied SQL):** authenticated profile-update, phone
  constraint/uniqueness, and escalation-guard checks executed against a local Supabase carrying
  the same migrations — deliberately avoiding synthetic customer creation in the live DB.

## 3. Verification matrix

| # | Check | Where | Result |
|---|---|---|---|
| 6 | Google + email auth **providers enabled** (`external.google=true`, `email=true`) | **PROD** | ✅ |
| 6 | Production website reachable | **PROD** | ✅ 200 |
| 6 | Email signup → password login → `/auth/me` returns own profile | LOCAL | ✅ |
| 2 | `users_phone_e164_check` constraint present | LOCAL | ✅ |
| 3 | `users_phone_e164_uidx` unique index present | LOCAL | ✅ |
| 2 | Valid E.164 `+923009990001` accepted (authenticated profile update) | LOCAL | ✅ |
| 2 | Non-E.164 `03009990001` rejected (`23514` check violation) | LOCAL | ✅ |
| 3 | Duplicate phone rejected (`23505` unique violation) | LOCAL | ✅ |
| 5 | Customer profile `full_name` update via authenticated PostgREST (own row) | LOCAL | ✅ |
| 5 | `user_type` escalation blocked (stays `customer`) | LOCAL | ✅ |
| 5 | `status` change by authenticated blocked (stays `active`) | LOCAL | ✅ |

**Local identity checks: 11/11 PASS.** (Google OAuth end-to-end sign-in is a provider-config
concern, not changed by this migration; production confirms the Google provider is enabled.)

## 4. Cleanup evidence

All temporary auth users, `public.users`, `customers`, and `user_roles` created for local
verification were removed (tagged `@rls.test` / `RLS %`); post-cleanup counts are zero. **No**
synthetic identities or orders were created against production.

## 5. Known limitations

- **Google OAuth interactive sign-in** was not driven end-to-end (requires a real Google
  account + browser consent); verified only that the provider is enabled on production and the
  email path works end-to-end. Full interactive OAuth is a manual/QA step.
- Phone remains **unverified** until Slice 2C OTP (out of scope). E.164 + uniqueness are
  structural guarantees only.
- A production-endpoint authenticated profile-update smoke was intentionally not run to avoid
  writing synthetic customers to the live DB (and requires the production `service_role` key for
  setup + cleanup); verified locally on identical applied SQL.

## 6. Next unlocked task

Customer identity linking (Google + email + phone E.164 safety) is closed. Do **not** start
Slice 2C OTP or Sprint 4.5 as part of this close.

---

CUSTOMER GOOGLE + EMAIL + PHONE IDENTITY LINKING: PASS AND CLOSED
(Migration `20260716150000` applied + verified; production providers confirmed and full
identity/profile/phone matrix verified on byte-identical applied SQL. Method + residual in §2/§5.)
