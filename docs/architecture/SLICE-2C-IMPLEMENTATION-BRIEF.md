# Sprint 3 Slice 2C — Pre-Implementation Brief

**Status:** Architecture complete · **D11 APPROVED** · Engineering **PAUSED** pending 2C.0 READY  
**Date:** 2026-07-16  
**Baseline:** `main` with Slice 2B CLOSED (`8527f28`)  
**Canonical SSOT:** `docs/architecture/AUTHENTICATION_ARCHITECTURE.md`  
**Full freeze doc:** `docs/architecture/CUSTOMER_PHONE_OTP_ARCHITECTURE.md`  
**Ops readiness:** `docs/architecture/SLICE-2C0-OTP-OPERATIONS-READINESS.md` (**BLOCKED** on Meta/Twilio)  
**Parallel track:** `docs/architecture/SPRINT-04-ORDERS-BACKEND-PLANNING.md`  
**Implementation branch (after 2C.0 READY + authorization only):** `feature/sprint-3-customer-phone-otp`

OTP technical architecture is complete. **Do not start 2C.1+ coding while provider onboarding is in progress.** Prefer parallel **Orders Backend planning**.

---

## 0. Baseline confirmation

| Item | Status |
|---|---|
| Slice 2B staff invites closed | ✅ |
| DB-backed `AuthPrincipal` | ✅ |
| Customer permissions empty | ✅ |
| Staff email/password preserved | ✅ |
| Google OAuth disabled | ✅ |
| Catalog freeze v1.2.0 | ✅ |
| Ordering WhatsApp `0304-1110495` (`wa.me`) | ✅ Locked BFR-013 — must not break |
| Slice 2C code started | ❌ Not started (correct) |

---

## 1. Goal

Ship **customer phone OTP** authentication for the Telepizza website (Pakistan mobiles) with:

1. **WhatsApp OTP** — primary / default channel  
2. **SMS OTP** — explicit fallback  
3. **Email/password** — temporary pilot fallback  

…without weakening staff invite security, without granting staff privileges via OTP, and without disrupting WhatsApp ordering on **0304-1110495**.

### Trust model (unchanged)

```text
Bearer JWT → getUser → AuthPrincipal (DB) → requirePermission / requireBranchAccess
```

### Delivery order (locked)

```text
WhatsApp OTP  →  SMS OTP  →  Email/password (pilot)
```

---

## 2. In scope vs out of scope

### In scope (after 2C.0 READY + approval)

- Phone normalize (`03…` → `+923…`)  
- Twilio Verify via Supabase Phone Login  
- `signInWithOtp` with `channel: "whatsapp"` (primary) and `"sms"` (fallback)  
- Same-phone identity across channels (no duplicate accounts)  
- Meta authentication templates only (never free-form OTP)  
- Customer-only bootstrap + `public.users.phone` sync  
- Explicit email-only account linking (D6)  
- Staff phone conflict refusal  
- Rate limits / lockout / CAPTCHA  
- Delivery webhook + latency tracking foundations  
- Website UI: **Send code on WhatsApp** / **Resend on WhatsApp** / **Send via SMS**  
- Tests + Multan pilot smoke  

### Out of scope (hard stop)

- Migrating **0304-1110495** onto WhatsApp Cloud API without a separate ordering redesign  
- Free-form WhatsApp OTP messages  
- Slice 2D order/branch RLS  
- Admin / POS / Kitchen / Rider apps  
- Menu / pricing / catalog / toppings  
- Google OAuth  
- Silent customer↔staff conversion  
- Staff auth / Slice 2B behavior changes  

---

## 3. Recommended product defaults

| Default | Value |
|---|---|
| Provider (pilot) | Twilio Verify (WhatsApp primary + SMS fallback) |
| Auth WhatsApp sender | **Dedicated** Telepizza WABA number (recommended) |
| Ordering WhatsApp | Keep **0304-1110495** on `wa.me` (unchanged) |
| Numbers | Pakistan only |
| Canonical store | `+923XXXXXXXXX` |
| UI input | `03XXXXXXXXX` |
| OTP expiry | 10 minutes |
| Resend | ≥60s; 3/hour; 10/day |
| Lockout | 5 fails → 15 min |
| Customer role | Auto `customer` only |
| Email/password | Keep during pilot (D8) |
| CAPTCHA | Required in production (D9) |
| Staff path | Unchanged |

---

## 4. Implementation slices (execution order)

| ID | Deliverable | Depends on |
|---|---|---|
| 2C.0 | Ops: Twilio Verify + dedicated WABA auth sender + Meta auth template + CAPTCHA | D1, D7, D11 |
| 2C.1 | DB: bootstrap phone sync + audit/rate + webhook foundations | D2–D5 |
| 2C.2 | Website: Send/Resend WhatsApp + SMS fallback + AuthContext | 2C.1 |
| 2C.3 | Linking + staff phone conflict | D6 |
| 2C.4 | Abuse controls + Multan WA/SMS smoke + latency | D9 |
| 2C.5 | Optional default cutover | D10 |

---

## 5. API / client sketch (not implemented)

| Action | Mechanism |
|---|---|
| Send WhatsApp OTP | `supabase.auth.signInWithOtp({ phone, options: { channel: "whatsapp" } })` |
| Resend WhatsApp | Same, after ≥60s cooldown |
| Send SMS fallback | `signInWithOtp({ phone, options: { channel: "sms" } })` |
| Verify OTP | `verifyOtp({ phone, token, type: "sms" })` — **channel-agnostic** |
| Session | Existing AuthContext + `GET /auth/me` |
| Staff | Existing email + invite accept |

Optional thin API wrappers for rate-limit/audit/webhooks beyond Supabase — decide in 2C.1 design review.

**Invariant:** WhatsApp and SMS verify the same E.164 identity; switching channels must not create duplicate accounts.

---

## 6. Security checklist (must pass before merge)

- [ ] OTP cannot assign staff roles  
- [ ] Staff invite regression PASS  
- [ ] Spoof headers ineffective  
- [ ] No OTP codes in logs/audit/webhooks retained by app  
- [ ] OTP only via Meta authentication templates (no free-form)  
- [ ] Ordering `wa.me` **0304-1110495** regression PASS  
- [ ] Phone uniqueness conflicts safe  
- [ ] WA↔SMS channel switch does not duplicate users  
- [ ] Catalog 58/13 untouched  
- [ ] Customer permissions remain `[]`  

---

## 7. Owner decision card (blocking)

Authoritative card also in `CUSTOMER_PHONE_OTP_ARCHITECTURE.md`:

| ID | Question | Decision | Owner |
|---|---|---|---|
| **D1** | Provider / primary channel? | Twilio Verify — **WhatsApp primary** | ✅ OVERRIDE |
| **D2** | PK numbers only? | Yes | ✅ |
| **D3** | OTP expiry? | 10 min | ✅ |
| **D4** | Resend / caps? | ≥60s; 3/hour; 10/day | ✅ |
| **D5** | Verify lockout? | 5 fails → 15 min | ✅ |
| **D6** | Email-only linking? | Explicit (no silent merge) | ✅ |
| **D7** | WhatsApp OTP in v1? | **Yes — default channel** | ✅ OVERRIDE |
| **D8** | Keep email login during pilot? | Yes | ✅ |
| **D9** | CAPTCHA in production? | Yes | ✅ |
| **D10** | Phone OTP as default CTA? | After Multan pilot PASS | ✅ |
| **D11** | Auth sender number? | **Dedicated WABA OTP sender**; **Telepizza Login**; keep 0304-1110495 ordering-only | ✅ APPROVED |

**Complete 2C.0 OWNER/PROVIDER checklist before any implementation branch is created.**

---

## 8. Agent stop line

Until 2C.0 READY + implementation authorization:

- Do **not** create `feature/sprint-3-customer-phone-otp`  
- Do **not** write migrations, provider secrets, or UI  
- Do **not** open an implementation PR  
- Do **not** start Slice 2D  
- Do **not** put OTP on free-form WhatsApp or on the ordering number  

**Stop here — OTP engineering PAUSED. Continue Sprint 4 Orders Backend planning (`SPRINT-04-ORDERS-BACKEND-PLANNING.md`).**
