# Customer Google + Email + Phone Identity Linking

**Date:** 2026-07-16  
**Branch:** `feature/customer-identity-linking`  
**Base:** latest `main` (does **not** modify Slice 2D PR #49)  

---

## Phase 0 — Root cause

Google OAuth creates an `auth.users` row with a **Google identity only**.  
Email/password login calls `signInWithPassword`, which requires a password credential on that same auth user. None exists until the user sets one via `supabase.auth.updateUser({ password })` while authenticated.

`public.users.password_hash` is always `null` and must stay null — passwords live only in Supabase Auth.

---

## Locked identity model

```text
auth.users.id
  → public.users.auth_user_id (1:1)
  → customer role (global)

Methods on the same auth user:
  - Google OAuth
  - email/password (after set-password)
  - future phone/WhatsApp OTP (Slice 2C — not implemented)
```

Rules enforced:

- No second `auth.users` / `public.users` from set-password
- No silent email-merge of two existing auth users
- Google metadata never assigns roles
- Staff cannot be rewritten via customer profile PATCH
- Phone uniqueness after E.164 normalization; `PHONE_ALREADY_IN_USE` without enumeration

---

## What shipped

### Set password (Account)
- Authenticated-only; requires email on the session
- Password + confirm; strength policy aligned with production
- `supabase.auth.updateUser({ password })` on **current** user
- Never sent to Telepizza API / `public.users`
- Reauth-required mapped to a safe “sign out and sign back in” message

### Login UX
- Google remains primary
- Safe hint (no email enumeration):  
  “Created your account with Google? Continue with Google, or set a password from your Account page.”
- Forgot Password **deferred** (needs redirect/architecture slice)

### Phone + profile API
- `PATCH /api/v1/auth/me/profile` (Bearer only)
- Mutable: `fullName`, `phone` only (`.strict()` rejects `userId`/`role`/`status`/`branchId`/…)
- Pakistani mobile → `+923XXXXXXXXX`
- Checkout already prefills `profile.phone`

### Migration
`supabase/migrations/20260716150000_customer_identity_phone_e164.sql`

- E.164 check constraint on `public.users.phone`
- Partial unique index (foundation already had `UNIQUE`)
- Does not touch Slice 2D / catalog / orders

---

## Duplicate-account protections

| Case | Behavior |
|---|---|
| Google user + set password | Same `auth.users.id`; password login works |
| Register again with same Google email | Supabase “already registered” → generic UI error |
| Staff email | Customer profile path rejects non-`customer` `user_type` |
| Duplicate phone | `409 PHONE_ALREADY_IN_USE` — no other-account details |
| Suspended | `403 USER_ACCESS_DISABLED` on profile update |
| Body spoof privilege fields | `400 VALIDATION_ERROR` via Zod `.strict()` |

**Note:** Automatic Google↔existing-email-password linking remains Supabase-project-config dependent. This slice does **not** implement silent merge; Google-first → set password is the supported path. Email-first then Google same email should be verified in production Supabase Auth settings (manual linking / unique email) during rollout smoke.

---

## Files changed

- `apps/website/client/src/pages/Account.tsx`
- `apps/website/client/src/pages/Login.tsx`
- `apps/website/client/src/contexts/AuthContext.tsx`
- `apps/website/client/src/lib/auth-utils.ts`
- `apps/website/client/src/lib/phone.ts`
- `backend/api/src/modules/auth/routes.ts`
- `backend/api/src/services/auth/supabase.ts`
- `backend/api/src/services/auth/phone.ts`
- `backend/api/tests/auth-profile.test.ts`
- `supabase/migrations/20260716150000_customer_identity_phone_e164.sql`
- `tests/database/customer-identity-phone.test.mjs`
- `tests/website/customer-identity-linking.test.mjs`
- `_documentation-audit/reports/CUSTOMER-IDENTITY-LINKING-IMPLEMENTATION.md`

---

## Production rollout plan

1. Owner reviews PR (no merge/deploy by agent in this turn when waiting)
2. Merge → deploy API (Render) for `PATCH /auth/me/profile`
3. Apply phone E.164 migration on Supabase
4. Smoke:
   - New Google user → set password → logout → email login same user → Google still works
   - Add phone `03…` → stored `+923…` → checkout prefills
   - Duplicate phone rejected
   - Staff invite still works
5. Do **not** start WhatsApp OTP here

---

## Blockers

- Live Google↔email-password dual-login smoke needs production/staging Auth project
- Forgot Password not included (next small slice)
- Slice 2C OTP still paused for verified phone identity

---

CUSTOMER GOOGLE + EMAIL + PHONE IDENTITY LINKING: PASS
