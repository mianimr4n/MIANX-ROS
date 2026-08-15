# ADR-017: Phone-First Auth & Session Handoff

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-15
**Implemented in:** `v1.10.0`

---

## Context

Phase 3 mandates **phone-first login/register** for customers. After
an OTP is verified (ADR-016), the backend must:

1. **Resolve** the customer by phone using `resolve_customer_by_identity()`
   (ADR-005). If the customer exists, log them in. If not, create a
   new customer (provisional status) with the verified phone as their
   primary identity.
2. **Issue** a session — an access token + refresh token pair — bound
   to the customer's `auth.users.id`. We reuse Supabase Auth's JWT
   infrastructure for the access token; the refresh token is our own.
3. **Split** the `/auth/login` endpoint: customers use
   `/auth/otp/request` + `/auth/otp/verify` + `/auth/phone-login`;
   staff continue to use `/auth/login` (email + password). The
   `/staff/login` route is a separate endpoint that staff MUST use —
   the legacy `/auth/login` will be deprecated for staff in v1.11.0
   and removed in v1.12.0.
4. **Hand off** to the existing `AuthPrincipal` system (Phase 2) so
   all downstream middleware (RBAC, branch scoping, audit) works
   unchanged.

### Why a separate ADR

ADR-016 covers the OTP verification mechanism. This ADR covers what
happens AFTER verification — the customer provisioning + session
issuance + endpoint split. They are separate concerns: ADR-016 is
about "did the customer prove they own this phone"; ADR-017 is about
"now that they proved it, how do we let them in".

---

## Decision

### 1. Customer provisioning flow (post-OTP-verify)

When `verifyOtp()` succeeds:

1. Look up the customer via `resolve_customer_by_identity('phone', phone_e164)`.
2. **If found:** use the existing customer. Update their `last_login_at`
   column (new column added in this migration).
3. **If not found:** insert a new customer with `status='provisional'`,
   `phone=phone_e164`. The `auto_create_customer_identities()` trigger
   (ADR-005) will create the corresponding `customer_identities` row.
   Then call `mark_customer_phone_verified()` (ADR-016) to immediately
   promote the phone to verified.
4. Look up the corresponding `auth.users` row by phone. **If not found:**
   create a new `auth.users` row with `user_type='customer'`,
   `phone=phone_e164`, and a random email placeholder
   (`phone_e164@otp.telepizza.local` — NOT a real email; this is just
   to satisfy the `auth.users.email` NOT NULL constraint). The
   customer's real email (if any) is stored on `customers.email`, not
   `auth.users.email`.
5. Issue session tokens.

### 2. Session issuance

We reuse Supabase Auth's JWT infrastructure. The OTP service calls
`supabase.auth.admin.generateAccessToken(user_id)` (server-side,
using the service role key) to mint a short-lived (15-minute) JWT
access token. The refresh token is generated server-side using
`crypto.randomBytes(48)` and stored in a new
`auth_refresh_tokens` table (this migration).

```sql
create table public.auth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,  -- SHA-256 of the plaintext refresh token
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,  -- 30 days from issued_at
  -- IP + user-agent of the device that requested this refresh token.
  -- Used for "revoke all my sessions" UX.
  issued_ip inet,
  issued_user_agent text,
  -- When this token was revoked (null = still active).
  revoked_at timestamptz,
  -- Why it was revoked: 'user_logout' | 'rotation' | 'admin_revoke' | 'expired'
  revoke_reason text
);
```

The plaintext refresh token is returned to the client ONCE (in the
`/auth/phone-login` response); the client stores it (httpOnly cookie
or secure storage) and sends it to `/auth/refresh` to get a new
access token. The DB stores only the SHA-256 hash.

**Token rotation:** Each `/auth/refresh` call issues a NEW refresh
token and revokes the old one (with `revoke_reason='rotation'`).
This limits the blast radius of a stolen refresh token.

### 3. Endpoint additions to `/auth`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/otp/request` | Issue OTP (body: `{ phone, channel?, purpose? }`) |
| POST | `/auth/otp/verify` | Verify OTP (body: `{ otpRequestId, otp }`) → returns `{ verified: true, sessionIssuedAt }` but NOT the session (use `/auth/phone-login` next) |
| POST | `/auth/phone-login` | Exchange a verified OTP request ID for session tokens (body: `{ otpRequestId }`) → returns `{ accessToken, refreshToken, expiresIn }` |
| POST | `/auth/refresh` | Exchange a refresh token for a new access token (body: `{ refreshToken }`) → returns `{ accessToken, refreshToken, expiresIn }` |
| POST | `/auth/logout` | Revoke the current refresh token (requires `Authorization: Bearer <accessToken>`) |
| POST | `/auth/logout-all` | Revoke ALL refresh tokens for the current user (requires `Authorization: Bearer <accessToken>`) |
| GET | `/auth/sessions` | List active sessions for the current user (requires auth) |
| POST | `/staff/login` | Staff email/password login (alias for `/auth/login` with `userType='staff'` enforcement) |

**Why split `/auth/otp/verify` from `/auth/phone-login`?** So the
client can show a "Verified ✓" screen before issuing the session, and
so a verified OTP can be used for non-login purposes (e.g.
`phone_reverify` for adding a new phone to an existing account) without
forcing a login.

### 4. The `last_login_at` column

Add `customers.last_login_at timestamptz` (nullable). Updated on each
successful `/auth/phone-login`. Used by:
- The customer's "Account activity" UI.
- Fraud detection (sudden login from a new country).
- Inactive customer re-engagement campaigns.

### 5. AuthPrincipal unchanged

The existing `AuthPrincipal` interface (Phase 2) does NOT change.
After `/auth/phone-login`, the issued JWT contains `sub=auth_user_id`,
and the existing `requireAuth` middleware + `buildPrincipalFromAuthUser()`
path produces an `AuthPrincipal` with `userType='customer'`,
`roles=[]`, `permissions=[]` (customers have no roles or permissions
in v1 — they authenticate purely to access their own data).

### 6. Rate limiting

- `/auth/otp/request`: 3 per phone per 10 min (ADR-016) + 10 per IP
  per hour (new IP-based limit at the route level via `express-rate-limit`).
- `/auth/otp/verify`: 10 per IP per minute (ADR-016).
- `/auth/phone-login`: 5 per IP per minute (route-level).
- `/auth/refresh`: 30 per IP per minute (route-level — refresh happens
  frequently).
- `/auth/logout` + `/auth/logout-all`: 10 per IP per minute.

### 7. RLS on `auth_refresh_tokens`

- **service_role:** all (CRUD).
- **authenticated (the token owner):** SELECT + UPDATE (revoke) where
  `auth_user_id = auth.uid()`. Cannot INSERT or DELETE.
- **anon:** no access.

This means a logged-in customer can list their own refresh tokens and
revoke individual ones (for "log out of this device" UX) without
needing a server round-trip through `/auth/logout`.

### 8. Audit

Each `/auth/phone-login` and `/auth/refresh` issues a
`domain_events` row (ADR-012) with:
- `event_type='auth.session_issued'` (for phone-login) or
  `auth.session_refreshed` (for refresh).
- `entity_id=auth_user_id`.
- `branch_id=null` (customers are not branch-scoped).
- `actor_user_id=auth_user_id`.
- `actor_role='customer'`.
- `metadata={ channel: 'phone_otp', ip, user_agent }`.
- `correlation_id` linked to the originating OTP request.

Each `/auth/logout` issues `auth.session_revoked` with
`metadata={ revoke_reason, token_id }`.

### 9. Backward compatibility

- The existing `/auth/login` (email + password) endpoint is UNCHANGED.
  Staff can still use it. The new `/staff/login` is a thin alias that
  adds `userType='staff'` enforcement (rejects customer logins).
- The existing `/auth/refresh` is REPLACED with the new
  refresh-token-rotation version. Old refresh tokens (if any were
  issued under the previous scheme) will be invalidated on first
  deployment of v1.10.0 — customers must re-login. This is acceptable
  because no Production customers exist yet.
- The existing `/auth/me` and `/auth/me/profile` endpoints work
  unchanged for both staff and customer principals.

---

## Consequences

### Positive

- **Phone-first works for both login and register.** No separate
  `/auth/register` endpoint — the OTP-verify + customer-provision flow
  handles both cases via `resolve_customer_by_identity()`.
- **Refresh token rotation.** Stolen refresh tokens have a limited
  lifetime because each use rotates them.
- **Reuses AuthPrincipal.** No middleware changes — all RBAC, branch
  scoping, and audit continue to work.
- **Audit trail via ADR-012.** Every session issuance and revocation
  is recorded in `domain_events` with correlation_id linking back to
  the OTP request.
- **Customer self-service session management.** Customers can list
  and revoke their own refresh tokens via RLS — no server round-trip
  needed for "log out of this device".

### Negative

- **Placeholder email on auth.users.** Customer accounts created via
  phone OTP have `email='phone_e164@otp.telepizza.local'` on
  `auth.users`. This is ugly but necessary because Supabase Auth
  requires `email` to be non-null. The real customer email (if any)
  lives on `customers.email`. We document this clearly so future
  engineers don't get confused.
- **Old refresh tokens invalidated.** First deploy of v1.10.0 will
  log out all existing staff (none in Production yet, so acceptable).
  Document this in the release notes.
- **Refresh token DB table adds a join.** Each `/auth/refresh` does
  a SELECT + INSERT + UPDATE on `auth_refresh_tokens`. Performance
  impact is negligible (the table is indexed by `token_hash` UNIQUE).

### Operational

- New env vars:
  - `OTP_SESSION_ACCESS_TOKEN_TTL_SECONDS` — default 900 (15 min).
  - `OTP_SESSION_REFRESH_TOKEN_TTL_SECONDS` — default 2_592_000 (30 days).
  - `OTP_SESSION_ROTATE_REFRESH_TOKEN` — default `1` (enable rotation).

- No new lifecycle jobs. The `purge_old_otp_records()` job (ADR-016)
  also purges expired `auth_refresh_tokens` rows where
  `expires_at < now() AND revoked_at IS NULL`.

---

## Alternatives considered

### A. Use Supabase Auth's built-in phone OTP (continued from ADR-016)

Rejected for the same reasons as ADR-016: no WhatsApp channel, no
D11 enforcement, no integration with `customer_identities`. We use
our own session issuance on top of Supabase Auth's JWT infrastructure.

### B. Issue our own JWTs (not Supabase Auth)

Rejected — would require duplicating Supabase Auth's JWT verification
logic in the API middleware. Reusing Supabase Auth's
`generateAccessToken()` keeps the verification path single-sourced.

### C. Store refresh tokens in Redis

Rejected for v1 — adds a new infrastructure dependency. Postgres with
a unique index on `token_hash` is sufficient for the expected customer
volume (single-tenant, Pakistan-only). If we ever need to scale,
moving to Redis is a small refactor.

---

## References

- [ADR-003](./ADR-003-provider-secret-boundary.md) — Provider-Secret Boundary
- [ADR-004](./ADR-004-whatsapp-conversation-ownership.md) — WhatsApp Conversation Ownership
- [ADR-005](./ADR-005-canonical-customer-identity.md) — Canonical Customer Identity
- [ADR-012](./ADR-012-domain-event-audit.md) — Domain Event Audit
- [ADR-016](./ADR-016-otp-verification-architecture.md) — OTP Verification Architecture
