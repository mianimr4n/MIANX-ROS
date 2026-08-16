# Architecture Decision Register

**Status:** Active

---

## Purpose

This document indexes Architecture Decision Records (ADRs) and related governance policies for the Telepizza ROS repository.

ADRs document significant architectural decisions that affect the long-term direction of the platform.

Detailed ADR markdown files, when authored, live under [`docs/13-adr/`](../13-adr/). Until an ADR file exists there, treat the index entries below as governance policy pointers, not as claims that a standalone ADR artifact is present.

---

## ADR Lifecycle

Every Architecture Decision follows the same lifecycle.

```text
Proposal
    ↓
Review
    ↓
Approval
    ↓
Implementation
    ↓
Verification
    ↓
Active
```

---

## ADR Index

| ADR | Title | Status | Version | Artifact |
|-----|-------|--------|---------|----------|
| ADR-001 | Branch Configuration Inheritance & Overrides | Accepted | 1.0 | [`docs/13-adr/ADR-001-branch-configuration-inheritance.md`](../13-adr/ADR-001-branch-configuration-inheritance.md) — implemented in `v1.9.0` |
| ADR-002 | Settings Versioning, Activation & Rollback Model | Accepted | 1.0 | [`docs/13-adr/ADR-002-settings-versioning-rollback.md`](../13-adr/ADR-002-settings-versioning-rollback.md) — implemented in `v1.9.0` |
| ADR-003 | Provider-Secret Boundary Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-003-provider-secret-boundary.md`](../13-adr/ADR-003-provider-secret-boundary.md) — implemented in `v1.9.0` |
| ADR-004 | WhatsApp Conversation Ownership & Routing | Accepted | 1.0 | [`docs/13-adr/ADR-004-whatsapp-conversation-ownership.md`](../13-adr/ADR-004-whatsapp-conversation-ownership.md) — implemented in `v1.9.0` |
| ADR-005 | Canonical Customer Identity Strategy | Accepted | 1.0 | [`docs/13-adr/ADR-005-canonical-customer-identity.md`](../13-adr/ADR-005-canonical-customer-identity.md) — implemented in `v1.9.0` |
| ADR-006 | Customer Account Merge & Reversal Process | Accepted | 1.0 | [`docs/13-adr/ADR-006-customer-account-merge.md`](../13-adr/ADR-006-customer-account-merge.md) — implemented in `v1.9.0` |
| ADR-007 | Delivery State Machine & Transition Rules | Accepted | 1.0 | [`docs/13-adr/ADR-007-delivery-state-machine.md`](../13-adr/ADR-007-delivery-state-machine.md) — implemented in `v1.8.0` |
| ADR-008 | Rider Location Retention & Privacy Policy | Accepted | 1.0 | [`docs/13-adr/ADR-008-rider-location-retention.md`](../13-adr/ADR-008-rider-location-retention.md) — implemented in `v1.9.0` |
| ADR-009 | Proof of Delivery (POD) Data Format & Storage | Accepted | 1.0 | [`docs/13-adr/ADR-009-proof-of-delivery.md`](../13-adr/ADR-009-proof-of-delivery.md) — implemented in `v1.9.0` |
| ADR-010 | Cash on Delivery (COD) Financial Ownership | Accepted | 1.0 | [`docs/13-adr/ADR-010-cod-financial-ownership.md`](../13-adr/ADR-010-cod-financial-ownership.md) — implemented in `v1.9.0` |
| ADR-011 | Accounting Immutability & Double-Entry Reversals | Accepted | 1.0 | [`docs/13-adr/ADR-011-accounting-immutability.md`](../13-adr/ADR-011-accounting-immutability.md) — implemented in `v1.8.0` |
| ADR-012 | Domain Event & Shared Audit Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-012-domain-event-audit.md`](../13-adr/ADR-012-domain-event-audit.md) — implemented in `v1.9.0` |
| ADR-013 | AI Provider Boundary & Data Governance | Accepted | 1.0 | [`docs/13-adr/ADR-013-ai-provider-boundary.md`](../13-adr/ADR-013-ai-provider-boundary.md) — implemented in `v1.9.0` |
| ADR-014 | AI Human-Approval Gate Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-014-ai-approval-gate.md`](../13-adr/ADR-014-ai-approval-gate.md) — implemented in `v1.9.0` |
| ADR-015 | AI Prompt & Data Retention Policy | Accepted | 1.0 | [`docs/13-adr/ADR-015-ai-prompt-retention.md`](../13-adr/ADR-015-ai-prompt-retention.md) — implemented in `v1.9.0` |
| ADR-016 | OTP Verification Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-016-otp-verification-architecture.md`](../13-adr/ADR-016-otp-verification-architecture.md) — implemented in `v1.10.0` (Phase 3) |
| ADR-017 | Phone-First Auth & Session Handoff | Accepted | 1.0 | [`docs/13-adr/ADR-017-phone-first-auth-session-handoff.md`](../13-adr/ADR-017-phone-first-auth-session-handoff.md) — implemented in `v1.10.0` (Phase 3) |
| ADR-018 | Order Lifecycle State Machine & Staff Transition API | Accepted | 1.0 | [`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`](../13-adr/ADR-018-order-lifecycle-state-machine.md) — implemented in `v2.0.0` (Phase 5 closeout) |
| ADR-019 | RBAC Authorization Principal & Permission Model | Accepted | 1.0 | [`docs/13-adr/ADR-019-rbac-authorization-principal.md`](../13-adr/ADR-019-rbac-authorization-principal.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-020 | Canonical Single-Price Menu Catalog & Atomic Price Audit | Accepted | 1.0 | [`docs/13-adr/ADR-020-canonical-single-price-menu-catalog.md`](../13-adr/ADR-020-canonical-single-price-menu-catalog.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-021 | Deals, Coupons & Loyalty Promotion Engine | Accepted | 1.0 | [`docs/13-adr/ADR-021-deals-coupons-loyalty-engine.md`](../13-adr/ADR-021-deals-coupons-loyalty-engine.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-022 | Reports & Analytics Framework — Query-Time KPI Registry | Accepted | 1.0 | [`docs/13-adr/ADR-022-reports-analytics-framework.md`](../13-adr/ADR-022-reports-analytics-framework.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-023 | POS Cashier Workflow & Order Source Contract | Accepted | 1.0 | [`docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md`](../13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-024 | Dine-in Bill Settlement & Multi-tender Payments | Accepted | 1.0 | [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](../13-adr/ADR-024-dine-in-bill-settlement.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-025 | POS Shifts, Z-Report & Cash Reconciliation | Accepted | 1.0 | [`docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md`](../13-adr/ADR-025-pos-shifts-zreport-cash-recon.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-026 | Branch Sync & Offline-Safe POS Contract | Accepted | 1.0 | [`docs/13-adr/ADR-026-branch-sync-offline-safe-pos-contract.md`](../13-adr/ADR-026-branch-sync-offline-safe-pos-contract.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-027 | Kitchen Ticket Lifecycle & Queue Contract | Accepted | 1.0 | [`docs/13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md`](../13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md) — implemented in `v2.3.0` (Phase 8 closeout) |
| ADR-028 | Kitchen Order Ticket (KOT) Snapshot & Per-Item Status Model | Accepted | 1.0 | [`docs/13-adr/ADR-028-kot-snapshot-per-item-status.md`](../13-adr/ADR-028-kot-snapshot-per-item-status.md) — implemented in `v2.3.0` (Phase 8 closeout) |
| ADR-029 | Kitchen Timers, Priority & Display Contract | Accepted | 1.0 | [`docs/13-adr/ADR-029-kitchen-timers-priority-display-contract.md`](../13-adr/ADR-029-kitchen-timers-priority-display-contract.md) — implemented in `v2.3.0` (Phase 8 closeout) |
| ADR-030 | Rider Identity, Dispatch & Assignment Contract | Accepted | 1.0 | [`docs/13-adr/ADR-030-rider-identity-dispatch-assignment-contract.md`](../13-adr/ADR-030-rider-identity-dispatch-assignment-contract.md) — implemented in `v2.4.0` (Phase 9 closeout) |
| ADR-031 | Delivery Lifecycle, Pickup & POD Surface | Accepted | 1.0 | [`docs/13-adr/ADR-031-delivery-lifecycle-pickup-pod-surface.md`](../13-adr/ADR-031-delivery-lifecycle-pickup-pod-surface.md) — implemented in `v2.4.0` (Phase 9 closeout) |
| ADR-032 | Rider Location, Navigation & Performance Contract | Accepted | 1.0 | [`docs/13-adr/ADR-032-rider-location-navigation-performance-contract.md`](../13-adr/ADR-032-rider-location-navigation-performance-contract.md) — implemented in `v2.4.0` (Phase 9 closeout) |

> **Note:** All Phase 2 ADRs (ADR-001 through ADR-015) now have standalone
> ADR files authored under `docs/13-adr/` and are marked Accepted.
> Phase 3 ADRs (ADR-016, ADR-017) cover customer phone / WhatsApp OTP
> authentication and session handoff.
> ADR-018 formally accepts the Sprint 4.4 frozen Order Lifecycle
> architecture as the canonical Phase 5 decision and records the as-built
> implementation against the as-designed matrix.
> ADR-019 through ADR-022 formally accept the Sprint 3 / RC3 / RC4-11
> as-built Admin & ERP Core architecture as the canonical Phase 6
> decision: RBAC permission model, single-price menu catalog, three-engine
> promotions surface (coupons + campaigns + loyalty), and query-time
> analytics registry.
> ADR-023 through ADR-026 formally accept the Sprint 4 / DB-R6 / D3 / RC3
> Finance as-built POS architecture as the canonical Phase 7 decision:
> cashier workflow + order source contract, dine-in bill settlement +
> multi-tender payments, POS shifts + Z-Report + cash reconciliation, and
> branch sync + offline-safe contract (centralized DB + RLS + Idempotency-
> Key, with explicit deferral of offline PWA).
> ADR-027 through ADR-029 formally accept the Sprint 4 / DB-R5 / REQ-KIT-012
> as-built Kitchen Dashboard architecture as the canonical Phase 8 decision:
> kitchen ticket lifecycle + queue contract (one ticket per order, 6-state
> machine, ORDER_STATUS_MIRROR, polling-not-realtime), KOT snapshot model
> (frozen item_name + modifiers_snapshot JSONB, idempotent Option B creation
> on order confirm, atomic stock consume via kitchen_ticket_set_preparing_atomic
> RPC, per-item is_completed DEFERRED, KOT print + sequence_number DEFERRED),
> and kitchen display contract (client-side elapsed timer with fallback chain,
> PREP_WARN=20m / PREP_TARGET=15m display constants, priority field EXISTS
> with mutation DEFERRED, KITCHEN_STATION_CATALOG display-only with
> kitchen_stations table DEFERRED, no realtime / sounds / bump / recall).
> ADR-030 through ADR-032 formally accept the Sprint 4.6 / ADR-007/008/009/010
> as-built Rider and Delivery App architecture as the canonical Phase 9
> decision: rider identity + dispatch contract (rider role + 1:1 user_id +
> 1:1 branch_id, manual dispatch only with same-branch + state-machine +
> rider-active invariants, auto-dispatch DEFERRED), delivery lifecycle +
> pickup + POD surface (6-state machine with order mirror via
> mirrorOrderStatus + compensating rollback, picked-up IS the out-for-delivery
> state, POD-mandatory-for-delivered enforcement chain, failed-delivery
> capture + redelivery flow + customer-facing POD view DEFERRED), and rider
> location + navigation + performance contract (rider_locations ephemeral
> table with 24h TTL purge, GPS ingest endpoint with delivery.access
> permission, partial aggregate KPIs in admin dashboard, per-rider KPIs +
> rider_daily_summaries table + rider mobile app + customer-facing live map
> + push notifications DEFERRED to Phase 12).

---

## When an ADR is Required

Create an ADR when changing:

- System architecture
- Database architecture
- Public APIs
- Authentication
- Security boundaries
- Shared libraries
- Module boundaries
- Repository governance
- Engineering standards

Routine implementation changes do **not** require an ADR.

---

## ADR Status

Allowed statuses:

- Draft
- Review
- Approved
- Active
- Superseded
- Deprecated

---

## Related Documents

- [GOVERNANCE.md](./GOVERNANCE.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [DECISION_LOG.md](./DECISION_LOG.md)
- [docs/13-adr/README.md](../13-adr/README.md)
