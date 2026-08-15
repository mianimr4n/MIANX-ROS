# ADR-016: OTP Verification Architecture

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-15
**Implemented in:** `v1.10.0` (migration `20260821000000_adr_016_017_otp.sql`)

---

## Context

Phase 3 (Customer Phone / WhatsApp OTP) introduces customer authentication
via one-time passcodes delivered over WhatsApp (primary), SMS (fallback),
and email (temporary recovery). The roadmap mandates:

- **WhatsApp-first OTP** — when the customer has a verified WhatsApp number,
  deliver OTP through the same WhatsApp Cloud API integration already
  built in Phase 2.2 (ADR-003 + ADR-004).
- **SMS fallback** — when WhatsApp delivery fails or the customer's number
  is not WhatsApp-capable, fall back to SMS via a future SMS gateway
  (Twilio Verify is the roadmap target).
- **Email temporary** — for account recovery when both WhatsApp and SMS
  are unavailable.

### Hard rules (governance)

- **D11:** The ordering number `0304-1110495` is NEVER used for OTP. A
  dedicated "Telepizza Login" WhatsApp number must be provisioned before
  live OTP delivery; until then OTP runs in `mock` mode for engineering
  verification.
- **Per-OTP rate limit:** Max 3 OTP requests per phone per 10 minutes;
  max 5 OTP requests per phone per hour; max 10 per phone per day.
- **Per-OTP attempt limit:** Max 5 verification attempts per OTP request.
  After 5 wrong attempts, the OTP is permanently failed and the customer
  must request a new one.
- **OTP lifetime:** 5 minutes. After expiry the customer must request a
  new OTP.
- **OTP rotation:** Generating a new OTP for the same phone while a
  previous OTP is still valid **invalidates** the previous OTP (only one
  active OTP per phone at any time).
- **OTP value:** 6 numeric digits, generated using `crypto.randomInt`
  (cryptographically secure, NOT `Math.random`).
- **OTP storage:** Hashed using HMAC-SHA256 with a server-side
  `OTP_HMAC_SECRET` env var. The plaintext OTP is NEVER stored in the
  database — only its hash. This means OTPs cannot be recovered from a
  DB dump.
- **OTP verification:** Constant-time comparison via
  `crypto.timingSafeEqual` to prevent timing attacks.
- **PII retention:** OTP records (including the phone number) are
  retained for 90 days for audit and fraud investigation, then purged.
  The `customer_identities` table (ADR-005) holds the canonical verified
  phone → customer mapping.

### What this ADR does NOT cover

- Session issuance after OTP verification — that is ADR-017
  (Phone-First Auth & Session Handoff).
- The actual WhatsApp/SMS provider adapter contract — that is ADR-003
  (Provider-Secret Boundary) and ADR-004 §8 (MessageProviderAdapter).
- Customer identity canonicalization — that is ADR-005.
- Branch scoping for customers — customers are not branch-scoped (they
  are tenant-global).

---

## Decision

### 1. Three new tables

#### `otp_requests`

Each row represents a single OTP issuance (one phone + one channel +
one purpose). State machine: `pending` → `verified` | `failed` |
`expired`.

```sql
create table public.otp_requests (
  id uuid primary key default gen_random_uuid(),
  -- The E.164 phone number that should receive the OTP (normalized via ADR-005).
  phone_e164 text not null,
  -- Delivery channel: whatsapp | sms | email. Email uses customer.email and
  -- ignores phone_e164 (phone_e164 is still required for audit correlation).
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  -- Why the OTP was issued: customer_login | customer_register | phone_reverify | recovery.
  purpose text not null check (purpose in ('customer_login','customer_register','phone_reverify','recovery')),
  -- HMAC-SHA256 hash of the plaintext OTP, signed with OTP_HMAC_SECRET env var.
  -- The plaintext OTP is NEVER stored.
  otp_hash text not null,
  -- State machine.
  status text not null default 'pending'
    check (status in ('pending','verified','failed','expired')),
  -- Counter of failed verification attempts. Reaches 5 → status='failed'.
  attempt_count int not null default 0,
  -- When the OTP was issued (UTC).
  issued_at timestamptz not null default now(),
  -- When the OTP expires (issued_at + 5 minutes).
  expires_at timestamptz not null,
  -- When the OTP was verified (null until verified).
  verified_at timestamptz,
  -- When the OTP was failed/expired (null until terminal state).
  resolved_at timestamptz,
  -- Optional: link to the customer resolved by ADR-005 (null for register
  -- flow where the customer does not yet exist).
  customer_id uuid references public.customers (id) on delete set null,
  -- Optional: link to the auth_user created/looked-up after verification.
  auth_user_id uuid,
  -- Free-text failure reason for debugging (e.g. "max_attempts_exceeded",
  -- "expired", "rotated_out_by_newer_otp"). PII-free.
  failure_reason text,
  -- Request metadata: IP, user-agent, correlation_id for tracing (mirrors
  -- ADR-012 domain_events pattern).
  request_ip inet,
  request_user_agent text,
  correlation_id uuid
);
```

Indexes:
- `otp_requests_phone_status_idx` on `(phone_e164, status, issued_at desc)` — primary lookup.
- `otp_requests_expires_at_idx` on `(expires_at)` where `status='pending'` — TTL purge.
- `otp_requests_customer_idx` on `(customer_id, issued_at desc)` — audit per customer.
- `otp_requests_correlation_idx` on `(correlation_id)` — cross-domain tracing (ADR-012).

#### `otp_attempts`

Each row represents a single verification attempt (regardless of
success/failure). Append-only audit trail. This is distinct from
`otp_requests.attempt_count` (which is a denormalized counter for fast
locking); the `otp_attempts` table is the immutable audit log.

```sql
create table public.otp_attempts (
  id uuid primary key default gen_random_uuid(),
  otp_request_id uuid not null references public.otp_requests (id) on delete restrict,
  -- Whether the submitted OTP hash matched the stored hash.
  result text not null check (result in ('success','wrong_otp','expired','already_used')),
  -- IP + user-agent of the verifier (for fraud analysis).
  attempt_ip inet,
  attempt_user_agent text,
  attempted_at timestamptz not null default now()
);
```

Indexes:
- `otp_attempts_request_idx` on `(otp_request_id, attempted_at desc)`.
- `otp_attempts_ip_idx` on `(attempt_ip, attempted_at desc)` — IP-based rate limiting and fraud detection.

#### `customer_phone_verifications`

Records the canonical "this phone is verified for this customer" state.
Updated when a customer successfully verifies a phone via OTP. This is
the source of truth for `customer_identities.identity_type='phone'`
rows having `verified_at` set (the trigger in ADR-005's migration sets
`verified_at=null` on initial insert; this table back-fills it).

```sql
create table public.customer_phone_verifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  phone_e164 text not null,
  -- When the phone was first verified.
  verified_at timestamptz not null default now(),
  -- The OTP request that completed this verification (audit trail).
  otp_request_id uuid references public.otp_requests (id) on delete set null,
  -- Whether this is the customer's primary phone (exactly one per customer).
  is_primary boolean not null default false,
  unique (customer_id, phone_e164)
);
```

Indexes:
- `customer_phone_verifications_phone_idx` on `(phone_e164)` — lookup by phone.
- `customer_phone_verifications_customer_idx` on `(customer_id, is_primary)` — primary lookup.
- Partial unique index `customer_phone_verifications_one_primary_idx` on
  `(customer_id)` where `is_primary=true` — enforces exactly one primary.

### 2. Functions

#### `expire_stale_otp_requests()`

TTL function: marks all `pending` OTP requests past their `expires_at`
as `expired`. Called by:
- The OTP service at the start of `verifyOtp()` (lazy expiry).
- A scheduled lifecycle job (hourly) for batch cleanup.

```sql
create or replace function public.expire_stale_otp_requests()
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  update public.otp_requests
  set status = 'expired', resolved_at = now(), failure_reason = 'expired'
  where status = 'pending' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
```

#### `purge_old_otp_records()`

PII retention: deletes OTP records older than 90 days. Also deletes
the corresponding `otp_attempts` rows (cascade not enabled — explicit
delete to keep audit clean). Called by a daily lifecycle job.

```sql
create or replace function public.purge_old_otp_records()
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  delete from public.otp_attempts
  where otp_request_id in (
    select id from public.otp_requests
    where issued_at < now() - interval '90 days'
  );
  delete from public.otp_requests
  where issued_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
```

#### `rotate_previous_pending_otps(p_phone_e164 text)`

Helper: when a new OTP is requested for a phone, all previous `pending`
OTPs for that phone are marked `failed` with reason `rotated_out_by_newer_otp`.
Called by the OTP service before inserting a new OTP request.

```sql
create or replace function public.rotate_previous_pending_otps(p_phone_e164 text)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  update public.otp_requests
  set status = 'failed', resolved_at = now(), failure_reason = 'rotated_out_by_newer_otp'
  where phone_e164 = p_phone_e164 and status = 'pending';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
```

#### `mark_customer_phone_verified(p_customer_id uuid, p_phone_e164 text, p_otp_request_id uuid)`

Records a successful phone verification by inserting/updating
`customer_phone_verifications` and updating the corresponding
`customer_identities` row's `verified_at` (ADR-005).

```sql
create or replace function public.mark_customer_phone_verified(
  p_customer_id uuid,
  p_phone_e164 text,
  p_otp_request_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_verification_id uuid;
begin
  insert into public.customer_phone_verifications (customer_id, phone_e164, otp_request_id, is_primary)
  values (p_customer_id, p_phone_e164, p_otp_request_id, true)
  on conflict (customer_id, phone_e164)
  do update set verified_at = now(), otp_request_id = p_otp_request_id
  returning id into v_verification_id;

  -- Demote any other "is_primary=true" rows for this customer to false.
  update public.customer_phone_verifications
  set is_primary = false
  where customer_id = p_customer_id and id <> v_verification_id and is_primary = true;

  -- Update customer_identities (ADR-005) to mark the phone as verified.
  update public.customer_identities
  set verified_at = now()
  where identity_type = 'phone' and value = p_phone_e164 and customer_id = p_customer_id;

  return v_verification_id;
end;
$$;
```

### 3. RLS

- `otp_requests`: service_role write only. Branch staff CANNOT read OTP
  records — they contain customer phone numbers and OTP hashes. Only
  the backend service (using service_role) and super-admin (via a future
  audit UI) can read.
- `otp_attempts`: same — service_role only.
- `customer_phone_verifications`: branch staff can read (to see whether
  a customer's phone is verified); service_role writes.

### 4. Permissions

- `otp.manage` — granted to super-admin only (for audit UI + manual
  OTP inspection in fraud cases).
- `otp.read` — granted to super-admin + customer-support (read-only
  access to OTP request history for support cases).

### 5. Backend module structure

```
backend/api/src/services/otp/
  otp-service.ts          — generateOtp, verifyOtp, getRequestHistory
  otp-rate-limiter.ts     — per-phone + per-IP rate limit checks
  otp-hasher.ts           — HMAC-SHA256 hash + constant-time compare
  otp-channel-resolver.ts — picks whatsapp | sms | email for a given phone
  otp-template.ts         — WhatsApp template invocation for OTP delivery
backend/api/src/modules/auth/
  routes.ts               — existing + new POST /auth/otp/request, /auth/otp/verify, /auth/phone-login
```

### 6. OTP generation + verification algorithm

**Generate:**
1. Normalize the phone to E.164 using `normalize_phone_e164()` (ADR-005).
2. Check rate limits (per-phone + per-IP).
3. Call `rotate_previous_pending_otps(phone_e164)` to invalidate any
   prior pending OTPs.
4. Generate 6-digit code via `crypto.randomInt(0, 1_000_000)` (returns
   a 6-digit zero-padded string).
5. Compute `otp_hash = HMAC_SHA256(otp, OTP_HMAC_SECRET).toString('hex')`.
6. Insert into `otp_requests` with `expires_at = now() + 5 minutes`.
7. Resolve the channel (WhatsApp if `TELEPIZZA_WHATSAPP_MODE != disabled`
   AND phone is WhatsApp-capable; else SMS if `OTP_SMS_PROVIDER != disabled`;
   else email if customer has email; else 503).
8. Dispatch the OTP via the chosen adapter. For WhatsApp, this uses the
   same `MessageProviderAdapter` contract (ADR-004 §8) with the
   `otp_delivery` template.
9. Return `{ otpRequestId, channel, expiresAt }` to the caller. NEVER
   return the plaintext OTP.

**Verify:**
1. Look up the `otp_request_id`. If not found → 404.
2. Call `expire_stale_otp_requests()` (lazy expiry).
3. If the request is no longer `pending` → return 410 Gone with the
   current status (`verified` | `failed` | `expired`).
4. Check IP rate limit (max 10 verify attempts per IP per minute).
5. Compute `submitted_hash = HMAC_SHA256(submitted_otp, OTP_HMAC_SECRET)`.
6. Constant-time compare `submitted_hash` with `otp_hash`. If match:
   - Set `status='verified'`, `verified_at=now()`.
   - Insert `otp_attempts` row with `result='success'`.
   - If `customer_id` is set, call `mark_customer_phone_verified()`.
   - Issue session (ADR-017).
7. If mismatch:
   - Increment `attempt_count`.
   - Insert `otp_attempts` row with `result='wrong_otp'`.
   - If `attempt_count >= 5`, set `status='failed'`,
     `failure_reason='max_attempts_exceeded'`, `resolved_at=now()`.
   - Return 401 with remaining attempts count.

---

## Consequences

### Positive

- **OTP plaintext never persisted.** Even a full DB dump exposes only
  HMAC hashes, which are useless without `OTP_HMAC_SECRET` (env var).
- **Cryptographically secure generation.** `crypto.randomInt` avoids
  the modulo bias of `Math.random() % 1_000_000`.
- **Constant-time verification.** `crypto.timingSafeEqual` prevents
  timing side-channel attacks on the hash compare.
- **Rate-limited at three levels.** Per-phone (3/10min, 5/hour, 10/day),
  per-IP (10/min for verify), and per-request (5 attempts max).
- **Rotation invariant.** Exactly one `pending` OTP per phone at any
  time — enforced by the `rotate_previous_pending_otps()` call before
  each new OTP insert.
- **Audit trail.** `otp_attempts` is append-only; every verification
  attempt (success or failure) is recorded with IP + user-agent for
  fraud analysis.
- **Reuses ADR-003 + ADR-004 infrastructure.** WhatsApp OTP delivery
  goes through the same `MessageProviderAdapter` contract and outbox
  worker — no new provider integration code.

### Negative

- **90-day PII retention.** OTP records contain phone numbers; we
  retain them for 90 days for fraud investigation. After 90 days they
  are purged. Customers can request earlier deletion via GDPR-style
  request (Phase 14 scope).
- **HMAC secret rotation.** If `OTP_HMAC_SECRET` is rotated, all
  in-flight OTPs become unverifiable. Mitigation: keep a list of
  recent secrets (like JWT secret rotation); check each. Out of scope
  for v1 — single secret until rotation is needed.
- **Mock mode caveat.** In mock mode, the OTP is logged to
  `.whatsapp-outbox/` for engineering verification. The plaintext is
  NEVER logged in non-mock modes.

### Operational

- New env vars (all under ADR-003):
  - `OTP_HMAC_SECRET` — 32+ byte random string for HMAC. REQUIRED in
    all environments (even mock — the hash is computed but the
    plaintext is also written to the mock outbox for verification).
  - `OTP_TTL_SECONDS` — default 300 (5 minutes).
  - `OTP_MAX_ATTEMPTS` — default 5.
  - `OTP_RATE_LIMIT_PHONE_PER_10MIN` — default 3.
  - `OTP_RATE_LIMIT_PHONE_PER_HOUR` — default 5.
  - `OTP_RATE_LIMIT_PHONE_PER_DAY` — default 10.
  - `OTP_RATE_LIMIT_VERIFY_PER_IP_PER_MIN` — default 10.
  - `OTP_RETENTION_DAYS` — default 90.
  - `OTP_SMS_PROVIDER` — `disabled` | `twilio` (future). Default `disabled`.
  - `OTP_EMAIL_FALLBACK` — `0` | `1`. Default `0`.

- Lifecycle jobs:
  - `TELEPIZZA_OTP_TTL_JOB=1` — runs `expire_stale_otp_requests()` every
    minute (in addition to lazy expiry at verify time).
  - `TELEPIZZA_OTP_PURGE_JOB=1` — runs `purge_old_otp_records()` daily.

---

## Alternatives considered

### A. Store plaintext OTP in DB (encrypted with pgcrypto)

Rejected — a SQL dump leak or mis-configured RLS would expose every
in-flight OTP. HMAC hash is strictly safer and the verification
algorithm is identical in cost.

### B. Use Supabase Auth's built-in phone OTP

Supabase Auth does support phone OTP via Twilio, but:
- It does not support WhatsApp as a delivery channel (only SMS).
- It does not support the D11 hard rule (dedicated OTP number vs
  ordering number).
- It does not support our `customer_identities` canonical identity
  table (ADR-005) — it has its own `auth.users.phone` column.
- We need branch-aware audit and rate limiting that Supabase Auth
  does not expose.

We keep Supabase Auth for **staff** email/password auth (already
shipped in Phase 2); we use our own OTP infrastructure for **customer**
phone auth.

### C. Use Twilio Verify exclusively

Twilio Verify is the roadmap target for SMS, but it does not support
WhatsApp as a channel. We need WhatsApp-first delivery (D11) so
Twilio Verify alone is insufficient. We will use Twilio Verify for
the SMS fallback path in a future PR; the OTP service abstracts the
SMS provider behind an `SmsProviderAdapter` interface (mirror of
`MessageProviderAdapter`).

---

## References

- [ADR-003](./ADR-003-provider-secret-boundary.md) — Provider-Secret Boundary
- [ADR-004](./ADR-004-whatsapp-conversation-ownership.md) — WhatsApp Conversation Ownership (§8 MessageProviderAdapter)
- [ADR-005](./ADR-005-canonical-customer-identity.md) — Canonical Customer Identity
- [ADR-012](./ADR-012-domain-event-audit.md) — Domain Event Audit
- [TELEPIZZA-MASTER-ROADMAP.md](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 3 hard rules (D11)
