# Phase 2 Readiness Audit — Dependency Graph

**Audit date:** 2026-08-04
**Status:** PROPOSED

---

## Critical Path

```text
Phase 2.1 (Branch Settings Control Plane)
        │
        ├── Configuration schema + effective value resolution
        ├── Versioning + activation + rollback
        └── Audit history for settings changes
        │
        ▼
Phase 2.2 (Customer Support and WhatsApp Foundation)
        │
        ├── Provider adapter contract (requires 2.1 for provider config reference)
        ├── Webhook ingestion + idempotency
        ├── Conversation model
        └── Customer identity linking (soft dependency on 2.3)
        │
        ▼
Phase 2.3 (CRM and Customer Master)
        │
        ├── Canonical customer ID (requires orders linkage)
        ├── Merge/consent/privacy (requires audit events from 2.1)
        └── Loyalty/support/delivery linkage
        │
        ▼
Phase 2.4 (Delivery and Rider Completion)
        │
        ├── Rider profile (requires HR foundation — already exists)
        ├── Delivery state machine (requires orders LIVE — already exists)
        ├── POD + COD (requires finance boundary from 2.5 design)
        └── GPS retention policy (requires audit architecture)
        │
        ▼
Phase 2.5 (Accounting and Profitability Depth)
        │
        ├── Period close (requires journal_entries — already exists)
        ├── COGS (requires inventory/recipes — already exists partially)
        ├── COD → journal (requires 2.4 COD model)
        └── Payroll posting (requires HR payroll — already exists)
        │
        ▼
Phase 2.6 (AI Command Center)
        │
        ├── Data readiness gate (all prior domains must be authoritative)
        ├── Evaluation harness (requires test infrastructure)
        ├── Advisory summaries (requires finance/support/delivery truth)
        └── Approval-required actions (requires ai_approvals — already exists)
```

---

## Dependency Matrix

| Phase | Hard Prerequisites | Soft Prerequisites | Security Prerequisites |
|---|---|---|---|
| **2.1** | Existing org/branch tables; RBAC roles | None | Secrets boundary decision (ADR-001) |
| **2.2** | 2.1 (provider config reference); existing authentication | Customer identity (2.3 design in parallel) | WhatsApp webhook HMAC; idempotency key design |
| **2.3** | Existing orders table; existing customers table; RBAC roles | 2.2 (conversation linkage) | PII masking; right-to-delete design |
| **2.4** | Existing orders; existing users/riders; HR foundation | 2.3 (customer identity for address exposure) | Location privacy policy; POD data format |
| **2.5** | Existing journal_entries; finance_postings; COGS tables; 2.4 (COD model) | 2.1 (period-level config); 2.3 (customer dimension) | Accounting immutability; posting idempotency |
| **2.6** | All 2.1–2.5 operational; event architecture; authoritative data | Provider contract | AI data retention; prompt injection controls |

---

## Prerequisites by Type

### Architecture Prerequisites

| Item | Required By | Status |
|---|---|---|
| Configuration inheritance model (ADR-001) | 2.1 | PROPOSED |
| Settings versioning and activation model | 2.1 | PROPOSED |
| Provider-secret boundary | 2.2 | PROPOSED |
| WhatsApp conversation ownership | 2.2 | PROPOSED |
| Canonical customer identity strategy | 2.3 | PROPOSED |
| Customer merge/reversal design | 2.3 | PROPOSED |
| Delivery state machine definition | 2.4 | PROPOSED |
| Rider location retention policy | 2.4 | PROPOSED |
| POD storage format | 2.4 | PROPOSED |
| COD financial ownership | 2.4/2.5 | PROPOSED |
| Accounting period-close model | 2.5 | PROPOSED |
| Event/audit architecture | All | PROPOSED |
| AI provider boundary | 2.6 | PROPOSED |
| AI human-approval boundary | 2.6 | PROPOSED |

### Data Prerequisites

| Item | Required By | Exists? |
|---|---|---|
| `organization_settings` table | 2.1 | YES (migration `20260729140000`) |
| `branch_settings` table | 2.1 | YES (migration `20260729150000`) |
| RBAC roles + permissions | All | YES |
| `orders` table | 2.3/2.4/2.5 | YES |
| `customers` table | 2.3 | YES |
| `customer_addresses` | 2.3 | YES |
| `journal_entries` + `finance_postings` | 2.5 | YES |
| `inventory_items` + `kitchen_recipes` | 2.5 | PARTIAL |
| `ai_teams` + `ai_agents` + `ai_tasks` + `ai_approvals` | 2.6 | YES |
| Configuration versioning tables | 2.1 | **NO — to be created** |
| `conversations` + `messages` | 2.2 | **NO — to be created** |
| Canonical customer identity tables | 2.3 | **NO — to be created** |
| Rider profiles | 2.4 | **NO — to be created** |
| `rider_locations` | 2.4 | **NO — to be created** |
| COD tables | 2.4/2.5 | **NO — to be created** |
| `posting_periods` | 2.5 | **NO — to be created** |

### Provider Prerequisites

| Provider | Phase | Prerequisite Action |
|---|---|---|
| WhatsApp Business API | 2.2 | Provider account; WABA number; HMAC secret; sandbox testing |
| GPS/Map provider | 2.4 | Provider selection; API key; SDK evaluation |
| AI model provider | 2.6 | Provider selection; API key; data processing agreement; sandbox |

### Observability Prerequisites

| Item | Required By | Exists? |
|---|---|---|
| Structured logging | All | Partial (backend logs exist) |
| Error rate tracking | All | Not implemented |
| Webhook failure monitoring | 2.2 | Not implemented |
| COD reconciliation alerting | 2.4/2.5 | Not implemented |
| AI provider error tracking | 2.6 | Not implemented |

---

## Confirmed Sequence

The default sequence is confirmed by dependency evidence:

```
2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
```

**No reordering proposed.** Evidence:
- 2.2 needs 2.1 for provider config reference
- 2.3 benefits from 2.2 (conversation linkage) but can be parallelized with late 2.2 slices
- 2.4 needs HR (exists) and orders (exists); no hard dependency on 2.3, but customer address exposure from 2.3 is needed for complete rider handoff
- 2.5 needs COD model from 2.4 for complete accounting; core posting works without it
- 2.6 requires all prior domains to provide authoritative data

---

## Parallel Opportunities

| Work Item | Can Parallel With | Risk |
|---|---|---|
| Event/audit architecture design | 2.1 | Low — design only |
| Rider profile schema | 2.2 | Low — additive |
| Customer identity schema | 2.2 | Low — additive |
| Period-close schema | 2.3/2.4 | Low — additive |
| AI evaluation harness | 2.3/2.4/2.5 | Low — test infrastructure |
| Maintenance lane items | All | Low — separate PRs |

---

## Blocking Items (P1)

| Item | Phase Blocked | Resolution |
|---|---|---|
| ADR-001 (config inheritance) not accepted | 2.1 | Founder/architect acceptance required |
| Provider secret boundary not defined | 2.2 | ADR-002 acceptance required |
| Customer canonical identity strategy not accepted | 2.3 | ADR-005 acceptance required |
| Delivery state machine not formally accepted | 2.4 | ADR-007 acceptance required |
| Period-close model not accepted | 2.5 | ADR-010 acceptance required |
| AI data governance not accepted | 2.6 | ADR-013/014 acceptance required |
| Event/audit architecture not accepted | All | ADR-012 acceptance required |

**All ADRs are PROPOSED. None are accepted. No runtime implementation begins until each ADR is accepted before its dependent phase.**
