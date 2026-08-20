# Phase 13 — AI and Automation — Planning Document

**Status:** PHASE 13.0 FOUNDATIONAL BUILD SHIPPED (v3.0.0-rc.1) — ADR drafting + implementation in progress  
**Date:** 2026-08-16 (planning) · 2026-08-17 (Phase 13.0 foundational build)  
**Author:** Engineering (main agent audit + Explore subagent deep-dive + Phase 13.0 implementation)  
**Audit baseline:** Repository main `5ba2baf` (post-Phase 13 planning ship) · All 41 ADRs Accepted v1.0 · Production DB tip `20260821000000`  
**Related:** `docs/14-phases/MIANX-ROS-MASTER-ROADMAP.md` · `docs/13-adr/ADR-013-ai-provider-boundary.md` · `docs/13-adr/ADR-014-ai-approval-gate.md` · `docs/13-adr/ADR-015-ai-prompt-retention.md` · `docs/15-runbooks/FU-12-ai-provider-keys.md` · `worklog.md` (Task ID: `phase-13-audit`, `phase-13-planning`, `phase-13.0-foundational`)

---

## 1. Executive summary

Phase 13 (AI and Automation) is **UNLOCKED** with all dependencies satisfied (Phases 5–12 all PASS AND CLOSED). It is the broadest-scope phase to date, covering **8 scope items** drawn from the master roadmap:

1. Demand forecasting
2. Inventory prediction
3. Delivery optimization
4. Support AI
5. Marketing automation
6. Fraud signals
7. Mianx.ai agents (elevation from deterministic to LLM-backed)
8. Operational AI teams

Unlike Phases 5–12 (which were all closeout-only — no new migrations, no new code), **Phase 13 is a CODE phase**. It requires:
- A **foundational build** (cross-cutting prerequisite): the `provider-proxy.ts` HTTP client service referenced in ADR-013 §"Implementation references" but never built. Without this, no LLM call can be made and no `ai_call_logs` row is ever written.
- **5 new ADRs** (ADR-042 through ADR-046) proposed below — each accepting one or two scope items and tracking deferred work with explicit trigger conditions.
- **New migrations** for AI feature tables (sentiment columns on `whatsapp_messages`, `rider_shifts` + `rider_daily_summaries` for auto-dispatch, `support_tickets` for support AI, campaign scheduler tables for marketing automation, fraud signal tables).
- **New backend services** (provider-proxy, demand-forecast-service, auto-dispatch-engine, sentiment-analyzer, campaign-scheduler, fraud-detector, agent-execution-runtime).
- **New admin UI pages** for each AI surface.
- **New Operator Follow-up** FU-12: provision `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars + seed `ai_provider_configs` rows.

---

## 2. Audit findings

### 2.1 AI governance foundation is SOLID (Phase 2.6 v1.9.0)

ADR-013 (AI Provider Boundary), ADR-014 (AI Approval Gate), ADR-015 (AI Prompt Retention) are all **ACCEPTED v1.0** since 2026-08-14. The 3 contracts cover:

| ADR | Contract | Implementation |
| --- | --- | --- |
| ADR-013 | Backend-proxy-only AI calls with regex PII redaction | `ai_provider_configs` table + `ai_call_logs` table + `pii-redaction.ts` service ( regex-based PII stripping) |
| ADR-014 | Advisory-only AI with mandatory human approval + 9-action-type allowlist | `ai_action_approvals` table (9 action types: `customer.refund`, `order.cancel`, `marketing.send_campaign`, `menu.price_change`, `inventory.adjust`, `user.suspend`, `payment.void`, `pos.shift_close`, `branch.settings_change`) + `approval-service.ts` + `prompt-log-service.ts` |
| ADR-015 | Never-store-raw-prompts with 90-day/24-month hashed-metadata retention | `ai_prompt_hashes` table + `prompt-log-service.ts` (hashes prompts before logging) |

Migration `20260820000000_adr_013_014_015_ai.sql` (411 lines) shipped all 7 tables + 1 RPC + 3 permissions (`ai.use` / `ai.read` / `ai.approve`). All infrastructure is in place — **except the actual LLM HTTP client**.

### 2.2 The single biggest gap: `provider-proxy.ts` was NEVER BUILT

ADR-013 §"Implementation references" lists `provider-proxy.ts` as the canonical AI HTTP client. **It does not exist.** Only 4 supporting services exist:

| File | Lines | Purpose |
| --- | --- | --- |
| `backend/api/src/services/ai/pii-redaction.ts` | ~150 | Regex-based PII stripping (phone, email, CNIC, card) |
| `backend/api/src/services/ai/approval-service.ts` | ~250 | ADR-014 approval-gate workflow |
| `backend/api/src/services/ai/prompt-log-service.ts` | ~200 | ADR-015 hashed-prompt logging |
| `backend/api/src/services/ai/platform.ts` | ~350 | Provider config + capability registry |

**Total: ~950 lines of supporting infra, 0 lines of actual LLM HTTP client.** This is the foundational Phase 13 build target. Without `provider-proxy.ts`:
- No LLM call can be made
- No `ai_call_logs` row is ever written
- ADR-013's "backend-proxy-only" contract has no enforcement mechanism
- All 5 proposed ADRs below are blocked

### 2.3 `aiMode` env-var integration missing

`backend/api/src/config/env.ts` defines 4 integration modes today: `emailMode`, `whatsappMode`, `paymentMode`, `webhookMode`. **There is no `aiMode`.** This means:
- No graceful "AI disabled in this environment" fallback
- No way to enable AI in staging without affecting production
- No way to run the test suite without mocking the AI provider

`aiMode` must be added to `config/env.ts` with the same pattern as the existing 4 modes (stub / live / disabled).

### 2.4 Mianx.ai is a BRAND, not an LLM integration

The 14 "Mianx.ai agents" in `apps/website/client/src/lib/mianx-team.ts` (566 lines) are **typed client-side deterministic rule cards** rendered in `apps/website/client/src/pages/admin/AdminAiTeam.tsx` (551 lines) at `/admin/ai-team`. They:
- ✅ READ operational state (orders, kitchen, delivery, finance, inventory)
- ✅ Surface Status → Problem → Next Action
- ❌ CANNOT act (no state-mutating capability)
- ❌ CANNOT call LLMs (no ADR-013 proxy integration)
- ❌ CANNOT execute workflows (no agent-execution runtime)

The 6 seeded `ai_teams` DB rows (executive / customer-experience / marketing / restaurant-operations / finance / analytics) are **empty containers** — 0 agents seeded in the `ai_agents` table.

**Phase 13 scope items 7-8** elevate these to LLM-backed agents via ADR-013 proxy + ADR-014 approval gate. This is the most ambitious part of Phase 13.

### 2.5 Five explicit AI deferrals in Phase 12 closeout ADRs target Phase 13

| ADR | § | Deferred item | Trigger condition |
| --- | --- | --- | --- |
| ADR-039 | §8.2 | Customer push notifications | Depends on Phase 13 marketing automation campaign scheduler |
| ADR-040 | §8.4 | Rider push notifications | Depends on Phase 13 marketing OR dedicated push service |
| ADR-040 | §8.8 | Auto-dispatch engine | Phase 13 — rider scoring by proximity/load, auto-assign on `confirmed` |
| ADR-041 | §8.12 | AI-driven kitchen prediction | 90+ days kitchen history available |
| ADR-041 | §8.17 | Sentiment analysis + auto-reply bot | WhatsApp volume >100/day |

### 2.6 Data foundation is MATURE for most AI use cases

| Data source | Maturity | AI use cases |
| --- | --- | --- |
| `orders` + `order_items` | ✅ Mature (Phase 4/5) | Demand forecasting, sales prediction |
| `stock_movements` | ✅ Mature (Phase 10) | Inventory prediction, supplier lead-time prediction |
| `deliveries` + `delivery_pod` | ✅ Mature (Phase 9) | ETA prediction, delivery optimization |
| `rider_locations` (24h TTL) | ✅ Mature (Phase 9 / ADR-008) | Auto-dispatch proximity scoring |
| `journal_entries` + `finance_postings` | ✅ Mature (Phase 11) | Fraud signal — journal anomaly detection |
| `payments` (8-state) | ✅ Mature (Phase 7/11) | Fraud signal — payment anomaly detection |
| `loyalty_point_ledger` + `coupon_redemptions` | ✅ Mature (Phase 6) | Marketing automation — segmentation |
| `whatsapp_messages` (24-month retention) | ✅ Mature (Phase 2 / ADR-004) | Support AI — sentiment + auto-reply |
| `domain_events` | ✅ Mature (Phase 5 / ADR-012) | Fraud signal — cross-domain anomaly |
| `otp_attempts` audit | ✅ Mature (Phase 3 / ADR-016/017) | Fraud signal — login anomaly |

**10 data gaps** identified (most notable): `rider_daily_summaries`, `inventory_cost_history`, `refunds` table, `support_tickets`, scheduled-reports worker, warehouse materialized views. Each gap is tracked in the relevant ADR's deferred-items section.

---

## 3. Phase 13 scope proposal — 5 candidate ADRs

Following the established closeout pattern (Phase 5 had 1 ADR, Phase 6/7 had 4, Phase 8/9/10/11/12 had 3 each), **Phase 13 proposes 5 ADRs** given it is the broadest-scope phase to date (8 scope items vs 3-6 for prior phases).

### ADR-042 — Demand Forecasting & Inventory Prediction Contract

**Scope:** Establishes the demand-forecasting AI surface. Builds a 7/14/30-day demand forecast per `menu_item` per `branch` consuming 24-month `orders` + `order_items` history. Adds inventory prediction (low-stock forecast, reorder-timing prediction, supplier lead-time prediction) consuming `stock_movements` + `purchase_orders` + `inventory_recipes`. Closes ADR-035 §9 carry-forward (supplier lead-time prediction). All forecasts are advisory-only — no automatic reorder or menu-item changes (ADR-014 approval gate applies if action is taken).

**Key deferred items it would track:**
- Warehouse materialized views (daily/weekly/monthly aggregates per menu_item × branch)
- `inventory_cost_history` table (ADR-034 §10 — needed for cost-aware reorder recommendations)
- Forecast accuracy tracking (`forecast_vs_actual` table)
- Menu seasonality features (weather, holidays, local events)
- Demand-forecast admin UI page (`/admin/ai/forecast`)
- New action type `inventory.auto_reorder` (addition to `ai_action_approvals.action_type` CHECK constraint — migration required)

### ADR-043 — Delivery Optimization & Auto-Dispatch Contract

**Scope:** Establishes the delivery-optimization AI surface. Builds the auto-dispatch engine (DEFERRED ADR-040 §8.8) that scores riders by proximity + load + last-assignment-time on `orders.status='confirmed'`. Adds ETA prediction per delivery (consuming `rider_locations` 24h TTL + `deliveries` history). Closes ADR-040 §8.8 + §8.13 (average distance computation) + §8.16 (delivery SLA tracking) deferrals. All dispatch suggestions flow through ADR-014 approval gate (new action type `delivery.auto_dispatch` to be added to the CHECK allowlist via migration).

**Key deferred items it would track:**
- `rider_shifts` table (ADR-040 §8.7 prerequisite — "who is active")
- `rider_daily_summaries` table (ADR-040 §8.9 — per-rider KPI features)
- `orders.delivery_lat/lng` columns (ADR-040 §8.13 — haversine distance)
- `delivery_sla_thresholds` per branch + `deliveries.sla_due_at` (ADR-040 §8.16)
- Failed-delivery capture + redelivery flow (ADR-040 §8.14 — needed for ETA model training labels)
- Auto-dispatch action type addition to `ai_action_approvals.action_type` CHECK constraint

### ADR-044 — Support AI & WhatsApp Sentiment Auto-Reply Contract

**Scope:** Establishes the support-AI surface. Builds sentiment analysis per WhatsApp message + auto-reply bot for common queries (order status, hours, menu) + human handoff on negative sentiment or complex query (DEFERRED ADR-041 §8.17). Consumes the mature `whatsapp_messages` 24-month retention corpus. All auto-replies flow through ADR-013 provider proxy (LLM generates response) + ADR-014 approval gate (state-mutating actions like `customer.refund` already in allowlist). Closes ADR-041 §8.17 deferral.

**Key deferred items it would track:**
- `support_tickets` table (ADR-041 §8.14 — structured training data; currently WhatsApp-only)
- Customer 360 unified view (ADR-041 §8.13 — context for support AI handoff)
- Auto-routing WhatsApp to support agent (ADR-041 §8.16 — rules engine shares routing infra with AI handoff)
- Refund initiation workflow (ADR-041 §8.15 — closes refunds loop for AI-suggested refunds)
- Sentiment classification schema (positive/neutral/negative + confidence score) — likely `whatsapp_messages.sentiment_label` + `sentiment_score` columns
- Auto-reply template library + A/B testing framework
- Human-handoff escalation rules (negative sentiment → senior agent; complex query → human)

### ADR-045 — Marketing Automation & Campaign AI Contract

**Scope:** Establishes the marketing-automation surface. Builds the campaign scheduler (the dependency that ADR-039 §8.2 customer push notifications + ADR-040 §8.4 rider push notifications both wait on). Adds AI-assisted segment definition (natural-language → SQL segment via ADR-013 proxy), AI-assisted campaign content generation (subject lines, WhatsApp message body, push notification copy), and send-time optimization. Consumes the mature `loyalty_point_ledger` + `coupon_redemptions` + `customer_identities` data. Closes ADR-039 §8.2 + ADR-040 §8.4 push-notification dependencies. Adds new `marketing.send_campaign` action type to `ai_action_approvals` (already in allowlist).

**Key deferred items it would track:**
- Campaign scheduler (the Phase 13 dependency for push notifications)
- FCM project onboarding (FU-11 Operator Follow-up — push notifications infra)
- Web Push API integration for installed PWA (ADR-039 §8.2)
- Rider push notifications (ADR-040 §8.4 — FCM + APNs)
- Birthday reward job (ADR-039 §8.7 — scheduled `loyalty_point_ledger` entry on birthday)
- Tiered loyalty (ADR-039 §8.8 — `loyalty_tiers` table; trigger: >5,000 active members)
- AI-assisted segment definition (NL → SQL via ADR-013 proxy)
- Send-time optimization (per-customer best-send-time model)
- Campaign A/B testing + performance attribution

### ADR-046 — Fraud Signals & Mianx.ai Operational AI Teams Elevation Contract

**Scope:** Establishes the fraud-signal surface AND formalizes the elevation of the 14 deterministic Mianx.ai agents to LLM-backed operational AI teams. On the fraud side: builds anomaly-detection service consuming `otp_attempts` IP+user-agent audit (ADR-016/017 mentions) + `journal_entries` + `payments` + `domain_events` cross-domain log; surfaces fraud signals to Security & Access Agent (agent #13). On the Mianx.ai side: bridges the client-side `MIANX_AGENT_REGISTRY` (14 typed agents in `lib/mianx-team.ts`) to the DB `ai_agents` table (currently empty), builds the agent-execution runtime on top of `ai_tasks` (6-state machine exists but no executor), and elevates each agent from deterministic-rules-only to LLM-assisted reasoning via ADR-013 proxy. Closes ADR-041 §8.12 (AI-driven kitchen prediction — consumed by Kitchen Control Agent #5) + the implicit ADR-016/017 fraud-detection deferral.

**Key deferred items it would track:**
- Fraud-signal service (login anomaly, journal anomaly, payment anomaly, refund-abuse pattern)
- `refunds` table (ADR-038 §8 / ADR-041 §8.15 — refund-fraud signal needs operational refund lifecycle)
- `discounts` master table (ADR-038 §8 — discount-abuse signal needs discount-reason audit)
- 14 Mianx agents seeded into `ai_agents` DB table (currently only client-side typed definitions)
- Agent-execution runtime (background worker draining `ai_tasks` 6-state machine — currently no executor)
- AI-driven kitchen prediction (ADR-041 §8.12 — predicted prep time per ticket; consumed by Kitchen Control Agent)
- `kitchen_ticket_sla_due_at` column (ADR-041 §8.7 — training labels for kitchen prediction)
- Refresh `docs/11-ai/AGENT_REGISTRY.md` + `MIANX_AI_TEAM_OPERATING_MODEL.md` (last verified 2026-07-28 — STALE, predates Phase 5-12)
- Mianx.ai agent → ADR-014 action-type mapping (which agents can suggest which action types)

---

## 4. Alternative: 3-ADR consolidation

If the owner prefers the recent Phase 8-12 cadence of 3 ADRs per phase, the natural consolidation is:

| Consolidated ADR | Title | Closes |
| --- | --- | --- |
| **ADR-042** | Demand Forecasting + Inventory + Procurement AI | Scope items 1-2 + ADR-035 carry-forward |
| **ADR-043** | Delivery Optimization + Support AI + Marketing Automation | Scope items 3-5; closes ADR-039 §8.2, ADR-040 §8.4/§8.8, ADR-041 §8.17 |
| **ADR-044** | Fraud Signals + Mianx.ai Operational AI Teams Elevation | Scope items 6-8; closes ADR-041 §8.12 + ADR-016/017 implicit |

**Recommendation:** 5 ADRs. Phase 13 is the broadest-scope phase to date (8 items vs 3-6 for prior phases), and the 5-ADR proposal gives clean 1:1 mapping for most scope items. The 3-ADR consolidation would make each ADR ~30% larger and harder to review.

---

## 5. Cross-cutting prerequisite (BLOCKS all 5 ADRs)

**Build `provider-proxy.ts`** — the foundational AI HTTP client service. This is referenced in ADR-013 §"Implementation references" but never implemented. Without this:

1. No LLM call can be made (no HTTP client to call OpenAI/Anthropic)
2. No `ai_call_logs` row is ever written (no place to log the call)
3. ADR-013's "backend-proxy-only" contract has no enforcement mechanism
4. All 5 proposed ADRs are blocked (every AI feature requires LLM calls)

**Implementation plan:**

```text
backend/api/src/services/ai/provider-proxy.ts  (~400 lines)
  - callLLM(prompt, options) → LLMResponse
  - Provider routing (OpenAI / Anthropic / both — based on ai_provider_configs)
  - PII redaction (calls pii-redaction.ts before sending prompt)
  - ai_call_logs row insertion (always, regardless of success/failure)
  - ai_prompt_hashes row insertion (ADR-015 hashed-prompt logging)
  - Rate limiting + retry (per-provider)
  - Error handling + fallback (OpenAI → Anthropic or vice versa)
  - Cost tracking (token count + USD cost per call)
```

Plus:
- Wire `aiMode` into `backend/api/src/config/env.ts` (stub / live / disabled — same pattern as `emailMode` / `whatsappMode` / `paymentMode` / `webhookMode`)
- New Operator Follow-up **FU-12**: provision `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars per ADR-003 + seed `ai_provider_configs` rows

**Estimated effort:** 2-3 days of focused engineering (provider-proxy + env wiring + integration tests + FU-12 documentation).

---

## 6. Owner decisions required

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | ADR count | 5 ADRs (proposed) vs 3 ADRs (consolidated) | **5 ADRs** — cleaner 1:1 mapping for 8 scope items |
| 2 | LLM provider | OpenAI vs Anthropic vs both | **Both** — `ai_provider_configs` supports multiple; OpenAI for chat/code, Anthropic for long-context reasoning |
| 3 | Auto-dispatch action type | Add `delivery.auto_dispatch` to `ai_action_approvals.action_type` CHECK constraint? | **Yes** — required for ADR-043; migration is straightforward |
| 4 | Mianx agent → team mapping | Which of the 6 seeded `ai_teams` does each of the 14 agents belong to? | **Engineering proposal:** Executive (3 agents: Strategy / Finance / Performance), Customer Experience (3: Support / Loyalty / Feedback), Marketing (2: Campaigns / Segmentation), Restaurant Operations (3: Kitchen / Delivery / Inventory), Finance (2: Reconciliation / Compliance), Analytics (1: Insights) |
| 5 | Phase 13 sequencing | Foundational build first (provider-proxy) then 5 ADRs in parallel, OR sequential? | **Foundational first, then sequential** — provider-proxy blocks everything; ADRs build on each other (e.g. ADR-046 Mianx elevation consumes ADR-042/043/044/045 surfaces) |

---

## 7. Implementation roadmap (proposed)

```text
Phase 13.0 — Foundational Build (BLOCKS all ADRs)
  ├── Build provider-proxy.ts (~400 lines)
  ├── Wire aiMode into config/env.ts
  ├── Integration tests (mocked LLM provider)
  ├── FU-12 documentation (Operator Follow-up)
  └── Estimate: 2-3 days

Phase 13.1 — ADR-042 Demand Forecasting & Inventory Prediction
  ├── Migration: forecast_accuracy + warehouse materialized views
  ├── Service: demand-forecast-service.ts
  ├── UI: /admin/ai/forecast
  └── Estimate: 5-7 days

Phase 13.2 — ADR-043 Delivery Optimization & Auto-Dispatch
  ├── Migration: rider_shifts + rider_daily_summaries + orders.delivery_lat/lng + delivery_sla_thresholds + ai_action_approvals action_type addition
  ├── Service: auto-dispatch-engine.ts + eta-predictor.ts
  ├── UI: /admin/ai/dispatch
  └── Estimate: 7-10 days

Phase 13.3 — ADR-044 Support AI & WhatsApp Sentiment Auto-Reply
  ├── Migration: whatsapp_messages.sentiment_label/sentiment_score + support_tickets
  ├── Service: sentiment-analyzer.ts + auto-reply-bot.ts
  ├── UI: /admin/ai/support
  └── Estimate: 5-7 days

Phase 13.4 — ADR-045 Marketing Automation & Campaign AI
  ├── Migration: campaigns + campaign_segments + campaign_sends + ai_campaign_generations
  ├── Service: campaign-scheduler.ts + segment-builder.ts + content-generator.ts
  ├── UI: /admin/ai/marketing
  ├── Operator action: FCM project onboarding (FU-11 carry-forward)
  └── Estimate: 7-10 days

Phase 13.5 — ADR-046 Fraud Signals & Mianx.ai Operational AI Teams Elevation
  ├── Migration: fraud_signals + refunds (carry-forward from ADR-038 §8) + discounts (carry-forward from ADR-038 §8) + ai_agents seed (14 agents) + kitchen_ticket_sla_due_at
  ├── Service: fraud-detector.ts + agent-execution-runtime.ts
  ├── UI: /admin/ai/fraud + /admin/ai-team (elevation of existing page)
  ├── Docs refresh: AGENT_REGISTRY.md + MIANX_AI_TEAM_OPERATING_MODEL.md
  └── Estimate: 10-14 days

Phase 13.6 — Closeout
  ├── PHASE13_FINAL_GATE.md
  ├── v3.0.0 release notes (Phase 13 is major — bumps minor version)
  ├── CHANGELOG entry
  ├── Roadmap update (Phase 14 UNLOCKED)
  └── Estimate: 1-2 days
```

**Total estimated effort:** 37-53 engineering days (~7-10 weeks at solo pace).

---

## 8. Versioning proposal

Phase 13 is a **major release** — first code phase since Phase 4 (v1.7.0), and the first to introduce AI/LLM integration. Proposed versioning:

- **v3.0.0** — Phase 13 complete (all 5 ADRs accepted + foundational build shipped)
- **v3.0.0-rc.1** — Phase 13.0 (foundational build) complete — optional release candidate
- **v3.0.0-rc.2** — Phase 13.1 + 13.2 complete — optional release candidate
- etc.

The jump from v2.7.x → v3.0.0 reflects:
1. First AI/LLM integration in Production
2. First new migrations since Phase 3 (Production DB tip advances from `20260821000000`)
3. First major-scope phase (5 ADRs vs 1-4 for prior phases)

Alternative: keep v2.x versioning and ship as v2.8.0 — but this understates the scope.

---

## 9. Risk register

| Risk | Mitigation |
| --- | --- |
| LLM provider API key leakage | ADR-003 provider-secret-boundary + `ai_provider_configs` encrypted storage + `provider-proxy.ts` server-side only (never expose key to client) |
| LLM hallucination causing real-world action | ADR-014 approval gate — all state-mutating AI suggestions require human approval before execution |
| Prompt injection attack | ADR-013 PII redaction + input sanitization in `provider-proxy.ts` + system-prompt hardening |
| Runaway LLM costs | Per-call cost tracking in `ai_call_logs` + daily budget threshold + alerting |
| Customer-facing AI errors (sentiment auto-reply) | Human handoff on negative sentiment + 24-hour review window before auto-reply goes live + A/B testing |
| Auto-dispatch misroutes | Advisory-only mode for first 30 days (BM approves each dispatch) + rollback to manual dispatch |
| Forecast accuracy low | Track `forecast_vs_actual` + auto-disable forecast UI if accuracy <70% for 7 consecutive days |

---

## 10. Acceptance gate

Phase 13 is PASS AND CLOSED when:

- [ ] All 5 ADRs (ADR-042 through ADR-046) Accepted v1.0 with standalone files under `docs/13-adr/`
- [ ] `provider-proxy.ts` built + integration tests passing
- [ ] `aiMode` wired into `config/env.ts`
- [ ] All 5 AI feature UI pages live in Production (`/admin/ai/forecast`, `/admin/ai/dispatch`, `/admin/ai/support`, `/admin/ai/marketing`, `/admin/ai/fraud`)
- [ ] 14 Mianx agents seeded into `ai_agents` DB table + agent-execution runtime draining `ai_tasks`
- [ ] `docs/11-ai/AGENT_REGISTRY.md` + `MIANX_AI_TEAM_OPERATING_MODEL.md` refreshed to Phase 13 baseline
- [ ] FU-12 documentation complete (Operator Follow-up for AI provider API keys)
- [ ] Production DB tip advanced (new migrations applied)
- [ ] Backend tests passing (target: 1200+ tests, up from 1096 in Phase 12)
- [ ] 6/6 CI checks PASS on closeout PR
- [ ] GitHub Release v3.0.0 published
- [ ] Phase 14 (Full Integration and QA) UNLOCKED

---

## 11. Next actions

1. **Owner reviews this planning document** — approve / modify / reject the 5-ADR scope + cross-cutting prerequisite + owner decisions.
2. **Owner answers the 5 decisions in §6.**
3. **Engineering begins Phase 13.0 (foundational build)** — `provider-proxy.ts` + `aiMode` env wiring + FU-12 documentation.
4. **Engineering drafts ADR-042 through ADR-046** as standalone markdown in `docs/13-adr/` following the established ADR template.
5. **Engineering implements Phase 13.1 through 13.5** sequentially per the roadmap in §7.
6. **Engineering ships Phase 13.6 closeout** — PHASE13_FINAL_GATE.md + v3.0.0 release notes + CHANGELOG + roadmap update.

---

**Phase 13 planning status:** AWAITING OWNER REVIEW.

---

## 12. Phase 13.0 Foundational Build — SHIPPED (2026-08-17)

Phase 13.0 (the cross-cutting prerequisite from §5) has been built and
shipped as `v3.0.0-rc.1`. This unblocks all 5 ADRs (ADR-042 through
ADR-046) for implementation.

### What was built

| Artifact | Path | Lines |
|---|---|---|
| **`provider-proxy.ts`** — the foundational AI HTTP client | `backend/api/src/services/ai/provider-proxy.ts` | ~600 |
| **`aiMode` env-var wiring** — stub / sandbox / live / disabled | `backend/api/src/config/env.ts` (+32 lines) | ~32 |
| **FU-12 Operator Follow-up** — provider API keys runbook | `docs/15-runbooks/FU-12-ai-provider-keys.md` | ~220 |
| **Integration tests** — 18 tests covering PII redaction, rate limiting, provider routing, mock/live modes | `backend/api/tests/ai-provider-proxy.test.ts` | ~530 |
| **`.env.example` documentation** — `TELEPIZZA_AI_MODE` + provider keys | `.env.example` | +15 lines |

### ADR-013 §1-7 contract enforcement

The proxy enforces every rule in ADR-013:

1. **§1 Backend-proxy-only** — this service is the ONLY way to call
   an LLM from the Telepizza backend. No `fetch("https://api.openai.com")`
   exists outside this file.
2. **§2 PII redaction before forwarding** — `redactPii()` from
   `pii-redaction.ts` is called on the prompt BEFORE the HTTP call.
   Tests verify the provider never sees raw phone/email/CNIC/card.
3. **§3 Provider credentials in env vars only** — keys resolved from
   `process.env.OPENAI_API_KEY` / `ANTHROPIC_API_KEY`. NEVER read from
   `ai_provider_configs` (which stores only non-secret metadata).
4. **§4 Per-call audit log** — `promptLogService.logCall()` is called
   on every code path: success, HTTP failure, missing-API-key failure,
   provider-not-configured failure. The catch-all ensures no LLM call
   ever escapes audit.
5. **§5 Rate limiting** — in-memory token bucket: 60 calls/min/user +
   120 calls/min/IP-hash. Tested end-to-end (the 61st call returns
   `429 AI_RATE_LIMIT_USER`).
6. **§6 Provider allowlist** — only providers in `ai_provider_configs`
   with `is_active=true` can be called. Missing config row throws
   `400 AI_PROVIDER_NOT_CONFIGURED`.
7. **§7 Response redaction** — `redactPii()` is run on the completion
   text BEFORE returning to the caller (defense-in-depth against the
   model echoing PII back).

### ADR-015 §1 (no raw prompts) enforcement

The proxy never stores raw prompts. It:
- Hashes the redacted prompt via `promptLogService.logCall()` (which
  computes SHA-256 internally before inserting into `ai_call_logs`)
- Stores `prompt_token_count`, `prompt_char_count`, `prompt_language`
  as derived metadata, NOT raw text
- The `prompt_sha256` column in `ai_call_logs` is the SHA-256 of the
  redacted prompt, not the raw prompt

### Test coverage

18 integration tests cover:

- **aiMode=disabled** — refuses calls, writes no log row
- **aiMode=mock** (default local/test) — deterministic stub, no HTTP,
  still writes log row, redacts PII in echo
- **aiMode=live** — real `fetch` (mocked in tests):
  - OpenAI Chat Completions routing + Bearer auth + body shape
  - Anthropic Messages API routing + `x-api-key` + `anthropic-version`
  - PII redaction in prompt BEFORE HTTP call (assertion: provider
    sees `[PHONE]`, not `+923001234567`)
  - PII redaction in response BEFORE returning (assertion: caller
    sees `[PHONE]`, not the model echoing `+923001234567`)
  - HTTP 5xx failure → logs `success=false` with error message,
    rethrows as `AI_PROVIDER_HTTP_ERROR`
  - Missing API key → throws `AI_API_KEY_MISSING`, logs failure row
  - Provider config's `default_model` used when no model option given
- **Provider routing** — explicit provider vs first-active fallback
  vs not-configured vs no-active-provider-anywhere
- **Rate limiting** — 61st user call returns 429; 121st IP call
  returns 429 (uses `__testInternals.__resetBuckets()` between tests)
- **Input validation** — empty prompt + non-string prompt both
  throw `400 INVALID_PROMPT`

### Test result

```
✓ tests/ai-provider-proxy.test.ts (18 tests) 24ms
Test Files  1 passed (1)
Tests  18 passed (18)
```

Full backend suite: **101 test files, 1115 tests passing** (was 1096
in Phase 12 closeout → +19 net new = 18 provider-proxy tests +
the makeEnvStatus consistency updates to 4 whatsapp tests).

### Owner decisions carried forward (defaults applied)

| # | Decision | Default applied | Status |
|---|---|---|---|
| 1 | ADR count | **5 ADRs** (per §3 recommendation) | Awaiting owner explicit confirm |
| 2 | LLM provider | **Both OpenAI + Anthropic** — `ai_provider_configs` supports multiple; FU-12 documents both | FU-12 OPEN |
| 3 | Auto-dispatch action type | **Yes** — to be added in ADR-043 migration (Phase 13.2) | ADR-043 drafting pending |
| 4 | Mianx agent → team mapping | Engineering proposal from §6 applied to ADR-046 draft (Phase 13.5) | ADR-046 drafting pending |
| 5 | Phase 13 sequencing | **Foundational first, then sequential** — Phase 13.0 now done, ADR-042 next | ✅ Phase 13.0 shipped |

### What's next

1. **Owner reviews this doc + FU-12 runbook** — explicit confirm or
   override the 5 defaults above (any override may adjust downstream
   ADR scope).
2. **Engineering drafts ADR-042** (Demand Forecasting & Inventory
   Prediction) — Phase 13.1.
3. **Operator executes FU-12** — provision OpenAI + Anthropic API keys
   + seed `ai_provider_configs` rows + smoke-test the proxy.
4. **Engineering implements Phase 13.1-13.5** sequentially per §7.

---

**Phase 13.0 status:** SHIPPED (v3.0.0-rc.1). Phase 13.1-13.6 IN PROGRESS.
