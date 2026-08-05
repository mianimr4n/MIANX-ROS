# Phase 2 Readiness Audit — Sequenced PR Roadmap

**Audit date:** 2026-08-04
**Status:** PROPOSED — Bounded implementation PR roadmap (PHASE2-00 to PHASE2-19)

---

## PR Roadmap Overview

| PR ID | Title / Scope | Main Domains | Schema Impact | API / UI Impact | Security Review | Dependencies |
|---|---|---|---|---|---|---|
| **PHASE2-00** | Governance, contracts and architecture records | Governance, Docs | None | Documentation only | Mandatory | Baseline |
| **PHASE2-01** | Configuration schema and effective-value contracts | 2.1 Settings | `configuration_schemas`, `configuration_versions` | Backend config contracts | Secret storage review | PHASE2-00 |
| **PHASE2-02** | Settings persistence foundation | 2.1 Settings | `configuration_change_log` | Config persistence APIs | RLS validation | PHASE2-01 |
| **PHASE2-03** | Versioning, activation and rollback | 2.1 Settings | None | Admin Settings UI versioning | Super-admin authz | PHASE2-02 |
| **PHASE2-04** | Branch readiness and audit history | 2.1 Settings | `audit_events` | Readiness probe endpoint | Audit immutability | PHASE2-03 |
| **PHASE2-05** | WhatsApp provider adapter contracts | 2.2 Support | `message_templates` | Provider adapter interface | Webhook secret boundary | PHASE2-04 |
| **PHASE2-06** | Webhook ingestion and idempotency | 2.2 Support | `messages` | `/api/v1/webhooks/whatsapp` | HMAC verification | PHASE2-05 |
| **PHASE2-07** | Conversation and agent-assignment foundation | 2.2 Support | `conversations`, `conversation_events` | Support Inbox UI | Branch isolation RLS | PHASE2-06 |
| **PHASE2-08** | Customer identity and canonical master | 2.3 CRM | `customer_identities` | Customer Master APIs | PII masking review | PHASE2-07 |
| **PHASE2-09** | Customer merge, consent and privacy | 2.3 CRM | `customer_merge_log`, `customer_privacy_requests` | Merge & Privacy UI | Right-to-delete audit | PHASE2-08 |
| **PHASE2-10** | Rider profile, availability and shifts | 2.4 Delivery | `rider_profiles`, `rider_availability` | Rider management APIs | Personal data access | PHASE2-09 |
| **PHASE2-11** | Delivery state machine and assignment | 2.4 Delivery | `delivery_attempts` | Dispatch Console UI | Status transition lock | PHASE2-10 |
| **PHASE2-12** | POD, failed delivery and return flow | 2.4 Delivery | `delivery_pod` | POD Capture Modal | Photo upload storage | PHASE2-11 |
| **PHASE2-13** | COD settlement and finance boundary | 2.4 Delivery | `cod_collections`, `rider_locations` | COD Settlement Drawer | Financial boundary audit | PHASE2-12 |
| **PHASE2-14** | Accounting domain and posting contracts | 2.5 Accounting | `posting_periods` | Finance contract definitions | Immutability review | PHASE2-13 |
| **PHASE2-15** | Journal/posting implementation | 2.5 Accounting | `period_close_log` | Period Close UI | Atomic reversal checks | PHASE2-14 |
| **PHASE2-16** | COGS, inventory and profitability integration | 2.5 Accounting | `tax_postings`, `discount_postings` | Automated COGS posting | Journal balance checks | PHASE2-15 |
| **PHASE2-17** | AI data-readiness and evaluation harness | 2.6 AI | `ai_provider_configs` | AI evaluation test suite | DPA & PII scrub test | PHASE2-16 |
| **PHASE2-18** | AI advisory summaries | 2.6 AI | `ai_prompt_logs` | Executive Advisory UI | Hallucination bounds | PHASE2-17 |
| **PHASE2-19** | AI approval-required recommendations | 2.6 AI | `ai_recommendations` | AI Approval Inbox UI | Human gate enforcement | PHASE2-18 |

---

## PR Governance Rules

- Each PR must be bounded to its assigned scope.
- No PR may combine runtime features from multiple target phases.
- Runtime implementation for PHASE2-01+ requires explicit `PHASE2_IMPLEMENTATION_AUTHORIZED` token.
