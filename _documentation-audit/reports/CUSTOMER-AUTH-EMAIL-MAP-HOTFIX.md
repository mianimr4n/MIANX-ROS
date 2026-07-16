# Customer auth + email delivery + branch map hotfix

| Field | Value |
|---|---|
| Branch | `fix/customer-auth-email-map` |
| Base | `main` @ latest |
| Scope | Focused production bug-fix — **not** Sprint 4.5 / PR #53 |
| Date | 2026-07-17 |

---

## Summary

Hardened customer identity UX (Google + email confirmation + phone status), documented confirmation-email operations, and fixed Contact map/directions to use the documented Royal Orchard Google Maps place feature ID (same source as card + directions). Northern Bypass stays Coming Soon.

---

## Root cause — missing confirmation email

Application gaps contributed to poor recovery UX, but **delivery failure is primarily an infrastructure / Supabase mailer issue**:

1. **App:** signup previously omitted `emailRedirectTo`; no customer **Resend confirmation** path.
2. **Ops:** production confirmation mail depends on Supabase Auth + (for reliable delivery) **custom SMTP** and a verified sender domain. Default Supabase SMTP is rate-limited and often lands in spam or fails under load.
3. **Dashboard:** Site URL / Redirect URLs must include `{website}/auth/callback`.

Owner must verify Auth Logs + SMTP (see `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`). **No SMTP secrets were added to the repo.**

---

## SMTP / dashboard owner actions

1. Supabase → Authentication → confirm email enabled  
2. Site URL = production website; Redirect URLs include `/auth/callback` (prod + localhost)  
3. Configure **custom SMTP** with SPF/DKIM/DMARC on the sender domain  
4. Auth Logs smoke after a fresh signup + Resend  
5. Do not commit credentials

---

## Identity behavior

| Rule | Status |
|---|---|
| One `auth.users` ↔ one `public.users` customer profile | Preserved (`ensure_customer_profile_for_auth_user`) |
| Google OAuth metadata → name/email/avatar only | Preserved; never role/user_type/branch |
| Google password never requested | Preserved; Account offers **Set a Telepizza password** via `updateUser` |
| Public signup = customer only | Preserved |
| Staff invite-only | Unchanged |
| Email signup confirmation UX | Generic success + spam copy; rate-limited resend; no login before confirm when required |

---

## Phone behavior

| Rule | Status |
|---|---|
| `03XXXXXXXXX` → `+923XXXXXXXXX` | Unchanged (website + API) |
| Status Unverified / Verified | Account shows status; verified remains false until WhatsApp OTP |
| Checkout collects phone | Unchanged (name + phone required at submit) |
| Duplicate phone | Safe `PHONE_ALREADY_IN_USE` message |
| Client cannot set role/branch | Unchanged (`.strict()` PATCH) |

---

## Map data source

| Item | Source |
|---|---|
| Operating branch card | Active/selected operating branch record |
| Embed + Get Directions | Documented Google place feature ID `0x393b35b86e6b36f1:0x340e96d98b9eed61` from `REAL-MENU-EXTRACTION.md` §2 (Telepizza, Royal Orchard, Multan) |
| Provisional lat/lng in seed/fallback | **Not used** for Contact directions (avoids unrelated pins such as New Ghalla Mandi) |
| Northern Bypass | Coming Soon — no map/directions as operating |
| Embed blocked | Fallback card with place/directions links |

**Owner input still useful (optional):** confirm decimal lat/lng for DB/geolocation features separately; Contact no longer depends on inventing them.

---

## Files changed (high level)

- `apps/website/client/src/contexts/AuthContext.tsx` — `emailRedirectTo`, `resendConfirmationEmail`, `phoneVerified`
- `apps/website/client/src/pages/Register.tsx` — confirmation + resend UX
- `apps/website/client/src/pages/Account.tsx` — Telepizza password copy, phone status
- `apps/website/client/src/lib/auth-redirect.ts`, `auth-utils.ts`
- `apps/website/client/src/lib/branch-locations.ts` — place ID helpers
- `apps/website/client/src/components/BranchMapEmbed.tsx`
- `apps/website/client/src/pages/Contact.tsx`
- `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`
- `tests/website/customer-auth-email-map.test.mjs` (+ identity test copy updates)

---

## Tests / validation

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm test:db`
- `pnpm test:backend`
- `pnpm build:website`
- `git diff --check`

Coverage includes Google identity, OAuth privilege isolation, Telepizza password attach, confirmation/resend, phone, staff registration impossible, map place ID + fallback, catalog/branches freeze, PR #53 out of scope on this base.

---

## Delivery

- Commits: auth → contact → tests → docs (as planned)
- One PR — **do not merge / do not deploy** without owner approval
- PR #53 untouched
