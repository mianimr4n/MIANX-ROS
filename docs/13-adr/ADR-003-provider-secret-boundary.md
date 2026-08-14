# ADR-003: Provider-Secret Boundary Architecture

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260814180000_adr_003_provider_secret_boundary.sql` — reference table only; runtime enforcement in `backend/api/src/config/env.ts` and `backend/api/src/services/providers/`)

---

## Context

Phase 2.2 (WhatsApp Foundation) is the first workstream that integrates a
third-party messaging provider (Meta WhatsApp Business Cloud API). Phase 2.6
(AI Command Center) will follow with additional provider integrations (LLM
APIs), and Phase 2.3 (CRM) and Phase 2.4 (Delivery completion) may integrate
maps / geocoding providers. Each provider requires secret credentials:

- **WhatsApp Cloud API**: `WHATSAPP_ACCESS_TOKEN` (System User token), `WHATSAPP_APP_SECRET` (for webhook HMAC verification), `WHATSAPP_VERIFY_TOKEN` (for webhook handshake)
- **Future LLM provider**: API key (e.g. `OPENAI_API_KEY` or equivalent)
- **Future maps provider**: API key

The current `SECURITY.md` already documents the policy informally (line 80):
"Per ADR-003 (proposed), provider secrets MUST NEVER be written to database
tables or client bundles." This ADR formalizes that policy with concrete
storage, resolution, and rotation rules.

The risk being addressed: if provider secrets are stored in the application
database (even encrypted with `pgcrypto`), a single SQL dump leak, a
mis-configured RLS policy, or a read-only SSRF that reaches Postgres would
expose every provider credential at once. Database breaches are a common
attack vector; provider credentials are typically high-privilege (e.g. a
WhatsApp System User token can send messages on behalf of the business to
any customer, and an LLM API key can run up substantial billing).

## Decision

### 1. Secrets live ONLY in server-side environment variables

Provider credentials are read from `process.env` at backend startup in
`backend/api/src/config/env.ts`. They are NEVER:

- Written to any database table (Postgres, SQLite, or otherwise)
- Included in any client bundle (browser, mobile, desktop)
- Returned by any API endpoint (including admin diagnostics)
- Logged in plaintext (logs may reference the env var NAME, never the VALUE)
- Committed to the repository (`.env*` files are gitignored; `.env.example`
  contains only placeholder values)

### 2. Database stores reference keys, not secrets

When a row needs to indicate which provider configuration it uses (e.g. a
`whatsapp_message_templates` row indicating which WABA phone number it
belongs to), it stores a **reference key** — a short string identifying
which env var holds the actual secret — not the secret itself.

```sql
-- Example: a whatsapp_provider_configs table (created in a later migration)
create table public.whatsapp_provider_configs (
  id uuid primary key default gen_random_uuid(),
  config_ref text not null unique,  -- e.g. 'WHATSAPP_PRIMARY'
  phone_number_id text not null,    -- non-secret, OK to store
  business_account_id text not null, -- non-secret, OK to store
  -- NO access_token column. NO app_secret column.
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);
```

At runtime, the backend resolves the actual `WHATSAPP_ACCESS_TOKEN` /
`WHATSAPP_APP_SECRET` from `process.env` using the active config's
`config_ref` as a prefix (e.g. `WHATSAPP_PRIMARY_ACCESS_TOKEN`). This lets
us support multiple WABA numbers in the future without code changes, while
keeping the actual tokens in env vars only.

### 3. Webhook signature verification uses env-var-only secrets

The WhatsApp webhook receiver (`/api/v1/webhooks/whatsapp`) verifies the
`X-Hub-Signature-256` HMAC-SHA256 header using `WHATSAPP_APP_SECRET` from
`process.env`. The verify handshake (GET endpoint) compares the
`hub.verify_token` query parameter against `WHATSAPP_VERIFY_TOKEN` from
`process.env`. Neither secret is ever persisted to DB.

### 4. Integration mode gating (existing pattern, extended)

The existing `TELEPIZZA_*_MODE` pattern (`disabled | mock | sandbox | live`)
is extended to WhatsApp via `TELEPIZZA_WHATSAPP_MODE`. The local/test safety
guard in `evaluateLocalSafety()` (env.ts:195-209) already refuses to start
the API if any integration mode is `live` under `TELEPIZZA_ENV=local|test`.
This means:

- **Local dev**: `TELEPIZZA_WHATSAPP_MODE=mock` (default) — writes JSON to
  `backend/api/.whatsapp-outbox/` for inspection, never hits Meta API
- **Staging**: `TELEPIZZA_WHATSAPP_MODE=sandbox` — uses Meta's test number
  and sandbox WABA
- **Production**: `TELEPIZZA_WHATSAPP_MODE=live` — uses Production WABA,
  requires all `WHATSAPP_*` env vars to be set in Render

### 5. Rotation procedure

To rotate a provider secret:

1. Generate a new secret in the provider dashboard (e.g. Meta Business
   Manager → System Users → generate new token)
2. Update the env var in Render (and Vercel if the website needs it — it
   should not, since all provider calls go through the backend)
3. Trigger a Render redeploy (manual or auto-deploy on next push)
4. Revoke the old secret in the provider dashboard
5. No database migration or application code change is required

This is a single-window rotation: the secret changes in exactly one place
(the env var), and the next process restart picks it up. There is no
"re-encrypt all rows" step because no rows contain the secret.

### 6. Audit trail

Changes to `.env.example` (the documentation of which env vars exist) are
tracked in git history. Actual secret values are never in git. Operator
audit (who set which env var when) is the responsibility of the hosting
platform (Render activity log, Vercel deployment log).

## Consequences

### Positive

- **Database leak blast radius is zero for provider secrets.** A full
  Postgres dump gives the attacker phone number IDs and business account
  IDs (low-value, non-secret) but no usable credentials.
- **Rotation is a single env var update + redeploy.** No re-encryption,
  no migration, no row-by-row update.
- **Clear separation of concerns.** The DB stores *what* provider config
  to use (the `config_ref`); the env stores *how* to authenticate (the
  actual token). Operators can change either independently.
- **Local/test safety is enforced.** The existing
  `evaluateLocalSafety()` guard already refuses `live` mode under
  local/test; we extend it to validate that Production `live` mode has all
  required `WHATSAPP_*` env vars set.
- **No new infrastructure dependency.** We do not need AWS Secrets Manager,
  HashiCorp Vault, or Supabase Vault for v1. Render env vars are
  sufficient.

### Negative

- **Manual env var coordination across deploys.** Adding a new WABA number
  requires setting 3-4 env vars in Render manually. There is no DB-driven
  "add provider" admin flow. This is acceptable for v1 (we expect ≤3 WABA
  numbers); will be revisited if multi-tenant WABA onboarding is needed.
- **No DB-driven credential rotation.** An admin cannot rotate credentials
  from the UI; they must have Render dashboard access. This is a deliberate
  trade-off — UI-driven rotation would require storing the new secret in DB
  transitively, which defeats the boundary.
- **Secrets not visible in admin diagnostics.** The admin "WhatsApp
  integration status" page can show "WHATSAPP_ACCESS_TOKEN: SET" or
  "NOT SET" but never the value itself. Operators must use Render dashboard
  to view/rotate.
- **Multi-environment sync is operator-driven.** Staging and Production
  have independent env var sets; there is no automatic promotion path.
  This is consistent with the existing `SUPABASE_*` env var pattern.

## Implementation references

- Policy reference: [`SECURITY.md`](../../SECURITY.md) § Secrets Boundary
- Runtime enforcement: `backend/api/src/config/env.ts` (`evaluateLocalSafety` + `getEnvironmentStatus`)
- Provider config table (added in v1.9.0): `public.whatsapp_provider_configs` — see migration `20260814180000_adr_003_provider_secret_boundary.sql`
- WhatsApp adapter (added in v1.9.0): `backend/api/src/services/whatsapp/cloud-api-client.ts`
- Webhook receiver (added in v1.9.0): `backend/api/src/modules/webhooks/whatsapp.ts`
- `.env.example` additions: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`

## Future work (out of scope for this ADR)

- **ADR-013** — AI Provider Boundary & Data Governance (will extend this
  pattern to LLM provider credentials, plus PII redaction before forwarding
  to model providers)
- **Supabase Vault migration** — if/when we adopt Supabase Vault for
  secrets management (e.g. for customer-facing encryption keys), this ADR
  will be extended, not superseded. The principle "secrets never in
  application tables" remains; Vault would be an additional approved
  secrets store alongside env vars.
- **Multi-tenant WABA onboarding** — if we ever allow franchisees to bring
  their own WABA numbers, we will need a DB-driven config flow that writes
  to `whatsapp_provider_configs` and an operator UI for setting the
  corresponding env vars. Out of scope for v1.
