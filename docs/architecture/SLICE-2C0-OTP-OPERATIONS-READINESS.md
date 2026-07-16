# Sprint 3 Slice 2C.0 — OTP Provider & Operations Readiness

**Status:** **PAUSED (engineering)** · OPS readiness complete as plan · **D11 APPROVED** · WhatsApp-first  
**Date:** 2026-07-16  
**Baseline:** Slice 2B CLOSED (`8527f28`); D1–D11 locked  
**Parent docs:** `CUSTOMER_PHONE_OTP_ARCHITECTURE.md`, `SLICE-2C-IMPLEMENTATION-BRIEF.md`  
**Parallel work:** `docs/architecture/SPRINT-04-ORDERS-BACKEND-PLANNING.md` (authorized while OTP waits on Meta/Twilio)  
**Scope:** Provider + operations readiness **ONLY** — **no Slice 2C.1+ code until READY**

```text
✅ D1–D11 locked (WhatsApp-first + dedicated Telepizza Login sender)
✅ Technical architecture complete
⏳ OPS blockers: Meta / dedicated WABA / Twilio Verify / auth template / CAPTCHA / pilot
        ↓
⏸ Pause OTP engineering (do not idle developers)
        ↓
▶ Parallel: Sprint 4 Orders Backend planning
        ↓
When provider READY → resume Slice 2C.1 implementation
```

**Hard stops (until READY):** no OTP code · no OTP migrations · no Login/Register OTP UI · no send/verify endpoints · no staff/2B changes · no secret values · no OTP deploy · **do not migrate 0304-1110495** · auth template draft only until owner submits

**Action tags used below:**

| Tag | Meaning |
|---|---|
| **OWNER ACTION** | Telepizza owner / ops must decide or supply |
| **PROVIDER ACTION** | Meta / Twilio / CAPTCHA vendor / carrier console work |
| **ENGINEERING ACTION** | Repo/app work (starts only after 2C.0 READY + authorization) |

---

## 0. Locked decisions

| ID | Decision | State |
|---|---|---|
| D1 | Twilio Verify — **WhatsApp primary** for Multan pilot | ✅ |
| D2 | Pakistan numbers only (`03…` / `+923…`) | ✅ |
| D3 | OTP expiry **10 minutes** | ✅ |
| D4 | Resend ≥ **60s**; **3/hour** and **10/day** per phone (+ device/IP) | ✅ |
| D5 | **5** failed verifies → **15 min** lockout | ✅ |
| D6 | Explicit linking for email-only customers | ✅ |
| D7 | WhatsApp OTP **in V1** as **default** OTP channel | ✅ |
| D8 | Email/password **temporary pilot fallback** | ✅ |
| D9 | CAPTCHA required in production | ✅ |
| D10 | Phone default CTA only after pilot PASS | ✅ |
| **D11** | Keep **0304-1110495** exclusively for ordering / support / branch / future marketing; **dedicated** WhatsApp Business API number for OTP only; display name **Telepizza Login**; **never** use ordering number for authentication OTP; **do not migrate or modify** ordering number | ✅ **APPROVED** (final owner lock) |

### Locked customer login architecture

```text
Customer Login
Phone
   │
   ▼
WhatsApp OTP (Primary)
   │
   ├── Success → Customer Logged In
   │
   └── Timeout / Failure
          ▼
SMS OTP (Fallback)
          │
          ├── Success → Customer Logged In
          │
          └── Failure
                 ▼
Email/Password (Temporary Pilot Only)
```

### WhatsApp number strategy (LOCKED)

| Number | Purpose | OTP? |
|---|---|---|
| **0304-1110495** | Customer orders, support, branch communication, future marketing | **NEVER** |
| **New dedicated WABA number** (“Telepizza Login”) | Login OTP, registration OTP, password recovery, security verification **only** | **YES** |

**Reason (owner):** Restaurant WhatsApp ordering is core. Migrating the ordering number onto Meta Cloud API / Twilio Verify can disrupt ordering workflow, existing chats, and support. Keeping authentication fully separate simplifies future maintenance.

### Template policy

- Meta **Authentication** templates only  
- Never free-form WhatsApp OTP  

---

## 1. Current production Auth inspection (unchanged gap)

**Project:** `pyeowxvacgypohrbvgee` · inspected 2026-07-16 (secrets redacted)

| Setting | Production today | 2C.0 target |
|---|---|---|
| `external_phone_enabled` | `false` | `true` |
| Provider | unset Verify | **Twilio Verify** |
| Verify SIDs / token | unset | set in Supabase Dashboard |
| WhatsApp BYO sender | unset | **Dedicated OTP sender** (≠ 0304-1110495) |
| `sms_otp_exp` | `60` s | **`600` s** |
| `sms_max_frequency` | `5` s | ≥ **`60` s** |
| CAPTCHA | disabled | **Cloudflare Turnstile** (see §6) |
| Email auth | enabled | keep (D8) |
| `site_url` | `http://localhost:3000` | production website origin |

Ordering path **0304-1110495** / `wa.me` must remain untouched.

---

## 2. Dedicated OTP number — exact requirements

**OWNER ACTION** unless noted.

### 2.1 Pakistan compatibility

| Requirement | Spec |
|---|---|
| Country | **Pakistan** mobile preferred for Multan customer trust |
| Format once registered | E.164 **`+923XXXXXXXXX`** on WABA / Twilio |
| Reachability | Must support WhatsApp Business Platform (Cloud API) via Meta + Twilio |
| Customer-facing brand | Display name **Telepizza Login** (or owner-approved auth identity) |
| Separation | **Must not** be **0304-1110495** or any alias of the ordering line |

### 2.2 Consumer WhatsApp status (critical)

| Rule | Why |
|---|---|
| Number **must not already be active** on consumer WhatsApp / WhatsApp Business **App** unless an intentional Cloud API migration is planned | Migrating an in-use consumer number **disrupts** existing chats and is a different project |
| For Telepizza OTP: choose a **new / unused** number (or a number already owned but **not** used for customer chat) | Avoid chat loss and ordering confusion |
| Do **not** “share” the ordering SIM’s WhatsApp session | Violates D11 |

**OWNER ACTION:** Procure or designate a **fresh** PK mobile (or Twilio/host-capable number approved for PK WhatsApp) that is **not** registered to consumer WhatsApp for Telepizza ops.

### 2.3 Ownership & verification documents

Typical Meta / carrier pack for a Pakistan business (exact list can vary; prepare early):

| Document / proof | Purpose |
|---|---|
| Business legal name matching Telepizza Pakistan entity | Meta Business verification |
| NTN / tax registration (or equivalent) | Business identity |
| Proof of address | Business Manager verification |
| Government-issued ID of admin | Business Manager admin verification |
| Domain ownership / website (telepizza site) | Brand authenticity |
| Phone ownership proof (SIM ownership / telecom bill / provider allocation letter) | Sender registration |
| Brand authorization if display name ≠ legal name | Display-name approval |

**OWNER ACTION:** Assemble document pack before Meta verification submission.

### 2.4 Meta Business Manager prerequisites

| Prerequisite | Notes |
|---|---|
| Meta Business Manager account controlled by Telepizza | Not a personal-only ad account |
| Business verification **in progress or complete** | Often required before meaningful messaging limits |
| WhatsApp Business Account (**WABA**) under that BM | Dedicated for Telepizza (or shared BM with clear WABA separation) |
| Admins with 2FA | Security baseline |
| Payment method on Meta (if required for WABA) | Depends on BSP / region path |

**OWNER ACTION** + **PROVIDER ACTION** (Meta review queues).

### 2.5 Twilio sender onboarding prerequisites

| Prerequisite | Notes |
|---|---|
| Twilio account with Verify enabled | International SMS + WhatsApp Verify |
| Ability to create **WhatsApp Sender** (Messaging → WhatsApp Senders) | Self-signup / Embedded Signup with Meta |
| **Bring Your Own** sender linked to Verify Service | Required since generic Verify WA sender deprecated |
| Verify Service with Fraud Guard ON | Anti-pumping |
| SMS channel enabled on same Verify Service | Fallback |
| Status callback URL plan | For delivery/latency (§8) — URL may be Render later |

**OWNER ACTION** (account ownership) · **PROVIDER ACTION** (Twilio/Meta Embedded Signup) · **ENGINEERING ACTION** (callback URL only after 2C.1 authorized).

---

## 3. Exact onboarding checklist

Mark progress in ops runbook; do **not** put secrets in git.

### 3.1 Meta Business verification

| Step | Action tag | Done |
|---|---|---|
| Create/claim Meta Business Manager for Telepizza | OWNER | ☐ |
| Add business details + legal docs | OWNER | ☐ |
| Submit Business Verification | OWNER → PROVIDER (Meta) | ☐ |
| Verification status = **Verified** (or accepted for WABA start per Meta rules) | PROVIDER | ☐ |
| Enable admin 2FA | OWNER | ☐ |

### 3.2 WhatsApp Business Account (WABA)

| Step | Action tag | Done |
|---|---|---|
| Create WABA under Telepizza BM (OTP / auth purpose) | OWNER / PROVIDER | ☐ |
| Confirm WABA is **not** tied to ordering number 0304-1110495 | OWNER | ☐ |
| Accept WhatsApp Business Terms | OWNER | ☐ |

### 3.3 Dedicated sender registration

| Step | Action tag | Done |
|---|---|---|
| Procure unused PK-capable number for OTP only | OWNER | ☐ |
| Confirm number **not** active on consumer WhatsApp | OWNER | ☐ |
| Register number as WhatsApp Sender via Twilio Embedded Signup / console | OWNER + PROVIDER | ☐ |
| Complete SMS/voice ownership verification challenges for the number | OWNER + PROVIDER | ☐ |
| Confirm sender status = available / online | PROVIDER | ☐ |
| **Regression:** ordering `wa.me/923041110495` still works | OWNER | ☐ |

### 3.4 Display-name approval

| Step | Action tag | Done |
|---|---|---|
| Request display name **Telepizza Login** (or approved auth identity) | OWNER | ☐ |
| Await Meta display-name approval | PROVIDER | ☐ |
| Confirm customers will see auth brand (not ordering chat name confusion) | OWNER | ☐ |

### 3.5 Twilio Verify WhatsApp integration

| Step | Action tag | Done |
|---|---|---|
| Create Verify Service `Telepizza Multan OTP` | OWNER | ☐ |
| Enable WhatsApp + SMS channels; Fraud Guard ON; TTL 10 min if exposed | OWNER | ☐ |
| Attach BYO WhatsApp Sender to Verify | OWNER + PROVIDER | ☐ |
| Confirm Meta Authentication template available for sender (Twilio may auto-create) | PROVIDER | ☐ |
| Align template expiry wording to **10 minutes** (D3) | OWNER + PROVIDER | ☐ |
| Enable Supabase Phone = Twilio Verify; paste SIDs/token in **Dashboard only** | OWNER | ☐ |
| Set Supabase `sms_otp_exp=600`, `sms_max_frequency≥60` | OWNER | ☐ |
| Configure status callbacks (see §8) | OWNER + ENGINEERING (URL later) | ☐ |
| Send 1 internal WA test OTP to owner phone (ops smoke, not app UI) | OWNER | ☐ |
| Send 1 internal SMS fallback test | OWNER | ☐ |

---

## 4. Meta authentication template — **DRAFT ONLY (do not submit in this phase)**

**Action tag:** OWNER reviews copy · PROVIDER submits later · ENGINEERING does not hardcode free-form messages.

Meta Authentication templates have **restricted / often fixed body** text. Twilio Verify commonly **auto-creates** Copy Code authentication templates for BYO senders. Use the following as the Telepizza **intent spec** when configuring or reviewing the auto-created template.

### 4.1 Intent

| Field | Value |
|---|---|
| Category | **AUTHENTICATION** only |
| Purpose | OTP login for Telepizza website customers |
| Language (V1) | **English first** |
| Urdu | Optional later (do not block pilot) |
| Marketing language | **Forbidden** |
| Free-form OTP | **Forbidden** |
| Copy Code button | **Required** where supported |
| Code expiry | **10 minutes** (align D3) |
| Security recommendation line | Prefer **ON** (“For your security, do not share this code”) if template builder exposes it |

### 4.2 Draft customer-visible meaning (English)

> Your Telepizza Login code is {{1}}.  
> This code expires in 10 minutes.  
> Do not share this code with anyone.  
> [Copy code]

*(Exact body may be Meta-fixed; ensure variables = OTP only, expiry = 10 minutes, button = Copy code.)*

### 4.3 Explicitly disallowed

- Offers, deals, menu, “order now”, promo URLs  
- Ordering instructions or branch phone **0304-1110495** inside OTP template  
- Asking users to reply on WhatsApp with the code  
- Any non-authentication category template used for OTP  

### 4.4 Submission gate

| Step | Tag | Done |
|---|---|---|
| Owner approves English intent above | OWNER | ☐ |
| Submit / accept Twilio–Meta auth template in console | PROVIDER + OWNER | ☐ **Not in this doc phase** |
| Template status = **Approved** | PROVIDER | ☐ |
| Optional Urdu auth template | OWNER (later) | ☐ |

---

## 5. SMS fallback requirements & Pakistan delivery checks

### 5.1 Product requirements

| Requirement | Spec |
|---|---|
| Trigger | User taps **Send via SMS**, or WhatsApp send fails / number not on WhatsApp |
| Identity | Same canonical `+923…` as WhatsApp path |
| Code | Prefer same Verify session code when Twilio allows multi-channel; never create second auth user |
| Rate limits | SMS counts toward **3/hour** and **10/day** with WhatsApp |
| Resend floor | ≥ **60s** between sends (any channel) |
| UI copy | Clear that SMS is fallback, not primary |

**ENGINEERING ACTION** (2C.2+): implement channel switch without duplicate accounts.

### 5.2 Pakistan delivery checks (pilot)

| Check | Tag | Pass criteria |
|---|---|---|
| Jazz SMS OTP received | OWNER | Delivered ≤60s P95 target |
| Zong SMS OTP received | OWNER | Same |
| Telenor SMS OTP received | OWNER | Same |
| Ufone SMS OTP received | OWNER | Same |
| From ID acceptable (may be rewritten / generic) | OWNER | User can still read code |
| Non-PK number rejected | ENGINEERING (later) + OWNER policy | Blocked before send |
| SMS after WA failure does not duplicate `auth.users` | ENGINEERING + OWNER smoke | Same user |

### 5.3 PTA / branded SMS

| Path | Need PTA mask? |
|---|---|
| Multan pilot SMS via Twilio international | Usually **no** branded PTA mask |
| National SMS-primary later | Re-evaluate PTA aggregator |

**OWNER ACTION:** Accept possible non-branded SMS From for pilot.

---

## 6. CAPTCHA recommendation for V1 — **Cloudflare Turnstile**

**Recommendation:** **Cloudflare Turnstile** (not hCaptcha) for Telepizza V1.

| Criterion | Why Turnstile |
|---|---|
| Supabase Auth support | Supported as Auth CAPTCHA provider |
| UX | Often invisible / low friction vs puzzle CAPTCHAs |
| Privacy | Fewer third-party trackers; better fit than challenge farms |
| Cost | Free tier typically sufficient for Multan pilot; paid only at large abuse scale |
| Ops | Simple site key + secret key model |

*(Production Auth currently shows CAPTCHA disabled with provider label `hcaptcha` — switch provider to Turnstile when enabling.)*

### 6.1 Frontend keys

| Item | Where | Tag |
|---|---|---|
| Turnstile **site key** (public) | Vercel `VITE_CAPTCHA_SITE_KEY` (or Supabase-documented client integration) when Login UI ships | ENGINEERING (2C.2+) |
| Widget on **Send code on WhatsApp** / SMS fallback send | Website | ENGINEERING |
| Never put secret in Vite bundle | — | ENGINEERING |

### 6.2 Backend verification

| Item | Where | Tag |
|---|---|---|
| Turnstile **secret key** | **Supabase Dashboard** → Auth → CAPTCHA (primary verification for `signInWithOtp`) | OWNER |
| Optional Telepizza API double-check | Render only if custom OTP wrappers exist | ENGINEERING (later, optional) |
| Enable `security_captcha_enabled=true` | Supabase | OWNER |

For V1 happy path, **Supabase Auth verifies the CAPTCHA token**; Render does not need the Turnstile secret unless we add custom gates.

### 6.3 Privacy

- Prefer Turnstile privacy-preserving mode.  
- Do not log raw CAPTCHA tokens.  
- Disclose bot-protection in privacy policy when phone OTP launches (**OWNER** legal copy).

### 6.4 Cost

| Tier | Expectation |
|---|---|
| Multan pilot | **$0** typical on free Turnstile allowance |
| Abuse spike | Still cheaper than SMS pumping; pair with rate limits |

### 6.5 Failure handling

| Failure | UX | Ops |
|---|---|---|
| Widget fails to load | Show “Refresh and try again”; allow email login | Check Vercel domain allowlist in Turnstile |
| Token rejected | “Verification failed — try again” | Confirm secret in Supabase; domain mismatch |
| Turnstile outage | Soft-disable CAPTCHA only with owner approval (cost risk) **or** rely on email fallback | OWNER decision |
| Missing CAPTCHA in prod | Block OTP send | Do not ship phone UI without CAPTCHA |

---

## 7. Secrets map by platform (names only — **no values**)

### Meta / Twilio (consoles + password manager)

| Name | Tag |
|---|---|
| Meta Business Manager admin login | OWNER |
| WABA ID (identifier, not a password — still treat as sensitive ops data) | OWNER |
| WhatsApp dedicated sender number (E.164) | OWNER |
| Twilio Account SID | OWNER → paste to Supabase only |
| Twilio Auth Token | OWNER → paste to Supabase only |
| Twilio Verify Service SID | OWNER → paste to Supabase only |
| Twilio webhook signing / auth (if used) | OWNER / ENGINEERING later |
| Meta authentication template name / Content SID (if exposed) | OWNER |

### Supabase Dashboard

| Name | Tag |
|---|---|
| Twilio Verify Account SID | OWNER |
| Twilio Verify Auth Token | OWNER |
| Twilio Verify Service SID | OWNER |
| Turnstile **secret** key | OWNER |
| Existing service role / anon keys (as today) | OWNER |
| Auth `site_url` + redirect allow list | OWNER |

### Render (API)

| Name | Tag |
|---|---|
| `SUPABASE_URL` | OWNER (already) |
| `SUPABASE_ANON_KEY` | OWNER (already) |
| `SUPABASE_SERVICE_ROLE_KEY` | OWNER (already) |
| `API_JWT_SECRET` | OWNER (already) |
| `API_CORS_ORIGIN` | OWNER (already) |
| Future: `OTP_*` policy flags | ENGINEERING later |
| Future: Twilio webhook validate secret (if custom receiver) | ENGINEERING later |
| **Not on Render:** Twilio Auth Token, Verify SID, Turnstile secret (V1) | — |

### Vercel (website)

| Name | Tag |
|---|---|
| `VITE_SUPABASE_URL` | OWNER (already) |
| `VITE_SUPABASE_ANON_KEY` | OWNER (already) |
| Future: `VITE_CAPTCHA_SITE_KEY` (Turnstile site key, public) | ENGINEERING / OWNER |
| **Never:** service role, Twilio token, Turnstile secret, WABA tokens | — |

---

## 8. Delivery webhook event model

Telepizza will record **masked** delivery telemetry for pilot PASS. No OTP codes in stored payloads.

### 8.1 Canonical events

| Event | Meaning | Typical source |
|---|---|---|
| `queued` | Accept for send (Telepizza or provider accepted request) | App / Auth / Verify create |
| `sent` | Provider handed message to WhatsApp/SMS channel | Twilio status |
| `delivered` | Downstream confirms delivery to device (when available) | Twilio / Meta status |
| `failed` | Send attempt failed (API/provider error) | Twilio error |
| `undelivered` | Accepted then not delivered (carrier/WA) | Twilio status |
| `verified` | User successfully verified OTP | Auth `verifyOtp` success |
| `expired` | Code past 10-minute TTL without success | App policy / Verify |
| `fallback_to_sms` | User or system switched from WhatsApp to SMS for same phone | App |

### 8.2 Required fields (logical model — implement in 2C.1+)

| Field | Notes |
|---|---|
| `event` | One of the enums above |
| `channel` | `whatsapp` \| `sms` |
| `phone_masked` | e.g. `+923******4567` |
| `request_id` / `provider_sid` | Correlate WA→SMS fallback |
| `occurred_at` | UTC timestamp |
| `latency_ms` | From `queued`/`sent` to `delivered` when both exist |
| `error_code` | Provider code only; no secrets |

**ENGINEERING ACTION:** persist append-only in 2C.1; expose metrics for §9.  
**OWNER ACTION:** provide Twilio callback credentials and approve retention window (recommend ≤90 days).  
**PROVIDER ACTION:** enable status callbacks on Verify / Messaging.

### 8.3 Latency metrics derived from events

| Metric | Formula |
|---|---|
| WA median delivery | median(`delivered_at - queued_at`) for `channel=whatsapp` |
| WA P95 delivery | P95 same |
| Verification success rate | `verified` / (`delivered` or `sent` cohort) |
| Fallback rate | `fallback_to_sms` / WA send attempts |

---

## 9. Pilot setup

### 9.1 Approved test phones

**OWNER ACTION:** supply a short allowlist (store outside git — password manager / private ops sheet).

| Slot | Carrier | Has WhatsApp? | Purpose |
|---|---|---|---|
| T1 | Jazz | Yes | Primary WA delivery |
| T2 | Zong | Yes | WA + SMS |
| T3 | Telenor | Yes | WA + SMS |
| T4 | Ufone | Yes | WA + SMS |
| T5 | Any PK | No / WA disabled | Force SMS fallback |
| T6 | Owner phone | Yes | Ops canary |

Record as E.164 `+923…` only in private ops notes. **Do not commit numbers to the repo.**

### 9.2 Caps

| Cap | Value | Tag |
|---|---|---|
| Daily sends (WA+SMS) | **50–100**/day | OWNER sets Twilio + process |
| Monthly soft | **USD 50** | OWNER alert |
| Monthly hard | **USD 100** → pause Phone provider | OWNER |
| Per-phone | 3/hour, 10/day | ENGINEERING enforces in 2C.1+; OWNER monitors |

### 9.3 Delivery & verification metrics (PASS thresholds)

| Metric | PASS |
|---|---|
| WA delivery success | ≥ **90%** (≥40 attempts) |
| Median WA delivery | ≤ **20s** |
| P95 WA delivery | ≤ **60s** |
| SMS fallback delivery (when used) | ≥ **85%** (≥15 attempts) |
| Human verify success ≤2 tries | ≥ **85%** (≥30 verifies) |
| Duplicate accounts on channel switch | **0** |
| Cost / verified customer | ≤ **USD 1.00** |
| Ordering `0304-1110495` regression | PASS |
| Staff invite regression | PASS |
| Catalog 58/13/2 | unchanged |

### 9.4 Cleanup process

| Step | Tag |
|---|---|
| After each smoke day: disable extra test sends; reset counters if needed | OWNER |
| Delete/disable ephemeral Auth test users created for OTP (non-prod or marked smoke) | OWNER + ENGINEERING later |
| Revoke unused Twilio test credentials rotations if leaked in chat | OWNER |
| Confirm ordering number never received OTP traffic | OWNER |
| Archive masked webhook metrics; purge raw provider dumps | OWNER / ENGINEERING |
| If hard cap hit: turn **Phone provider OFF**; leave email login | OWNER |

---

## 10. Consolidated action register

### OWNER ACTION (blocking for READY)

1. Procure unused dedicated PK OTP number (≠ 0304-1110495; not on consumer WA).  
2. Assemble Meta Business verification documents.  
3. Complete Meta BM verification + create OTP WABA.  
4. Register dedicated sender; request display name **Telepizza Login**.  
5. Create Twilio Verify Service; attach BYO WhatsApp sender; enable SMS.  
6. Review auth template draft (§4); approve English intent (submit later in checklist).  
7. Paste Twilio Verify credentials into **Supabase Dashboard only**.  
8. Set OTP TTL 600s, max frequency ≥60s, `site_url` production.  
9. Create Cloudflare Turnstile site; put **secret** in Supabase; keep site key for later Vercel.  
10. Enable Auth CAPTCHA (Turnstile).  
11. Configure Twilio spend alerts ($50 / $100) and daily send discipline (50–100).  
12. Provide private test-phone allowlist (Jazz/Zong/Telenor/Ufone + non-WA).  
13. Run Multan WA + SMS smoke; record metrics; confirm ordering `wa.me` intact.  
14. Confirm email/password + staff invite still PASS.  

### PROVIDER ACTION (blocking for READY)

1. Meta Business verification review.  
2. WABA + dedicated sender registration / quality.  
3. Display-name approval for **Telepizza Login**.  
4. Authentication template approval (Copy Code, 10 min expiry).  
5. Twilio Verify WhatsApp channel healthy; SMS to PK routes working.  
6. Delivery status callback events available.  
7. Turnstile site domain allowlisting for production website host.  

### ENGINEERING ACTION (after READY + authorize 2C.1 — **not started now**)

1. Phone normalize + bootstrap phone sync + rate/lockout foundations.  
2. Webhook receiver + event model persistence (`queued`…`fallback_to_sms`).  
3. Website UI: Send/Resend WhatsApp + SMS fallback + Turnstile widget.  
4. Same-identity channel switch; no duplicate accounts.  
5. Explicit email linking; staff phone conflict.  
6. Vercel `VITE_CAPTCHA_SITE_KEY` when UI ships.  
7. Tests + Multan metric harness.  
8. **Never** implement free-form WhatsApp OTP or touch ordering number.  

---

## 11. Secrets inventory (summary)

See §7. Rule: Twilio + Turnstile secret + WABA live in **Meta/Twilio/Supabase/password manager** — not git, not Vercel secret store for tokens, not chat.

---

## 12. Explicit non-goals of 2C.0

- No customer OTP DB migrations  
- No Login/Register UI  
- No send/verify API code  
- No staff auth / Slice 2B changes  
- No migration/modification of **0304-1110495**  
- No Meta template **submission** in this documentation turn (draft only)  
- No secret values in docs  
- No commit / push / deploy  

---

## 13. WhatsApp → SMS fallback flow (locked)

```text
03… → Turnstile (prod) + rate limits
  → Send code on WhatsApp (Verify + Meta auth template)
       → queued → sent → delivered → user enters code → verified
       → delayed: Resend on WhatsApp (≥60s)
       → failed / undelivered / no WhatsApp: fallback_to_sms
            → Send via SMS (same +923…)
            → verify → SAME auth user
  → expired → request new code
  → both channels fail → email/password (pilot)
```

---

## 14. Status gate

| Gate | State |
|---|---|
| D1–D11 product decisions | ✅ Locked (D11 approved) |
| Dedicated number procured / registered | ❌ OWNER |
| Meta BM verified + OTP WABA | ❌ OWNER / PROVIDER |
| Display name **Telepizza Login** approved | ❌ PROVIDER |
| Auth template approved (10 min, Copy Code) | ❌ PROVIDER (draft only today) |
| Twilio Verify WA+SMS configured | ❌ OWNER / PROVIDER |
| Credentials in Supabase Phone provider | ❌ OWNER |
| TTL 600s / frequency ≥60s / site_url | ❌ OWNER |
| Turnstile chosen + secret in Supabase | ❌ OWNER |
| CAPTCHA enabled | ❌ OWNER |
| Webhooks emitting status events | ❌ PROVIDER (+ ENGINEERING later for store) |
| Pilot phones + spend caps set | ❌ OWNER |
| Multan metrics run | ❌ OWNER |
| Ordering number untouched / regression | ✅ Policy locked; runtime confirm pending |

### Ready definition

**READY** only if implementation can begin **without guessing**: provider, dedicated sender, auth template, CAPTCHA, secrets placement, or pilot setup.

### Final line

**SLICE 2C.0 STATUS: BLOCKED**

Technical architecture is **complete**. Remaining blockers are **operational only** (not engineering): Meta Business verification, dedicated WABA number, Twilio Verify setup, authentication template approval, CAPTCHA (Turnstile) enablement, pilot configuration.  
**OTP implementation is PAUSED** until this gate flips to READY.  
**Parallel track:** Sprint 4 Orders Backend planning — see `SPRINT-04-ORDERS-BACKEND-PLANNING.md`.

**Stop OTP engineering — continue Orders Backend planning.**
