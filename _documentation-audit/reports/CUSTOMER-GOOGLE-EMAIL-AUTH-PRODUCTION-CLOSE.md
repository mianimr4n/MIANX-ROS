# Customer Google + Email Auth — Production Close

**Date:** 2026-07-16  
**Scope:** Interim customer authentication (Google primary + email/password secondary)  
**Base:** PR #47 (merged `564e7d9`) + close hardening on `cursor/customer-google-email-auth-close-bf31`  
**Out of scope:** Slice 2C phone / WhatsApp OTP, staff public registration, catalog/order/deploy infra changes  

---

## Interim auth decision (locked until Slice 2C)

| Surface | Decision |
|---|---|
| Customer primary CTA | Continue with Google |
| Customer secondary path | Email / password |
| Staff auth | Invite-controlled email/password only |
| Public staff registration | None |
| Google OAuth | Keep enabled |
| Phone / SMS / WhatsApp OTP | Not implemented (Slice 2C) |

---

## Phase 1 — Audit (PR #47 + main)

| # | Check | Result |
|---|---|---|
| 1 | Google uses `signInWithOAuth({ provider: "google" })` | PASS |
| 2 | Redirect limited to this website (`/auth/callback`) | PASS (hardened) |
| 3 | Callback restores Supabase session (PKCE + `detectSessionInUrl`) | PASS |
| 4 | AuthContext applies same access token once (dedupe) | PASS (hardened) |
| 5 | `/account` after login without redirect loops | PASS |
| 6 | Email/password login still works | PASS |
| 7 | Register Google CTA + copy match behavior | PASS |
| 8 | No Google client secret in frontend / repo / bundle | PASS |
| 9 | No role / user_type / branch / permission from Google metadata | PASS |
| 10 | New Google customers get customer role via DB bootstrap only | PASS |
| 11 | Existing staff not silently converted to customers | PASS (upsert never changes `user_type`) |
| 12 | Logout clears Supabase session, preserves cart | PASS |
| 13 | Guest menu + checkout remain accessible | PASS |
| 14 | Login/Register customer-facing only | PASS |
| 15 | Staff invite acceptance unchanged | PASS |

---

## Phase 2 — Callback / redirect hardening

Implemented:

- Dedicated route: `/auth/callback` (`AuthCallback.tsx`)
- OAuth `redirectTo`: `${origin}/auth/callback`
- Safe internal destinations only (`/account`, `/checkout`, `/orders`, `/menu`, `/track`, `/order-success`)
- External / protocol-relative / callback / login `next` values rejected → `/account`
- Intended destination stored in `sessionStorage` (not an open redirect)
- Loading state while session restores; generic error on cancel/failure
- Provider/Supabase internals not shown to users

Approved origins (document for Supabase URL allowlist):

- `https://telepizza-website.vercel.app`
- `http://localhost:3000` (Vite port in this repo)
- `http://localhost:5173` (approved local alternate)

**Owner ops (required after deploy):** Supabase → Authentication → URL Configuration → Redirect URLs must include:

- `https://telepizza-website.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback`
- `http://localhost:5173/auth/callback`

Site URL should remain the production website origin.

---

## Phase 3 — Customer profile verification

Bootstrap: `ensure_customer_profile_for_auth_user` + `on_auth_user_created`  
Migration: `supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql`

After Google signup (verified by SQL + static tests + prior production smoke):

| Field | Source | Expected |
|---|---|---|
| `auth.users` | Supabase Auth | Exists |
| `public.users` | Trigger bootstrap | Exists |
| `public.users.auth_user_id` | `auth.users.id` | Match |
| `full_name` | `full_name` / `name` metadata or email local-part | Display only |
| `email` | `auth.users.email` | Stored |
| `user_type` | Literal `'customer'` | Never from metadata |
| `status` | Literal `'active'` | Never from metadata |
| Roles | Single global `customer` role | Exactly one; no privileged roles |
| Branches | None on customer bootstrap | No assignment |
| `public.customers` | Not invented | Not required for this path |

Spoofed `app_metadata.role` / `user_metadata.user_type` cannot grant staff privilege (API principal from DB only; covered by backend auth authorization tests).

Suspended/inactive: `/auth/me` returns `USER_ACCESS_DISABLED`; website clears session safely.

---

## Phase 4 — UI completion

- **Login:** Google first, “or sign in with email”, show/hide password, session loading, generic invalid credentials, Browse the menu
- **Register:** Google first, “or continue with email”, optional full name, show/hide password, strength copy, double-submit guard, generic signup errors
- **Account:** full name, email, provider label when available, “Phone can be added at checkout”, My Orders, Logout; Loyalty/Notifications clearly Coming Soon (no fake unread)

---

## Phase 5 — Password policy alignment

Frontend guidance matches production Supabase strength enforcement:

> At least 8 characters, including uppercase, lowercase, a number, and a symbol.

Pre-submit validation via `validatePasswordStrength` / `validateSignupInput`.  
Provider errors remapped to the same guidance; raw provider internals suppressed.  
Production password policy was not weakened.

---

## Phase 6 — Security / regression commands

```text
pnpm install --frozen-lockfile   PASS
pnpm check                       PASS
pnpm test:db                     PASS (68)
pnpm test:backend                PASS (78)
pnpm build:website               PASS
git diff --check                 PASS
```

Additional static suite: `tests/website/customer-google-email-auth.test.mjs`  
Covers redirects, OAuth callback, cancellation errors, password strength, no client secret, bootstrap/metadata trust, catalog/branch guards, staff invite path presence.

Catalog freeze (13 / 58 / 3 / 40 / 7) and 2 branches remain untouched (no migrations in this close).

---

## Phase 7 — Ship notes

- PR #47 already delivered the initial Google + login polish merge.
- This close adds callback hardening, safe redirects, UI completion, password alignment, and the production-close report.
- No database migration required.
- No Render/backend deploy required (website-only).

### Production smoke checklist (owner)

- [ ] Google register/login → `/auth/callback` → `/account`
- [ ] Email/password login
- [ ] Session refresh (reload `/account`)
- [ ] Logout (cart preserved)
- [ ] Guest menu + guest checkout
- [ ] Staff invite acceptance still works
- [ ] No privileged role on new Google customer

---

INTERIM CUSTOMER AUTH — GOOGLE + EMAIL: PASS AND CLOSED
