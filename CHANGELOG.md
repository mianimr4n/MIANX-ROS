# Changelog

All notable changes to **Telepizza ROS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For full release notes see [`docs/releases/`](./docs/releases/) and
[`docs/00-governance/REPOSITORY_STATUS.md`](./docs/00-governance/REPOSITORY_STATUS.md).

---

## [Unreleased] — Phase 2.2 WhatsApp Foundation (ADR-003 + ADR-004)

### Added

- **ADR-003 — Provider-Secret Boundary Architecture** (`docs/13-adr/ADR-003-provider-secret-boundary.md`).
  Cross-cutting security ADR governing how ALL provider credentials (WhatsApp,
  future LLM, future maps) are stored. Secrets live ONLY in server-side env
  vars; the DB stores reference keys (`config_ref`) that the backend resolves
  to env-var names at runtime. Formalizes the policy already documented in
  `SECURITY.md` line 80.

- **ADR-004 — WhatsApp Conversation Ownership & Routing** (`docs/13-adr/ADR-004-whatsapp-conversation-ownership.md`).
  WhatsApp-specific ADR covering: branch ownership of conversations, agent RLS
  scoping with super-admin cross-branch visibility, provisional customer
  identity for unknown phone numbers, conversation state machine
  (open → in_progress → resolved/escalated → closed), message immutability
  (mirror ADR-007/011 patterns), 24-month PII retention with anonymization,
  idempotent webhook upsert via `wamid` UNIQUE, and the provider adapter
  contract (`MessageProviderAdapter` interface).

- **Migrations**:
  - `20260816000000_adr_003_provider_secret_boundary.sql` — creates
    `whatsapp_provider_configs` table (non-secret metadata only: phone_number_id,
    business_account_id, display_name, default_branch_id, is_default). NO
    secret columns. Partial unique index enforces exactly one default. RLS:
    authenticated/anon can read active configs; service_role only can write.
  - `20260816000100_adr_004_whatsapp_conversation_ownership.sql` — creates
    `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_conversation_events`
    (append-only), `whatsapp_message_templates`, `whatsapp_inbound_events`
    (raw webhook queue). Extends `customers.status` with `'provisional'`.
    Adds conversation state machine trigger, message immutability trigger
    (inbound = append-only; outbound body immutable once sent), append-only
    triggers on audit tables, `'created'` event trigger on new conversations.
    Branch-scoped RLS on all tables using the canonical
    `assignment_status = 'ACTIVE'` pattern.

- **Backend — env config** (`backend/api/src/config/env.ts`):
  - New `WhatsAppEnvConfig` interface + `whatsapp` field on `ApiEnvironment`.
  - New env vars: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
    `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`,
    `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_API_VERSION` (default `v21.0`).
  - `evaluateLocalSafety()` now requires all 5 WhatsApp secrets when
    `TELEPIZZA_WHATSAPP_MODE=sandbox|live` (defense in depth for ADR-003).
  - `.env.example` updated with documented WhatsApp env var block.

- **Backend — provider adapter contract** (`backend/api/src/services/providers/adapter.ts`):
  - `MessageProviderAdapter` interface with `sendMessage()`,
    `verifyWebhookSignature()`, `normalizeWebhookEvent()`.
  - `MessageContent` (text | template), `MessageResult`, `NormalizedInboundEvent`,
    `NormalizedStatusEvent`, `NormalizedWebhookEvent` types.

- **Backend — WhatsApp adapters** (`backend/api/src/services/whatsapp/`):
  - `mock-client.ts` — mock adapter for `TELEPIZZA_WHATSAPP_MODE=mock` (local
    dev + test). Writes outbound messages as JSON files to
    `backend/api/.whatsapp-outbox/`. Accepts all webhook signatures. Exports
    `computeHubSignature()` helper for Cloud API adapter tests.
  - `cloud-api-client.ts` — Meta Cloud API adapter for sandbox|live mode.
    POSTs to `https://graph.facebook.com/<version>/<phone_number_id>/messages`.
    Verifies `X-Hub-Signature-256` using `WHATSAPP_APP_SECRET` with
    `timingSafeEqual` (constant-time comparison). Supports text + template
    messages.
  - `adapter-factory.ts` — `resolveWhatsAppAdapter(envStatus)` picks the
    right adapter based on `TELEPIZZA_WHATSAPP_MODE`. Returns `null` when
    disabled.

- **Backend — webhook receiver** (`backend/api/src/modules/webhooks/whatsapp.ts`):
  - `GET /api/v1/webhooks/whatsapp` — Meta webhook subscription handshake.
    Compares `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` env var.
    Returns `hub.challenge` as plaintext. No DB access.
  - `POST /api/v1/webhooks/whatsapp` — inbound message + status callback.
    Verifies `X-Hub-Signature-256` HMAC (500ms budget), returns 200 OK
    immediately, enqueues raw payload to `whatsapp_inbound_events` for async
    processing. Returns 404 when WhatsApp disabled; 401 on bad signature;
    500 on DB insert failure (so Meta retries).
  - Raw body captured via `express.json({ verify })` hook in `app.ts` —
    stores Buffer on `req.rawBody` without breaking JSON parsing for other
    routes.
  - Lazily creates Supabase client (avoids crashing app at startup if env
    vars missing; webhook returns 503 if called before env ready).

- **Backend — app wiring**:
  - `app.ts` registers the webhook router at `/api/v1/webhooks/whatsapp`.
  - `app-dependencies.ts` adds `whatsappAdapter: MessageProviderAdapter | null`
    field, wired via `resolveWhatsAppAdapter(envStatus)`.
  - `modules/index.ts` adds `webhooks/whatsapp` to `apiModules` descriptor
    (now 13 modules; `/healthz` reflects this).

- **Tests** (67 new tests, all passing):
  - `tests/whatsapp-provider-secret-boundary.test.ts` (17 tests) — parse-based
    migration tests for ADR-003. Verifies table shape, absence of secret
    columns, RLS policies, partial unique index, updated_at trigger.
  - `tests/whatsapp-conversation-ownership.test.ts` (41 tests) — parse-based
    migration tests for ADR-004. Verifies all 5 new tables, state machine
    function + trigger, append-only triggers, message immutability trigger,
    RLS policies using `assignment_status = 'ACTIVE'` pattern, super-admin
    cross-branch read, `'created'` event trigger.
  - `tests/whatsapp-webhook.test.ts` (9 tests) — supertest HTTP tests
    covering GET handshake (200/401/400/404), POST signature verification
    (401/200/404), and `computeHubSignature` helper correctness.

### Changed

- `evaluateLocalSafety()` in `env.ts` now validates WhatsApp env vars when
  mode is sandbox|live. Existing test `allows cloud Supabase for staging with
  explicit override` updated to set the 5 required WHATSAPP_* env vars.
- `app.test.ts` module count assertion updated from 12 → 13 (webhooks/whatsapp
  added).
- `rc3-supplier-portal.test.ts` test fixture updated to include the new
  `whatsapp: WhatsAppEnvConfig` field on `ApiEnvironment`.

### Operational notes

- **No Production migration applied yet.** This PR ships the migrations +
  code; Production deployment requires separate authorization and a
  `supabase db push` (or equivalent Management API call) to apply
  `20260816000000` and `20260816000100`.
- **Default `TELEPIZZA_WHATSAPP_MODE=disabled`** — no behavior change for
  existing deployments. Setting `TELEPIZZA_WHATSAPP_MODE=mock` enables the
  mock adapter (writes JSON files, no network). Setting `sandbox` or `live`
  requires all 5 `WHATSAPP_*` env vars.
- **Frontend wiring is a follow-up.** The existing `AdminWhatsApp.tsx` page
  still shows the honest-gap integration checks as `missing`. A separate PR
  will flip those to `present` once the admin routes (conversation list,
  send message) are wired.

---

## [1.8.1] — 2026-08-15

### Fixed

- **FU-1 (Issue #215, P2)** — `enforce_journal_entry_immutability()` bypass
  branch returned `new` (NULL for BEFORE DELETE) which silently cancelled
  DELETE operations when `app.bypass_immutability = 'on'` was set. The
  sibling function `enforce_journal_entry_line_immutability()` already had
  the correct pattern (returns `old` for DELETE-with-bypass); the entry-level
  function was inconsistent.
  - **Migration `20260815000000_adr_011_fix_bypass_delete.sql`** — redefines
    `enforce_journal_entry_immutability()` with the correct bypass-DELETE
    pattern: `if (TG_OP = 'DELETE') then return old; end if; return new;`
    inside the bypass branch. Idempotent (`create or replace function`),
    transactional (`begin/commit`), does NOT touch the line-level function
    (already correct) or any triggers.
  - **+15 regression tests** in `backend/api/tests/accounting-immutability.test.ts`
    (new describe block `ADR-011 FU-1 fix — bypass_immutability DELETE bug
    (Issue #215)`). Tests cover: the actual fix pattern (returns OLD for
    DELETE), absence of the old buggy pattern (bare `return new` after
    bypass check), preserved immutability guarantees (without bypass),
    idempotency, transactional safety, and non-interference with sibling
    function/triggers.
  - **Production verification**: 6 functional tests passed on Production
    Supabase (DELETE/UPDATE × bypass on/off). All existing data untouched.
  - **Backward compatibility**:
    | Scenario | Before fix | After fix |
    | --- | --- | --- |
    | bypass OFF + UPDATE posted entry | rejected | rejected (unchanged) |
    | bypass OFF + DELETE posted entry | rejected | rejected (unchanged) |
    | bypass ON + UPDATE posted entry | allowed | allowed (unchanged) |
    | bypass ON + DELETE posted entry | silently cancelled (BUG) | allowed (FIXED) |

---

## [Unreleased]

### Planned
- Phase 2.2 — Customer Support and WhatsApp Foundation
- Phase 2.3 — CRM and Authoritative Customer Master
- Phase 2.4 — Delivery and Rider Completion (POD, COD, GPS — ADR-008 through ADR-010)
- Phase 2.5 — Accounting and Profitability Depth (periods, CoGS, payroll posting)
- Phase 2.6 — AI Command Center (forecasts, drafts, approval inbox)
- Opening Operations Milestone 2 — Payments, Notifications, Device Verification
- Northern Bypass branch activation

---

## [1.8.0] — 2026-08-14

### Phase 2 foundations — Delivery State Machine + Accounting Immutability

This release introduces **database-enforced immutability** for two critical
lifecycles: deliveries (ADR-007) and journal entries (ADR-011). Both
implementations are additive — no existing flow changes — and ship with full
test coverage (82 new test cases).

### Added — ADR-007 Delivery State Machine (Phase 2.4 foundation)

- **Migration `20260814180000_adr_007_delivery_state_machine.sql`**
  - New `delivery_state_transitions` table (append-only audit log; UPDATE/DELETE
    rejected by trigger)
  - `trg_validate_delivery_state_transition` trigger on `deliveries` —
    enforces valid transitions per ADR-007:
    `pending → assigned | cancelled`
    `assigned → picked-up | cancelled | failed`
    `picked-up → delivered | failed`
    `delivered / failed / cancelled → (terminal)`
  - `delivery_valid_next_states(current_state)` SQL helper function
  - Lifecycle timestamps (`assigned_at`, `picked_up_at`, `delivered_at`)
    auto-populated by trigger
  - RLS policy for branch-scoped reads
- **TypeScript validator** `backend/api/src/services/deliveries/state-machine.ts`
  - `validNextDeliveryStates`, `isValidDeliveryTransition`,
    `assertValidDeliveryTransition`, `isTerminalDeliveryStatus`,
    `deliveryTimestampColumnForStatus`
  - Mirrors SQL rules exactly — produces 422 ApiError BEFORE DB rejects
- **Tests** `backend/api/tests/delivery-state-machine.test.ts` (82 cases,
  exhaustive transition matrix coverage)
- **ADR-007** status updated from PROPOSED → ACCEPTED
  (`docs/13-adr/ADR-007-delivery-state-machine.md`)

### Added — ADR-011 Accounting Immutability (Phase 2.5 foundation)

- **Migration `20260814180100_adr_011_accounting_immutability.sql`**
  - `trg_journal_entry_immutability` on `journal_entries` — blocks UPDATE/DELETE
    on posted entries except for the documented reversal flow:
    - `status: posted → voided` ✅ (used by `reverse_journal_entry_atomic`)
    - Setting `reversed_by_journal_id` / `reverses_journal_id` ✅ (linkage)
    - All other field changes ❌ (rejected with clear error)
  - `trg_journal_entry_line_immutability` on `journal_entry_lines` — blocks
    UPDATE/DELETE on lines of posted OR voided entries
  - Bypass hook `app.bypass_immutability = 'on'` for trusted future maintenance
    procedures (not used by application today)
- **Existing reversal RPC preserved** — `reverse_journal_entry_atomic()`
  continues to work unchanged (its operations are explicitly permitted)
- **Tests** `backend/api/tests/accounting-immutability.test.ts` — validates
  migration structure, confirms no conflict with existing RPC, verifies
  existing column reuse (no duplicates)
- **ADR-011** status updated from PROPOSED → ACCEPTED
  (`docs/13-adr/ADR-011-accounting-immutability.md`)

### Documentation

- New ADR artifacts: `docs/13-adr/ADR-007-*.md`, `docs/13-adr/ADR-011-*.md`
- `docs/00-governance/ADR_INDEX.md` updated with ADR-007, ADR-011 entries
- `docs/00-governance/REPOSITORY_STATUS.md` updated to reflect
  Phase 2.4 / 2.5 foundation merges

### Fixed (pre-merge hotfix in PR #212)

- ADR-007 RLS policy `delivery_transitions_branch_read` referenced
  `user_roles.status` which does not exist on that table. Changed to
  `user_roles.assignment_status = 'ACTIVE'` (the actual column, added in
  migration `20260728180000_opening_m1_people_floor_booking.sql`). Without
  this fix the migration failed at statement 16 during local Supabase seed
  with `SQLSTATE 42703: column ur.status does not exist`, which was the
  root cause of the initial Owner Playwright CI failure on the PR.

### Verification

- 742 backend tests pass (84 → 86 files, 660 → 742 tests; +82 new)
- 1065 db/static tests pass (unchanged)
- 0 type errors
- 0 vulnerabilities
- CI: Typecheck and test — PASS
- CI: Owner Playwright — PASS (after hotfix)
- CI: CodeQL Analyze + Dependency Scan — PASS
- Vercel Preview — Ready
- No breaking API changes
- No frontend behavior changes
- Additive migrations only — backward compatible

---

## [1.6.0] — 2026-08-14

### Phase 2 Configuration Control Plane + Identity Foundation

This release introduces the **Phase 2 configuration control plane** and the
**identity onboarding foundation**, replacing ad-hoc flat settings with a
governed, versioned, inheritance-aware configuration system, and establishing
tenant / owner / staff onboarding flows.

### Added — Phase 2.1 Configuration Schema & Effective-Value Contracts (PR #205)

- **`configuration_schemas`** table — canonical definition of configuration keys
  (scope_type `system` | `organization` | `branch`, data_type, default_value,
  is_secret, is_required, validation_rules JSONB)
- **`configuration_versions`** table — versioned configuration values with
  lifecycle (`draft` | `pending_approval` | `active` | `superseded` | `rolled_back`)
- **`configuration_change_log`** table — append-only audit trail (UPDATE/DELETE
  blocked by triggers)
- Effective-value resolution API: `Branch Override → Organization Default →
  System Fallback`
- Secrets boundary: `is_secret = true` values are masked in API responses
- Branch ownership enforcement — non-super-admin can only read/write their own
  branch configuration
- Audit hardening migration: `configuration_change_log` UPDATE/DELETE blocked
  via trigger; `configuration_versions` DELETE blocked via trigger
- API endpoints:
  - `GET /api/v1/admin/configuration/schemas`
  - `GET /api/v1/admin/configuration/effective`
  - `GET /api/v1/admin/configuration/versions`
  - `POST /api/v1/admin/configuration/drafts`
- Acceptance authority: Founder (ADR-001 + ADR-002 accepted 2026-08-06)
- Migration: `20260805190000_phase2_01_configuration_schema_versions.sql`
- Migration: `20260805200000_phase2_01_configuration_audit_hardening.sql`
- Tests: `backend/api/tests/admin-configuration.test.ts` (5 tests passing)

### Added — Phase 2.2 Settings Persistence Foundation (PR #206)

- Configuration persistence layer with versioned drafts
- Draft → activation → rollback lifecycle
- Settings UI foundation (admin)
- Migration: `20260806150140_phase2_02_settings_persistence_foundation.sql`
- Tests: `tests/database/phase2-settings-persistence-foundation.test.mjs`

### Added — Phase 2.3 Versioning, Activation & Rollback (PR #207)

- Settings versioning with full audit trail
- Activation workflow (super-admin only)
- Rollback to previous version (preserves version history)
- Migration: `20260806170223_phase2_03_versioning_activation_rollback.sql`
- Tests: `tests/database/phase2-configuration-versioning-activation-rollback.test.mjs`

### Added — IDENTITY-01 Tenant Owner & Staff Onboarding (PR #208)

- Tenant onboarding foundation (organization → owner → staff hierarchy)
- Owner onboarding flow with super-admin authorization
- Staff invitation and onboarding workflow
- Branch assignment during onboarding
- Audit trail for all onboarding events
- Migration: `20260807100000_identity_01_tenant_owner_onboarding.sql`
- Tests:
  - `tests/database/identity-01-tenant-owner-onboarding.test.mjs`
  - `tests/website/identity-01-onboarding-ui.test.mjs`
- Playwright: `playwright.identity-01.config.ts`
- Fixture: `scripts/identity-01/fixture-local.mjs`

### Added — Phase 2.4 Branch Readiness Control Plane (PR #209)

- Per-branch readiness gate (all required settings configured → ready)
- Branch readiness dashboard (admin)
- Readiness state machine: `pending → in_progress → ready → not_ready`
- Branch readiness API: `GET /api/v1/admin/branches/:id/readiness`
- Migration: included in Phase 2.1-2.3 schema
- Tests: `tests/database/phase2-04-branch-readiness-control-plane.test.mjs`
- Playwright: `playwright.phase2-04.config.ts`
- Fixture: `scripts/phase2-04/fixture-local.mjs`

### Added — Repository Polish

- `LICENSE` — MIT license with Mianx.ai + Telepizza brand carve-outs
- `CHANGELOG.md` — Keep a Changelog format (this file)
- `SECURITY.md` — vulnerability reporting policy
- `CONTRIBUTING.md` — contributor onboarding guide
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `.editorconfig` — cross-editor consistency rules
- `.nvmrc` — Node 22 LTS pin
- `.github/CODEOWNERS` — auto-request reviewers by path
- `.github/ISSUE_TEMPLATE/bug_report.md` — structured bug reports
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature requests
- `.github/PULL_REQUEST_TEMPLATE.md` — comprehensive PR checklist

### Removed

- `.vercel/` directories removed from git tracking (project IDs were leaked)
  - Now gitignored via `**/.vercel/` pattern
- Duplicate `supabase/.branches/` entry in `.gitignore` consolidated

### Security

- `configuration_change_log` is now append-only (UPDATE/DELETE blocked by trigger)
- `configuration_versions` rows cannot be deleted (trigger enforced)
- Branch ownership enforced server-side — cross-branch writes rejected
- Secrets masked in all API responses (`is_secret = true` schemas)
- Caller-supplied organization identity not trusted (resolved server-side)

### Acceptance

- ADR-001 (Branch Configuration Inheritance & Overrides) — **ACCEPTED** by Founder, 2026-08-06
- ADR-002 (Settings Versioning, Activation & Rollback Model) — **ACCEPTED** by Founder, 2026-08-06
- ADR-003 through ADR-015 remain **PROPOSED**

---

## [1.5.1] — 2026-08-04

### Phase 1.1 Professional Readiness

- POLISH-QA: certify Phase 1.1 professional readiness
- POLISH-07: harden website performance, network and privacy
- POLISH-06: harden Admin accessibility and responsive behavior
- POLISH-05: standardize Admin design system and data states
- POLISH-04: align business administration capability truth
- POLISH-03: professionalize restaurant operations workspaces
- POLISH-02: professionalize Owner Command Center hierarchy
- POLISH-01: admin shell navigation polish
- Production website smoke verified on `830dbc8…`
- Annotated tag `v1.5.1` created at `bfe60cc6a3074e08e61f85b458b19e724325eba4`

---

## [1.5.0] — 2026-08-03

### RC6 Phase 1 Final Closeout

- DASH-08: What Changed timeline
- DASH-07: EOD pack foundation
- DASH-06: Profitability truth
- DASH-05: Branch health score
- DASH-04: Approval inbox
- DASH-03: Daily command modes
- DASH-02: Actionable KPI drilldowns
- DASH-01: Owner dashboard depth
- UI-01: Admin label honesty

**Released with PASS WITH LIMITATIONS** — see `rc6-phase1-closeout/`

---

## [1.4.0] — 2026-08-02

### RC5 Final Closeout

- RC5-QA-01: CI Owner Playwright smoke
- RC5-OBS-01: Operator log alerting
- RC5-DOC-01: Living status honesty
- RC5-A11Y-01: Public home accessibility
- RC5-PERF-01: Entry bundle optimization
- RC5-TEST-01: Analytics schema guards
- RC5-OPS-01: Agents truth

---

## [1.3.0] — 2026-08-02

### RC4 Release Closeout

- RC4-FINAL: Final certification + security closeout
- RC4-PERFORMANCE: Performance polish
- RC4-PAYROLL: Payroll
- RC4-LOYALTY-MARKETING-DEPTH: Loyalty marketing depth
- RC4-INVENTORY-RECIPES: Inventory recipes
- RC4-FINANCE-PHASE2: Finance phase 2
- RC4-DOCUMENTS: Documents
- RC4-ANALYTICS-BI: Analytics BI
- RC4-OBSERVABILITY: Observability

---

## [1.2.0] — 2026-07-15

### Telepizza Brand Phase 1

- Initial brand-aligned website foundation
- Customer-facing menu, cart, checkout
- Admin ERP foundation (orders, products, customers, branches)
- Supabase/Postgres database foundation

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.6.0 | 2026-08-14 | Phase 2 configuration control plane + identity onboarding |
| 1.5.1 | 2026-08-04 | Phase 1.1 professional readiness polish |
| 1.5.0 | 2026-08-03 | RC6 Phase 1 final closeout |
| 1.4.0 | 2026-08-02 | RC5 final closeout |
| 1.3.0 | 2026-08-02 | RC4 release closeout |
| 1.2.0 | 2026-07-15 | Telepizza brand phase 1 |

---

[Unreleased]: https://github.com/mianimr4n/telepizza/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.6.0
[1.5.1]: https://github.com/mianimr4n/telepizza/releases/tag/v1.5.1
[1.5.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.5.0
[1.4.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.4.0
[1.3.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.3.0
[1.2.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.2.0
