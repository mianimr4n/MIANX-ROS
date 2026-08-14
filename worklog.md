# Telepizza — Multi-Agent Worklog

Shared work log across all agents working on the Telepizza codebase.
Append-only. Each section starts with `---`.

---
Task ID: phase-2.2-complete
Agent: main
Task: Complete Phase 2.2 WhatsApp Foundation follow-ups (PRs #220, #221, #222) + apply FU-1/FU-2/FU-3 migrations to Production

Work Log:
- Synced local main with origin (`f1be000` inbound worker merge).
- Built Phase 2.2 Follow-up PR #3 (outbound outbox worker + admin routes):
  - `backend/api/src/services/whatsapp/outbox-worker.ts` — drains outbound whatsapp_messages, calls adapter.sendMessage, exponential backoff with provider_next_attempt_at, permanently_failed on MAX_RETRIES, inserts 'message_sent'/'message_failed' audit events.
  - `backend/api/src/services/whatsapp/admin-service.ts` — service layer for conversations/messages/events/templates/send/assign/transition. Branch-scoped with super-admin bypass.
  - `backend/api/src/modules/admin/whatsapp.ts` — 11 routes (GET/POST/PATCH/DELETE for conversations + templates). express-rate-limit on all routes (60/min/IP). Auth: whatsapp.manage OR admin.access.
  - Wired into app-dependencies.ts + modules/index.ts + main.ts (outbox worker starts in non-prod or prod with TELEPIZZA_WHATSAPP_WORKER=1).
  - Fix migrations: `20260816000200` (immutability trigger `body` → `content` column reference) + `20260816000250` (provider_next_attempt_at column + partial index).
  - Tests: `backend/api/tests/whatsapp-outbox-worker.test.ts` (18 tests). 858 backend tests passing.
  - PR #220 merged as `0fac4b9`. CodeQL initially flagged 11 missing-rate-limiting alerts; resolved by adding `adminRateLimiter` to all 11 routes as the FIRST middleware.
- Built Phase 2.2 Follow-up PR #4 (frontend wiring + PII anonymization):
  - Frontend: flipped honest-gap language in WhatsAppIntegrationBanner ("WhatsApp inbox is live"), ConversationWorkspace (live conversation list + message thread + composer), MessageComposer (working form with 4096-char limit + outbox worker reference), WhatsAppKPIs (LIVE badge when conversationStats provided). Removed "Deferred capabilities" details block; replaced with "WhatsApp provider capabilities (Phase 2.2 — live)" block.
  - Admin API client: added 11 typed functions to `apps/website/client/src/lib/admin-api.ts` (listWhatsAppConversations, getWhatsAppConversation, listWhatsAppMessages, listWhatsAppConversationEvents, sendWhatsAppMessage, assignWhatsAppConversation, transitionWhatsAppConversationStatus, listWhatsAppTemplates, createWhatsAppTemplate, updateWhatsAppTemplate, deleteWhatsAppTemplate).
  - PII anonymization: `backend/api/src/services/whatsapp/pii-anonymization.ts` — runWhatsAppPiiAnonymization() + startWhatsAppPiiAnonymizationJob() lifecycle wrapper. Calls whatsapp_anonymize_pii() RPC with batched IDs (25 per call).
  - RPC migration: `20260816000300_add_whatsapp_anonymize_pii_rpc.sql` — SECURITY DEFINER function that sets app.bypass_message_immutability='on', UPDATEs whatsapp_messages + whatsapp_conversations PII fields to '[REDACTED]', INSERTs 'pii_anonymized' audit events. Restricted to service_role.
  - Tests: `backend/api/tests/whatsapp-pii-anonymization.test.ts` (9 tests). 867 backend tests passing.
  - Updated static tests: `tests/website/admin-whatsapp-order-center-v1.test.mjs` + `tests/website/operations-workspaces-polish-03.test.mjs` to assert the new live state (not the old "No conversation store" / "Planned for Phase 2" placeholders).
  - PR #221 merged as `0a447c4`.
- Hotfix PR #222 — FU-2 partial index cannot use `now()`:
  - The original migration `20260816000250` had a partial index with predicate `provider_next_attempt_at <= timezone('utc', now())` which PostgreSQL rejected (`42P17: functions in index predicate must be marked IMMUTABLE`).
  - Fix: drop the time-based filter from the partial index predicate. The index narrows to outbound+pending/failed rows only; the time check is applied at query time.
  - Also added `scripts/phase_2.2_fu_migrations_apply.py` (reusable migration script). Removed hardcoded Supabase token (env var only).
  - PR #222 merged as `f0dcdf8` (all 6 CI checks green including Owner Playwright).
- Applied FU-1/FU-2/FU-3 migrations to Production Supabase:
  - Preflight: confirmed whatsapp_messages table + content column + enforce_whatsapp_message_immutability function exist; provider_next_attempt_at + whatsapp_anonymize_pii do NOT exist (expected pre-migration).
  - Applied `20260816000200` (FU-1 immutability fix): OK. Verified function exists.
  - Applied `20260816000250` (FU-2 next_attempt_at column + index): OK. Verified column is nullable timestamptz.
  - Applied `20260816000300` (FU-3 anonymize_pii RPC): OK. Verified function is SECURITY DEFINER.
  - All 3 migrations successfully applied to Production Supabase (project `pyeowxvacgypohrbvgee`).

Stage Summary:
- ✅ **Phase 2.2 WhatsApp Foundation is FEATURE-COMPLETE.** 5 PRs merged:
  - PR #218: Foundation (ADR-003 + ADR-004 + migrations + webhook receiver)
  - PR #219: Inbound worker (drains whatsapp_inbound_events → whatsapp_messages + conversations)
  - PR #220: Outbound outbox worker + admin routes (11 endpoints) + FU-1/FU-2 fix migrations
  - PR #221: Frontend wiring (live conversation workspace + composer) + PII anonymization job + FU-3 RPC migration
  - PR #222: Hotfix — FU-2 partial index cannot use now() (STABLE not IMMUTABLE)
- ✅ **All migrations applied to Production Supabase**: ADR-003, ADR-004, FU-1 (immutability trigger fix), FU-2 (next_attempt_at column + partial index), FU-3 (anonymize_pii RPC).
- ✅ **867 backend tests passing** (was 824 at start of Phase 2.2 → +43 new tests across inbound worker, outbox worker, PII anonymization).
- ✅ **Frontend honest-gap language flipped**: AdminWhatsApp page now shows live conversations, working composer, live KPIs (where stats are provided), and "WhatsApp inbox is live (Phase 2.2)" banner.
- ⏳ **PENDING USER ACTIONS** (no code blockers):
  1. Set `TELEPIZZA_WHATSAPP_MODE=mock` on Render dashboard (foundation live without it).
  2. Set `TELEPIZZA_WHATSAPP_WORKER=1` on Render to enable inbound + outbound workers in Production.
  3. (Optional) Set `TELEPIZZA_WHATSAPP_PII_JOB=1` on Render to enable the 24-month PII anonymization job (or invoke via external cron).
- **Phase 2.2 status**: COMPLETE. Next Phase 2 workstreams remaining:
  - Phase 2.3: CRM (ADR-005, ADR-006) — not started
  - Phase 2.4: Rider & dispatch (ADR-008, ADR-009, ADR-010) — not started
  - Phase 2.5: Accounting events (ADR-012) — not started
  - Phase 2.6: AI (ADR-013) — not started

---
Task ID: phase-2.4-delivery-rider
Agent: main
Task: Complete Phase 2.4 (Delivery & Rider Completion) — ADR-008/009/010 end-to-end (docs + migration + services + admin routes + tests + PR + Production migration apply)

Work Log:
- Authored 3 ADR markdown files:
  - docs/13-adr/ADR-008-rider-location-retention.md (Rider GPS retention & privacy policy)
  - docs/13-adr/ADR-009-proof-of-delivery.md (POD data format & storage)
  - docs/13-adr/ADR-010-cod-financial-ownership.md (COD reconciliation + GL posting)
- Updated docs/00-governance/ADR_INDEX.md to mark ADR-008/009/010 as Accepted v1.0.
- Wrote single combined SQL migration: supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql (additive, ~700 lines):
  - Permission seed: delivery.access (granted to super-admin, branch-manager, customer-support, cashier, rider, kitchen)
  - ADR-008: rider_locations table, RLS (rider self + branch staff + super-admin), purge_expired_rider_locations() TTL function (24h retention, idempotent)
  - ADR-009: delivery_pod table (UNIQUE on delivery_id), RLS (rider + branch staff + customer), immutability trigger (block UPDATE/DELETE after delivered), extended ADR-007 transition validator to require POD before 'delivered'
  - ADR-010: cod_collections table (UNIQUE on delivery_id), RLS (rider + branch staff + branch-manager for reconcile), reconciliation state machine (pending → reconciled/shortage/overage), post_cod_collection_journal() trigger that fires create_journal_entry_atomic + finance_postings link (idempotent)
- Implemented 4 backend TypeScript modules:
  - backend/api/src/services/deliveries/rider-location-service.ts (ingest, listForDelivery, getLatestForRider)
  - backend/api/src/services/deliveries/rider-location-ttl.ts (runOnce + startRiderLocationTtlJob lifecycle wrapper)
  - backend/api/src/services/deliveries/pod-service.ts (capturePod, getPod, podExistsForDelivery)
  - backend/api/src/services/deliveries/cod-service.ts (recordCollection, getCollection, listCollections, reconcile, resolveShortageOrOverage)
- Implemented admin router: backend/api/src/modules/admin/delivery-rider.ts (10 endpoints, all rate-limited):
  - POST /rider-locations, GET /rider-locations/delivery/:id, GET /rider-locations/rider/:id/latest
  - POST /delivery-pod, GET /delivery-pod/:deliveryId
  - POST /cod/collections, GET /cod/collections, GET /cod/collections/:id
  - POST /cod/collections/:id/reconcile, POST /cod/collections/:id/resolve
- Wired dependencies: app-dependencies.ts (3 new services), modules/index.ts, modules/admin/routes.ts.
- Wired lifecycle: main.ts (startRiderLocationTtlJob + startWhatsAppPiiAnonymizationJob).
- Wrote 3 test files (51 new tests, all passing):
  - backend/api/tests/rider-location-service.test.ts (16 cases)
  - backend/api/tests/delivery-pod-service.test.ts (14 cases)
  - backend/api/tests/cod-service.test.ts (21 cases)
- Type-check clean. 918 backend tests passing total (was 867; +51 new).
- PR #223 was opened but merged empty (local branch state issue — commit b2b9ff5 ended up on local main instead of feature branch).
- PR #224 was opened with the actual code (commit c969316). All 6 CI checks passed (Typecheck, CodeQL, Analyze, Dependency Scan, Vercel Preview, Owner Playwright).
- FU-1 hotfix during CI: GET DIAGNOSTICS cannot use an expression on the LHS. Fixed by introducing v_batch_deleted temp variable. Committed as c969316.
- PR #224 squash-merged as 2eaaa9b.
- Applied migration to Production Supabase (project pyeowxvacgypohrbvgee):
  - Preflight: confirmed rider_locations, delivery_pod, cod_collections tables do NOT exist (expected).
  - Applied 20260817000000_adr_008_009_010_delivery_rider.sql via Supabase Management API (HTTP 201).
  - Verified: all 3 tables exist, all 5 functions exist (purge_expired_rider_locations, enforce_delivery_pod_immutability, post_cod_collection_journal, set_cod_updated_at, validate_delivery_state_transition), all 7 key columns exist, delivery.access permission seeded.

Stage Summary:
- ✅ **Phase 2.4 (Delivery & Rider Completion) is FEATURE-COMPLETE.**
  - PR #224 merged as 2eaaa9b.
  - Production Supabase migration applied + verified.
  - 918 backend tests passing (was 867 → +51 new tests).
- ✅ **All 3 ADRs implemented end-to-end:**
  - ADR-008 (Rider Location Retention): rider_locations table + TTL purge function + 3 admin endpoints + lifecycle job
  - ADR-009 (POD): delivery_pod table + immutability trigger + extended ADR-007 transition validator + 2 admin endpoints
  - ADR-010 (COD Financial Ownership): cod_collections table + reconciliation state machine + GL posting trigger via create_journal_entry_atomic + 5 admin endpoints
- ⏳ **PENDING USER ACTIONS** (no code blockers):
  1. (Optional) Set TELEPIZZA_RIDER_LOCATION_TTL_JOB=1 on Render to enable the hourly TTL purge job.
  2. Configure Supabase Storage bucket 'delivery-pod' on the Supabase dashboard (write for authenticated riders; read for branch staff + the order's customer).
  3. Configure chart_of_accounts rows for each branch: account_code='CASH' (ASSET) and account_code='ACCOUNTS_RECEIVABLE' (ASSET) — required for COD reconciliation to produce GL postings.
- **Phase 2.4 status**: COMPLETE. Next Phase 2 workstreams remaining:
  - Phase 2.3: CRM (ADR-005, ADR-006) — STARTING NEXT
  - Phase 2.5: Accounting events (ADR-012) — pending
  - Phase 2.6: AI (ADR-013, ADR-014, ADR-015) — pending
  - Phase 2.1: Settings (ADR-001, ADR-002) — partially done via migrations, ADR docs pending

---
Task ID: phase-2.3-crm
Agent: main
Task: Complete Phase 2.3 (CRM) — ADR-005/006 end-to-end (docs + migration + services + admin routes + tests + PR + Production migration apply)

Work Log:
- Authored 2 ADR markdown files:
  - docs/13-adr/ADR-005-canonical-customer-identity.md (canonical customers.id + customer_identities table)
  - docs/13-adr/ADR-006-customer-account-merge.md (merge_customers_atomic + 30-day reversal window)
- Updated docs/00-governance/ADR_INDEX.md to mark ADR-005/006 as Accepted v1.0.
- Wrote single combined SQL migration: supabase/migrations/20260818000000_adr_005_006_crm.sql (additive, ~700 lines):
  - Permission seed: customer.read (granted to super-admin, branch-manager, customer-support, cashier) + customer.merge (granted to super-admin only)
  - Extended customers.status CHECK with 'merged' value; added customers.merged_into_id column
  - ADR-005: customer_identities table (UNIQUE on identity_type+value), RLS, normalize_phone_e164() function, resolve_customer_by_identity() RPC, auto_create_customer_identities() INSERT trigger, backfill DO block with conflict logging
  - ADR-006: customer_merge_log table (append-only via trigger), merge_customers_atomic() RPC (transfers FKs from source→target, marks source merged, logs to merge_log), reverse_customer_merge() RPC (within 30-day window, transfers FKs back)
- Implemented 2 backend TypeScript services:
  - backend/api/src/services/customers/identity-service.ts (resolveCustomer, normalizePhone, getCustomer, listIdentities, addIdentity, searchCustomers)
  - backend/api/src/services/customers/merge-service.ts (mergeCustomers, reverseMerge, listMergeLog, getMergeLogEntry)
- Implemented admin router: backend/api/src/modules/admin/customers.ts (8 endpoints, all rate-limited):
  - GET /customers (search), GET /customers/:id, GET /customers/:id/identities, POST /customers/:id/identities, POST /customers/resolve
  - POST /customers/merge (super-admin only), POST /customers/merge/:id/reverse (super-admin only), GET /customers/merge-log
- Wired dependencies: app-dependencies.ts (2 new services), modules/index.ts, modules/admin/routes.ts.
- Wrote test file: backend/api/tests/customer-identity-merge-service.test.ts (36 cases, all passing).
- Type-check clean. 954 backend tests passing total (was 918; +36 new).
- PR #225 squash-merged as 59bf158 (all 6 CI checks green).
- Applied migration to Production Supabase (project pyeowxvacgypohrbvgee):
  - All 3 new tables verified (customer_identities, customer_merge_log, customer_identity_backfill_conflicts)
  - All 6 new functions verified (normalize_phone_e164, resolve_customer_by_identity, auto_create_customer_identities, merge_customers_atomic, reverse_customer_merge, enforce_merge_log_append_only)
  - All 5 key columns verified (customers.merged_into_id, customer_identities.identity_type, customer_identities.value, customer_merge_log.merge_window_expires_at, customer_merge_log.reversed_at)
  - Permissions customer.read + customer.merge seeded
  - Backfill: 0 customer_identities rows (no customers in production yet), 0 conflicts

Stage Summary:
- ✅ **Phase 2.3 (CRM) is FEATURE-COMPLETE.**
  - PR #225 merged as 59bf158.
  - Production Supabase migration applied + verified.
  - 954 backend tests passing (was 918 → +36 new tests).
- ✅ **All 2 ADRs implemented end-to-end:**
  - ADR-005 (Canonical Customer Identity): customer_identities table + normalize_phone_e164 + resolve_customer_by_identity + auto-create trigger + backfill + 5 admin endpoints
  - ADR-006 (Customer Account Merge): customer_merge_log + merge_customers_atomic + reverse_customer_merge + 3 admin endpoints (super-admin only)
- ⏳ **PENDING USER ACTIONS** (no code blockers):
  1. Frontend wiring (admin customer search + merge UI) — separate PR
  2. Duplicate detection job (scans customer_identities for potential duplicates) — separate PR
- **Phase 2.3 status**: COMPLETE. Next Phase 2 workstreams remaining:
  - Phase 2.5: Accounting events (ADR-012) — STARTING NEXT
  - Phase 2.6: AI (ADR-013, ADR-014, ADR-015) — pending
  - Phase 2.1: Settings (ADR-001, ADR-002) — partially done via migrations, ADR docs pending

---
Task ID: phase-2.5-audit
Agent: main
Task: Complete Phase 2.5 (Audit) — ADR-012 end-to-end (doc + migration + service + admin routes + tests + PR + Production migration apply)

Work Log:
- Authored docs/13-adr/ADR-012-domain-event-audit.md (centralized append-only domain_events table; cross-domain query projection; emit_domain_event RPC; AFTER INSERT triggers on existing audit tables to mirror events).
- Updated docs/00-governance/ADR_INDEX.md to mark ADR-012 as Accepted v1.0.
- Wrote SQL migration: supabase/migrations/20260819000000_adr_012_domain_event_audit.sql (additive):
  - Permission seed: audit.read (granted to super-admin, branch-manager, customer-support)
  - domain_events table (event_type CHECK format, domain enum, entity_id, branch_id, actor_user_id, actor_role, metadata JSONB, correlation_id, occurred_at)
  - 6 indexes (domain+entity, event_type, branch, actor, correlation, occurred_at) + GIN on metadata
  - RLS: branch-scoped read (branch staff see their branch + null branch events); service_role write
  - Append-only trigger (block UPDATE + DELETE)
  - emit_domain_event() helper RPC (validates event_type format)
  - AFTER INSERT triggers on existing audit tables to mirror events:
    - delivery_state_transitions → delivery.transitioned
    - customer_merge_log → customer.merged (also customer.merge_reversed on UPDATE of reversed_at)
    - whatsapp_conversation_events → whatsapp.<event_type> (conditional via DO block)
    - order_status_logs → order.transitioned (conditional via DO block)
- Implemented TypeScript service: backend/api/src/services/audit/domain-event-service.ts (emitEvent, listEvents, getEvent, listEventsForEntity, listEventsByCorrelation)
- Implemented admin router: backend/api/src/modules/admin/audit.ts (4 endpoints, all rate-limited):
  - GET /audit/events, GET /audit/events/:id, GET /audit/events/by-entity, GET /audit/events/by-correlation
- Wired dependencies: app-dependencies.ts, modules/index.ts, modules/admin/routes.ts.
- Wrote test file: backend/api/tests/domain-event-service.test.ts (17 cases, all passing).
- Type-check clean. 971 backend tests passing total (was 954; +17 new).
- FU-1 hotfix during CI: nested `$$` blocks cause syntax error. PostgreSQL parses inner `$$` as the end of the outer `do $$` block. Fixed by using distinct delimiters: outer `do $_$ ... $_$` and inner `as $func$ ... $func$`. Committed as 89b32b1.
- PR #226 squash-merged as 9af1d31 (all 6 CI checks green after fix).
- Applied migration to Production Supabase (project pyeowxvacgypohrbvgee):
  - domain_events table verified
  - All 6 functions verified (emit_domain_event, enforce_domain_events_append_only, mirror_delivery_transition_to_domain_events, mirror_customer_merge_to_domain_events, mirror_whatsapp_event_to_domain_events, mirror_order_transition_to_domain_events)
  - audit.read permission seeded

Stage Summary:
- ✅ **Phase 2.5 (Audit) is FEATURE-COMPLETE.**
  - PR #226 merged as 9af1d31.
  - Production Supabase migration applied + verified.
  - 971 backend tests passing (was 954 → +17 new tests).
- ✅ **ADR-012 implemented end-to-end:**
  - domain_events table + emit_domain_event RPC + append-only trigger
  - 4 mirror triggers on existing audit tables (delivery transitions, customer merges, whatsapp events, order transitions)
  - Branch-scoped RLS + correlation_id for cross-domain tracing
  - 4 admin endpoints (list, get, by-entity, by-correlation)
- **Phase 2.5 status**: COMPLETE. Next Phase 2 workstreams remaining:
  - Phase 2.6: AI (ADR-013, ADR-014, ADR-015) — STARTING NEXT
  - Phase 2.1: Settings (ADR-001, ADR-002) — partially done via migrations, ADR docs pending
