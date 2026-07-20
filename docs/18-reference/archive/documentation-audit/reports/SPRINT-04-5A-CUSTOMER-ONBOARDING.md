# Sprint 4.5A — Customer Identity & Onboarding Hardening

**Branch:** `feature/sprint-4-5a-customer-onboarding`  
**PR:** https://github.com/mianimr4n/telepizza/pull/57  
**Updated:** 2026-07-17  

---

## Already done (Phase 1 — prior commits on this PR)

| Item | Status |
|---|---|
| Google/OAuth first-time password: New + Confirm only → `updateUser({ password })` | ✅ |
| Email change-password: Current + New + Confirm → `current_password` | ✅ |
| Never ask for Google password; map Supabase “Current password required…” safely | ✅ |
| Account Created UX + Resend Email + Open Gmail + rate limit | ✅ |
| SMTP runbook (no secrets); app cannot fix delivery | ✅ |
| Phone E.164 save; `phoneVerified` always false until OTP | ✅ |
| Identity: no roles from OAuth metadata | ✅ |

---

## Newly shipped (Priority 2 Account Center — this continuation)

| Section | What shipped |
|---|---|
| **Overview** | Account Center dashboard tiles → Profile / Addresses / Security / Orders; loyalty & notifications teasers |
| **Profile** | Name + phone save; email read-only; honest **Unverified** phone copy |
| **Addresses** | Local device address book (add/remove); empty state; no GPS / no secrets |
| **Security** | Google / Email&password / Phone OTP wording; password attach/change flows preserved |
| **Orders** | Account link + **My Orders** tabs: Active / Completed / Cancelled (local order statuses) |
| **Loyalty** | Structured “not available yet” section (no fake points engine) |
| **Notifications** | Structured “not available yet” section (no fake prefs) |
| **Login polish** | Confirm-email reminder + Security path hint for Google users |
| **SMTP docs** | Owner go-live checklist at top of runbook |

---

## Deferred

| Item | Why |
|---|---|
| WhatsApp / phone OTP | Explicitly out of scope |
| Server-backed address book table | Local device store only for now |
| Loyalty engine / points earning | Structure only |
| Notification preference API | Structure only |
| Checkout auto-fill from saved addresses | Can wire later without inventing GPS |
| Rider / Kitchen / POS / Admin / Sprint 4.6 | Held per owner |

**Unchanged freezes:** menu 13/58/3/40/7, branches (2), WhatsApp 0304-1110495, order state machine, staff permissions, RLS.

---

## Owner SMTP actions still required

Application UX is ready; **delivery is owner/ops**:

1. Enable **custom SMTP** in Supabase Auth  
2. Publish **SPF / DKIM / DMARC** for the sender domain  
3. Confirm **Site URL** + **Redirect URLs** include `/auth/callback`  
4. Send a test confirmation and check Auth Logs  

See `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md` → **Owner go-live checklist**.

---

## Verification

- `pnpm check`
- `pnpm test:db` (website auth / 4.5A tests)
- `pnpm build:website`

**Do not merge/deploy without owner approval. Do not start Sprint 4.6.**
