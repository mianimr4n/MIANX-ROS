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
