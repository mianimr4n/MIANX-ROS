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
- Dashboard cards for active/recent/last orders, saved addresses, reward points, and favorite-item future state
- Profile with honest Email Verified / Phone Unverified states and disabled-future phone verification copy
- Security with linked methods, verification badges, last login, current-device session visibility, password recovery, and email change
- Device-local address book with Home / Office / Other labels, default address, edit/delete, and checkout selection/prefill
- Orders with Active/Completed/Cancelled tabs, status timeline, branch, honest Payment/ETA gaps, item detail, tracking, and reorder for newly stored orders
- Disabled-future notification switches and a populated loyalty preview dashboard

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

1. `903f394` — feat(auth): add forgot/reset password and secure email change
2. `f187a9b` — docs(auth): record customer auth production close and fix email-map test
3. `7ad2d82` — docs(auth): note blocked screenshots in customer auth production report
4. `4ada3c5` — docs(auth): link PR #58 in customer auth production report
5. `277f44d` — feat(account): complete customer Account Center
6. `f0effe4` — test(auth): cover Account Center owner feedback

---

## Verification (Phase 8)

```
pnpm install --frozen-lockfile   # pass
pnpm check                       # pass
pnpm test:db                     # pass (119)
pnpm test:backend                # pass (127)
pnpm build:website               # pass
git diff --check                 # pass
```

Catalog freeze 13/58/3/40/7, branches 2, WhatsApp `0304-1110495` unchanged (guarded by tests).

---

## UI states (screenshots)

**Screenshots blocked in this delivery session** — browser automation could not attach a tab (`No browser tab available` after create/navigate). UI states are documented below and covered by static regression tests.

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

### Password-flow result

- Static and integration coverage passes for Google-only first-time set-password (no current password), email-user password change (current Telepizza password required), logout/session cleanup, email login wiring, Google OAuth wiring, forgot password, recovery callback, and reset password.
- A live end-to-end run of `Google Login → Set Password → Logout → Email Login → Google Login → Forgot Password → Reset Password` was **not possible in this session** because the Cursor browser tab could not attach and production email delivery depends on owner SMTP. This remains an owner smoke-test action; it is not represented as passed.

---

## Known limitations

1. **Owner must configure custom SMTP + SPF/DKIM/DMARC** or confirmation/recovery emails will fail or spam-folder.
2. Phone OTP / WhatsApp sign-in deferred (honest Unverified).
3. Addresses are device-local (not server-synced); architecture is isolated in `lib/customer-addresses.ts` for later server replacement.
4. `public.users.email` may drift until email-change confirmation completes; display uses auth email.
5. Orphan auth user if email UNIQUE blocks bootstrap — rare; no automatic heal in this PR.
6. Loyalty is a non-transactional preview and notification switches are disabled until backend services and consent storage exist.
7. Reorder is available for orders stored after this update; older device-local orders lack menu slugs and show a disabled action.
8. Supabase exposes only the current browser session to the client, not a cross-device active-session inventory.

---

## Production rollout plan

1. Merge this PR (owner decision — **do not auto-merge**).
2. Owner: complete SMTP go-live checklist in `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`.
3. Owner: confirm Supabase Redirect URLs include prod + local `/auth/callback`.
4. Owner: enable Secure password change + Secure email change in Supabase Auth settings.
5. Smoke: Google signup → set Telepizza password → email login; email signup → confirm → forgot/reset; email change confirmation.
6. Deploy website only after smoke passes (this PR does **not** deploy).

---

## Owner feedback closure (PR #58)

- Rebasing `fix/customer-auth-production` onto `origin/main` completed without unresolved conflicts. Git dropped the already-upstream Sprint 4.5A port commit and replayed the remaining auth-production commits.
- Required Account Center additions are implemented without changing catalog data, branches, or WhatsApp ordering number.
- Browser automation remained unavailable, so responsive behavior was reviewed from the Tailwind breakpoints and verified by type-check/build; owner should complete mobile and authenticated flow smoke tests before merge.
- No merge or deployment was performed.

---

## PR

https://github.com/mianimr4n/telepizza/pull/58

CUSTOMER AUTHENTICATION SYSTEM: PASS
