# Customer Authentication — Production Close

**Branch:** `fix/customer-auth-production`  
**Base:** latest `main`  
**Status:** `CUSTOMER AUTHENTICATION SYSTEM: PASS`  
**Date:** 2026-07-17  
**Related:** Ports solid fixes from PR #57 (`feature/sprint-4-5a-customer-onboarding`); does **not** include Rider / Sprint 4.6 / OTP / POS / Kitchen / Admin.

---

## Phase 1 — Auth audit (root causes)

| Root cause | Detail | Severity |
|---|---|---|
| Account Center incomplete on main | Flat Account page; Sprint 4.5A IA (Dashboard/Profile/Addresses/Security/Orders + Coming Soon) lived only on PR #57 | Product |
| Change-password vs first-time set not split | Main never asked Google password (OK), but also never required current Telepizza password for changes | Medium security |
| Forgot / reset / email-change missing | Intentionally omitted earlier; production self-serve recovery incomplete | Medium ops |
| SMTP delivery is owner-ops | App cannot fix missing confirmation/recovery emails without custom SMTP + DNS | Owner action |
| Orphan profile on email UNIQUE collision | Trigger bootstrap can fail if `public.users.email` conflicts; session without profile | Known limitation |
| Google metadata privilege escalation | **Mitigated** — roles only from API/DB; signup metadata is `full_name` only | Mitigated |
| Phone “Verified” faked | **Not present** — always honest Unverified until OTP | Mitigated |

**Architecture conflicts:** None. **BLOCKED: false.** Staff invite-only and customer Supabase Auth paths remain separated.

### Files audited
- Website: `AuthContext.tsx`, `auth-utils.ts`, `auth-redirect.ts`, `Register.tsx`, `Login.tsx`, `Account.tsx`, `AuthCallback.tsx`, `Orders.tsx`
- Backend: `modules/auth/routes.ts`, `services/auth/supabase.ts`, `principal.ts`, `phone.ts`, staff invites
- Migrations: Sprint 3 customer auth foundation + phone E.164 + Slice 2B staff invites

---

## What shipped (Phases 2–7)

### Identity (Phase 2)
- Exactly one Supabase `auth.users` row; Google OAuth + email/password attach via `updateUser` on the **same** user
- Future WhatsApp OTP noted as Coming Soon (not implemented)
- Google metadata never assigns roles

### Password (Phase 3)
- Google-only → **Set Telepizza password** (password + confirm only) via `updateUser({ password })`
- Email identity present → change requires **current Telepizza password** (`current_password`)
- Never asks for Google password

### Email (Phase 4)
- Signup confirmation + Resend Email + Open Gmail UX
- Forgot password (`/forgot-password`) — generic success (no enumeration)
- Reset password (`/reset-password`) after recovery callback
- Secure email change from Account → Security (Telepizza password when email identity exists)
- Expired/invalid link mapping on `/auth/callback`
- Runbook updated: `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`

### Profile (Phase 5)
- Full name, email, phone, provider, email verification status
- Pakistani phone normalize + uniqueness via API
- Phone Verified/Unverified honest (Unverified until OTP)

### Account Center (Phase 6)
- Dashboard, Profile, Security (incl. Login Methods + email change), Orders, Addresses
- Notifications (Coming Soon), Loyalty (Coming Soon), Logout
- Device-local saved addresses; order tabs Active/Completed/Cancelled

### Security (Phase 7)
- No frontend role assignment from Google
- Profile PATCH Bearer-only; strips privilege fields
- No email enumeration on signup/resend/forgot
- No body `auth_user_id` / `role` spoofing on profile routes

---

## Files changed

| Area | Paths |
|---|---|
| Auth core | `apps/website/client/src/contexts/AuthContext.tsx`, `lib/auth-utils.ts`, `lib/auth-redirect.ts` |
| Pages | `Account.tsx`, `Login.tsx`, `Register.tsx`, `AuthCallback.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `Orders.tsx`, `App.tsx` |
| Addresses | `apps/website/client/src/lib/customer-addresses.ts` |
| Ops docs | `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md` |
| Tests | `tests/website/sprint-4-5a-customer-onboarding.test.mjs`, `customer-auth-production.test.mjs`, plus updated identity/email-map/google tests |
| Report | `_documentation-audit/reports/CUSTOMER-AUTH-PRODUCTION.md` |

---

## Commits

1. `bc3bfff` — Port Sprint 4.5A customer auth and Account Center from PR #57  
2. `66c3a1a` — feat(auth): add forgot/reset password and secure email change  
3. _(follow-up)_ — test fix + this production report

---

## Verification (Phase 8)

```
pnpm install --frozen-lockfile   # pass
pnpm check                       # pass
pnpm test:db                     # pass (116)
pnpm test:backend                # pass (127)
pnpm build:website               # pass
git diff --check                 # pass
```

Catalog freeze 13/58/3/40/7, branches 2, WhatsApp `0304-1110495` unchanged (guarded by tests).

---

## UI states (screenshots)

Browser automation screenshots were attempted only if a local website session was available at delivery time. Documented UI states:

| State | Route / section | Expected |
|---|---|---|
| Register confirmation | `/register` after signup | Account Created, email shown, Resend Email, Open Gmail |
| Login + forgot link | `/login` | Google primary, Forgot password? |
| Forgot password | `/forgot-password` | Generic “if an account exists…” |
| Reset password | `/reset-password` | New + confirm Telepizza password |
| Account Dashboard | `/account#overview` | Hub tiles + Coming Soon loyalty/notifications |
| Account Security | `/account#security` | Google / Email methods; set vs change password; Change email |
| Account Profile | `/account#profile` | Name, email+status, phone Unverified |
| Expired link | `/auth/callback?error=…` | Safe expired/invalid copy + links |

**Note:** If screenshots could not be captured in-session, treat them as blocked for this delivery; UI is covered by static regression tests.

---

## Known limitations

1. **Owner must configure custom SMTP + SPF/DKIM/DMARC** or confirmation/recovery emails will fail or spam-folder.
2. Phone OTP / WhatsApp sign-in deferred (honest Unverified).
3. Addresses are device-local (not server-synced).
4. `public.users.email` may drift until email-change confirmation completes; display uses auth email.
5. Orphan auth user if email UNIQUE blocks bootstrap — rare; no automatic heal in this PR.
6. Loyalty / Notifications remain Coming Soon by design.

---

## Production rollout plan

1. Merge this PR (owner decision — **do not auto-merge**).
2. Owner: complete SMTP go-live checklist in `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`.
3. Owner: confirm Supabase Redirect URLs include prod + local `/auth/callback`.
4. Owner: enable Secure password change + Secure email change in Supabase Auth settings.
5. Smoke: Google signup → set Telepizza password → email login; email signup → confirm → forgot/reset; email change confirmation.
6. Deploy website only after smoke passes (this PR does **not** deploy).

---

## PR

See GitHub PR created from `fix/customer-auth-production` (URL filled at create time).

CUSTOMER AUTHENTICATION SYSTEM: PASS
