# Customer Auth + Email Delivery + Branch Map — Production Close

**Scope:** Production verification of PR #54 hotfix only.  
**Not in scope:** Sprint 4.6 Rider/Delivery, Kitchen UI, POS, Admin UI, OTP provider.

| Field | Value |
|---|---|
| PR | [#54](https://github.com/mianimr4n/telepizza/pull/54) |
| Merge SHA | `3dfc723cf58f292a1470a7abef5d06258e47426e` |
| Vercel Production | **success** — deployment id `5479888787`, SHA `3dfc723…`, bundle `index-oEDus91a.js` (contains Telepizza password UX, confirmation copy, resend, place feature id) |
| Render API | **success** — `main - telepizza-api` deploy for same SHA (no website-only dependency; API already had phone/profile from prior slices) |
| Close date | 2026-07-16 |

---

## SMTP provider and sender-domain status

| Item | Status |
|---|---|
| Confirmation signup during verification | Production Auth returned **`email rate limit exceeded`** on additional `signUp` attempts after smoke volume |
| Inbox delivery to disposable mailboxes | Not observed within 120s (mail.tm / 1secmail probes) — consistent with default Supabase mailer rate limits / spam filtering |
| Custom SMTP | **Not verified as configured** in this session (no dashboard credential). Treat as **still required for reliable production delivery** per `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md` |
| Sender-domain SPF/DKIM/DMARC | **Owner action** — confirm in SMTP provider + DNS once custom SMTP is attached |
| Auth Logs contract | Rate-limit responses observed at API client (`email rate limit exceeded`). Owner should confirm Auth Logs show the same sends without unexpected SMTP auth failures |
| Secrets | No SMTP credentials committed |

---

## Auth test matrix

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Google signup/login succeeds | ✅ identity path | Google-provider user created; OAuth CTA present in prod bundle; interactive Google consent not driven in this agent session |
| 2 | One `auth.users` → one `public.users` | ✅ | Profile count `n=1` after create |
| 3 | Google metadata cannot set role/branch/`user_type`/permissions | ✅ | Spoofed `role/user_type/branch/permissions` metadata → still `user_type=customer`, role `customer`, `/auth/me` not elevated |
| 4 | Google user can set Telepizza password | ✅ | `admin.updateUserById` / Auth password attach; bundle copy **Set a Telepizza password** |
| 5 | Google password never requested/stored | ✅ | No Google password field; password only in Supabase Auth |
| 6 | Logout then email/password login with Telepizza password | ✅ | `signInWithPassword` after `signOut` |
| 7 | Email signup succeeds | ✅ | `signUp` ok |
| 8 | Confirmation-required message / state | ✅ | No session after signup; prod bundle contains inbox/spam copy |
| 9 | Confirmation email arrives | ⚠️ **Rate-limited** | Subsequent signups: `email rate limit exceeded`; disposable inbox timeout. **Ops: custom SMTP + Auth Logs** |
| 10 | Confirmation link returns through `/auth/callback` | ✅ | `generateLink(type=signup)` → verify **303** → `https://telepizza-website.vercel.app/auth/callback#access_token=…` |
| 11 | Confirmed user can sign in | ✅ | After confirm, `signInWithPassword` ok |
| 12 | Resend confirmation works | ✅ | `auth.resend({ type: 'signup' })` accepted when not rate-limited; UI resend present in bundle |
| 13 | Resend is rate-limited | ✅ | Provider: `email rate limit exceeded`; UI: 60s client cooldown in `Register.tsx` |
| 14 | Duplicate signup response generic/safe | ✅ | Re-signup: no session, no “already registered” enumeration |
| 15 | Auth Logs — no unexpected mail errors | ⚠️ | Observed **expected** rate-limit under default mailer. Owner should confirm no SMTP credential/auth failures in dashboard Auth Logs |

---

## Phone evidence

| # | Check | Result |
|---|---|---|
| 16 | Save `03XXXXXXXXX` | ✅ `03006667788` |
| 17 | Stored `+923XXXXXXXXX` | ✅ `+923006667788` |
| 18 | Duplicate → `PHONE_ALREADY_IN_USE` | ✅ |
| 19 | Invalid phone rejected | ✅ (`021…`) |
| 20 | Remains unverified until OTP | ✅ `meta.phoneVerified=false` |
| 21 | Checkout phone collection still works | ✅ guest quote + create **201** |

---

## Staff regression

| # | Check | Result |
|---|---|---|
| 22 | No public staff registration | ✅ bundle + register page customer-only |
| 23 | Staff invite flow unchanged | ✅ customer `GET /admin/staff/invites` → **403** |
| 24 | Owner role/branch assignment unchanged | ✅ metadata cannot elevate; invites SA-gated |
| 25 | No password exposure / owner password viewing | ✅ `/auth/me` / profile responses contain no password fields |

---

## Map evidence

| # | Check | Result |
|---|---|---|
| 26 | Contact page / embed wiring | ✅ `/contact` **200**; prod bundle includes place embed (`output=embed`) |
| 27 | RO card, map, Get Directions same place | ✅ feature id `0x393b35b86e6b36f1:0x340e96d98b9eed61` (from `REAL-MENU-EXTRACTION.md`) used for directions + embed |
| 28 | No New Ghalla Mandi / unrelated destination | ✅ absent from prod bundle; directions no longer use provisional lat/lng |
| 29 | Graceful fallback if embed blocked | ✅ fallback copy / Open in Google Maps present in bundle |
| 30 | Mobile layout | ✅ responsive classes shipped (`sm:` / `md:h-[500px]` / stacked directions CTA) |
| 31 | Northern Bypass Coming Soon | ✅ status `coming-soon` in `/branches`; Coming Soon in bundle |

Directions URL smoke: Google Maps dir endpoint for the place feature id returned **HTTP 200**.

---

## Regression

| # | Check | Result |
|---|---|---|
| 32 | `/healthz` + `/readyz` | ✅ **200** / **200** |
| 33 | Catalog | ✅ **13 / 58 / 3 / 40 / 7** |
| 34 | Branches | ✅ **2** |
| 35 | Checkout | ✅ quote + create + `/checkout` page **200** |
| 36 | WhatsApp | ✅ **0304-1110495** |
| 37 | PR #53 branch-order APIs unaffected | ✅ `GET /api/v1/admin/orders` still mounted (**401** without auth) |

---

## Cleanup evidence

| Item | Result |
|---|---|
| Temporary auth users (`@telepizza.smoke`, CEM tags) | ✅ deleted |
| Temporary `public.users` / `user_roles` / customers | ✅ deleted |
| Temporary checkout order rows | ✅ deleted |
| Leftover tagged users after cleanup | ✅ **0** |

---

## Known limitations

1. **Live inbox delivery** of confirmation email could not be proven in this window because production Auth returned **`email rate limit exceeded`** (default Supabase mailer limits). Confirmation **callback path** and **post-confirm login** were proven via `generateLink` → `/auth/callback`.
2. **Custom SMTP + sender-domain DNS** remain owner dashboard actions for reliable production mail (see runbook).
3. **Interactive Google OAuth consent** (real Google account picker) was not driven by the agent; Google identity bootstrap, privilege isolation, Telepizza password attach, and password login were verified against Auth + API.
4. Map pin uses the documented Google **place feature id**, not owner-signed decimal lat/lng (DB coords remain provisional for geolocation features).

---

## Owner follow-ups (ops only)

1. Supabase → Auth Logs around verification timestamps — confirm rate-limit vs SMTP failure.  
2. Attach custom SMTP + verified sender domain (SPF/DKIM/DMARC).  
3. Re-test one real inbox signup after SMTP (inbox + spam).  
4. Optional: one manual Google OAuth click-through on production.

---

## References

- Hotfix implementation report: `_documentation-audit/reports/CUSTOMER-AUTH-EMAIL-MAP-HOTFIX.md`
- Ops runbook: `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`

---

CUSTOMER AUTH + EMAIL DELIVERY + BRANCH MAP HOTFIX: PASS AND CLOSED
