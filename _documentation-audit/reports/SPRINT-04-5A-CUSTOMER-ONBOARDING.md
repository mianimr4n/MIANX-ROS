# Sprint 4.5A — Customer Identity & Onboarding Hardening

**Branch:** `feature/sprint-4-5a-customer-onboarding`  
**Date:** 2026-07-17  
**Scope:** Phase 1 (password attach / change, email confirmation UX, SMTP runbook) + light Account Center polish already present on Account.

---

## Shipped (Phase 1)

### 1. Google / first-time password attach vs change-password

| Scenario | UI | Auth call |
|---|---|---|
| OAuth-only (e.g. Google, no email identity) | **New password** + **Confirm** only — never Current password, never Google password | `supabase.auth.updateUser({ password })` |
| Email identity already present | **Current password** + New + Confirm | `supabase.auth.updateUser({ password, current_password })` |

- Identity helpers centralized in `apps/website/client/src/lib/auth-utils.ts`: `hasGoogleIdentity`, `hasEmailIdentity`, `isFirstTimePasswordAttach`.
- Supabase error `"Current password required when setting new password."` maps to customer copy that clarifies **Telepizza password**, not Google password.
- No insecure bypasses; no inventing Google password prompts.

### 2. Email verification UX

Register confirmation state replaced bare success string with:

- **Account Created** title
- Shows the email address
- **Didn't receive it?** + rate-limited **Resend Email** (~60s)
- **Open Gmail** + mailto “Open email app”
- Explicit: cannot sign in until confirmed
- `emailRedirectTo` → `/auth/callback` unchanged

### 3. SMTP / ops

Updated `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`:

- Checklist for custom SMTP, SPF, DKIM, DMARC, sender domain, redirect URLs
- States application **cannot** fix delivery
- No SMTP secrets in repo

### 4. Tests

`tests/website/sprint-4-5a-customer-onboarding.test.mjs` covers:

- Google set-password (no current pw)
- Email change-password requires current
- Confirmation / resend / Open Gmail copy
- No privilege from OAuth metadata
- Catalog / branches regression guards
- Runbook without secrets

Existing website auth tests updated for new copy and dual password paths.

---

## Deferred (Phases 2–12)

| Phase | Item | Status |
|---|---|---|
| 2 | Richer profile completion wizard | Deferred — basic profile save already on Account |
| 3 | Phone verified UI beyond honest Unverified | Deferred — OTP not built; keep Unverified |
| 4 | Address book CRUD | Deferred — Coming Soon structure only if later |
| 5 | Orders tabs beyond existing /orders link | Deferred |
| 6 | Loyalty structure beyond Coming Soon card | Deferred |
| 7 | Notification prefs | Deferred — Coming Soon |
| 8 | Security center (sessions, devices) | Deferred — sign-in methods + password is enough for 4.5A |
| 9–12 | Journey polish / overbuild | Deferred — Phase 1 first |

**Explicitly out of scope (unchanged):** menu freeze 13/58/3/40/7, branches (2), WhatsApp 0304-1110495, order state machine, staff permissions, RLS, OTP provider, Rider/Kitchen/POS/Admin UI/ERP (Sprint 4.6+).

---

## Files changed (primary)

- `apps/website/client/src/lib/auth-utils.ts`
- `apps/website/client/src/contexts/AuthContext.tsx`
- `apps/website/client/src/pages/Account.tsx`
- `apps/website/client/src/pages/Register.tsx`
- `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`
- `tests/website/sprint-4-5a-customer-onboarding.test.mjs` (new)
- `tests/website/customer-auth-email-map.test.mjs`
- `tests/website/customer-identity-linking.test.mjs`

---

## Verification

- `pnpm check`
- Website auth tests including `sprint-4-5a-customer-onboarding.test.mjs`
- `pnpm build:website` (when run for PR)

**Do not merge/deploy without owner approval.**
