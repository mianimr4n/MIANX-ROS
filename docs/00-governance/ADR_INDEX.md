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
| ADR-001 | Repository Governance v1 | Active | 1.0 | Policy recorded in [`GOVERNANCE.md`](./GOVERNANCE.md) |
| ADR-002 | Repository Evidence Model | Planned | - | Not yet authored under `docs/13-adr/` |
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

> **Note:** All Phase 2 ADRs (ADR-001 through ADR-015) are now either
> Active or have standalone ADR files authored. ADR-001 and ADR-002
> (Settings) have migrations applied; standalone ADR docs are pending.

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
