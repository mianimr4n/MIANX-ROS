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
