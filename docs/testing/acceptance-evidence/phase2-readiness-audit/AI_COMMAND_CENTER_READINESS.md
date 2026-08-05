# Phase 2 Readiness Audit — AI Command Center Readiness

**Audit date:** 2026-08-04
**Status:** AUDIT — current truth + proposed scope

---

## Current AI Platform Truth (Repository Evidence)

### Existing Tables

| Table | Migration | Purpose |
|---|---|---|
| `ai_teams` | `20260730120000` | 6 AI teams seeded: executive, customer-experience, marketing, restaurant-operations, finance, analytics |
| `ai_agents` | `20260730120000` | Agent records with model_id, status, configuration JSONB |
| `ai_tasks` | `20260730120000` | Task queue with status machine (pending/running/awaiting_approval/completed/failed/cancelled) |
| `ai_approvals` | `20260730120000` | Human approval gate for AI tasks |

### Existing APIs

| Endpoint | Role | Notes |
|---|---|---|
| `GET /api/v1/ai/teams` | admin.access | List AI teams |
| `GET /api/v1/ai/agents` | admin.access | List agents per team |
| `GET /api/v1/ai/tasks` | admin.access | List pending/running tasks |

### Existing UI

| Route | Component | State |
|---|---|---|
| `/admin/ai-team` | AdminAiTeam | FOUNDATION — shows teams/agents from API; no runtime execution |
| `/admin/ai-command-center` | AiComingSoon | NAVIGATION_ONLY — AdminComingSoon |
| `/admin/dashboard` | AdminDashboard | Has "Mianx.ai Operations Insights" — deterministic rule-based summaries |

### Current AI Capability

- AI teams and agents defined in database (metadata only)
- `ai_tasks` table exists for task queue
- `ai_approvals` table exists for human gate
- No model provider connected
- No runtime execution
- No prompt management
- No API key configuration
- "Mianx.ai Operations Insights" in dashboard = deterministic rule-based logic (NOT generative AI)

---

## AI Eligibility Prerequisites

All prerequisites must be TRUE before Phase 2.6 implementation begins:

| Prerequisite | Required | Status |
|---|---|---|
| Authoritative customer master (Phase 2.3) | YES — AI customer summaries require trusted data | NOT STARTED |
| Append-only audit/event history | YES — AI anomaly detection requires trustworthy history | FOUNDATION only |
| Settings configuration truth (Phase 2.1) | YES — AI needs config context | NOT STARTED |
| Finance period-close (Phase 2.5) | YES — AI P&L analysis requires closed periods | NOT STARTED |
| Delivery state machine (Phase 2.4) | YES — AI dispatch recommendations need real state | NOT STARTED |
| Provider contract signed | YES — model provider required | MISSING |
| Data processing agreement | YES — customer data → AI provider | MISSING |
| Prompt/data retention policy | YES — required before any prompts sent to provider | MISSING |
| PII controls defined | YES — customer PII must not enter prompts without masking | MISSING |
| Cost controls in place | YES — per-call limits required | MISSING |
| Rate limiting implementation | YES — prevent runaway API costs | MISSING |
| Evaluation harness | YES — test AI outputs before Production | MISSING |
| Human review workflow | YES — no AI action without human approval | PARTIAL (ai_approvals table exists) |

---

## Candidate AI Capability Classification

### Deterministic Rule-Based (No AI provider required)
- Exception detection (order late by > threshold)
- Low-stock alert (inventory below reorder point)
- Cash variance alert (Z-Report mismatch > threshold)
- Delivery SLA breach flag

### Summarization (AI provider required; advisory only)
- Daily operations summary from orders/kitchen/delivery data
- Weekly P&L narrative
- Support conversation summary for agent handoff

### Anomaly Explanation (AI provider required; advisory only)
- "Revenue dropped 23% vs last week — likely cause: [holiday/weather/event]"
- "Rider delay pattern detected in Northern Bypass zone"

### Forecast (AI provider required; advisory only; confidence required)
- Demand forecast for next 7 days
- Inventory reorder quantity suggestion

### Draft Response (AI provider required; must be reviewed before sending)
- Draft WhatsApp response to common customer complaint
- Agent reviews and edits before sending — never auto-sent

### Approval-Required Actions (AI + human gate)
- "Recommend activating promotional discount for slow-moving item" → manager approves
- "Suggest extending delivery zone by 2km" → super-admin approves
- Uses `ai_approvals` table: status must be 'approved' before action executes

### Prohibited Autonomous Actions (Never allowed without human confirmation)
- Any financial posting
- Any customer record mutation
- Any order cancellation
- Any delivery reassignment without agent confirmation
- Any configuration activation
- Any communication sent to customer

---

## Fundamental Rule

**AI must not become the authoritative source of operational or financial truth.**

All AI outputs must be:
1. Labeled as AI-generated
2. Attributed to source data with freshness timestamp
3. Subject to human review before any action is taken
4. Never stored as fact in operational tables

---

## AI Readiness Gate (Proposed)

An AI readiness gate must be defined and passed before Phase 2.6 implementation:

```
GATE: AI_DATA_READINESS

Required:
  ☐ Customer master operational (Phase 2.3 LIVE)
  ☐ Finance period-close operational (Phase 2.5 LIVE)
  ☐ Event/audit architecture operational (Phase 2 ADR-012 accepted)
  ☐ Provider contract signed
  ☐ Data processing agreement executed
  ☐ PII masking layer implemented
  ☐ Prompt retention policy documented and implemented
  ☐ Cost controls configured
  ☐ Rate limits implemented
  ☐ Evaluation harness deployed
  ☐ Human-approval workflow end-to-end tested (sandbox)
  ☐ ADR-013 (AI provider boundary) ACCEPTED
  ☐ ADR-014 (AI human-approval boundary) ACCEPTED
  ☐ ADR-015 (AI data retention) ACCEPTED
```

---

## Provider Governance Model (Proposed)

```
Model Provider Selection → Founder authorization
        ↓
Provider Sandbox Testing → Engineering
        ↓
Data Processing Agreement → Legal/Founder
        ↓
PII Masking Implementation → Engineering
        ↓
Prompt Retention Policy → Super-admin configuration
        ↓
Evaluation Harness → Engineering
        ↓
AI_PROVIDER_READY token → Start Phase 2.6
```

No model provider may receive production data before data processing agreement is executed.

---

## Proposed Phase 2.6 New Tables

### `ai_provider_configs` (new)
```sql
id uuid PRIMARY KEY
provider_name TEXT NOT NULL -- 'openai', 'google', 'anthropic'
model_name TEXT NOT NULL
config_ref TEXT NOT NULL -- secret reference name (not value)
is_active BOOLEAN DEFAULT false
rate_limit_per_minute INTEGER
cost_limit_per_day NUMERIC(10,2)
created_at TIMESTAMPTZ
```

### `ai_prompt_logs` (new — with PII retention policy)
```sql
id uuid PRIMARY KEY
agent_id uuid REFERENCES ai_agents(id)
task_id uuid REFERENCES ai_tasks(id)
prompt_hash VARCHAR(64) -- SHA-256 of prompt (not the prompt itself for low-sensitivity)
response_summary TEXT -- summary only; no raw response with PII
tokens_used INTEGER
cost_usd NUMERIC(10,6)
provider_name TEXT
created_at TIMESTAMPTZ
-- Prompt content NOT stored to avoid PII retention issues
-- Full prompt retained only in provider logs per provider DPA
```

### `ai_recommendations` (new)
```sql
id uuid PRIMARY KEY
agent_id uuid REFERENCES ai_agents(id)
recommendation_type TEXT -- 'operational', 'financial', 'customer', 'inventory'
summary TEXT NOT NULL
confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high'))
source_data_summary JSONB -- references, not raw data
source_freshness_at TIMESTAMPTZ -- when source data was valid
requires_approval BOOLEAN DEFAULT true
approval_id uuid REFERENCES ai_approvals(id)
displayed_at TIMESTAMPTZ
dismissed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

---

## Readiness Assessment

| Item | Status |
|---|---|
| AI teams + agents + tasks + approvals tables | EXISTS |
| AI team/agent read APIs | EXISTS |
| Rule-based operations insights (dashboard) | EXISTS (deterministic) |
| AI approval workflow UI | MISSING |
| Provider configuration | MISSING |
| Runtime execution | MISSING |
| PII masking layer | MISSING |
| Prompt retention policy | MISSING |
| Evaluation harness | MISSING |
| All Phase 2.1–2.5 prerequisites | NOT STARTED |
| ADR-013/014/015 required | YES |
| Phase 2.6 maturity | FOUNDATION → target PARTIAL_LIVE |

**Verdict: PREREQUISITES NOT MET — Phase 2.6 cannot begin until Phases 2.1–2.5 are operational and the AI readiness gate is passed. ADR-013, ADR-014, ADR-015 must be accepted.**
