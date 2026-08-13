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
| ADR-003 | Acceptance Gate Model | Planned | - | Policy draft in [`ACCEPTANCE_GATES.md`](./ACCEPTANCE_GATES.md); ADR file pending |
| ADR-004 | Release Governance | Planned | - | Policy draft in [`RELEASE_POLICY.md`](./RELEASE_POLICY.md); ADR file pending |
| ADR-007 | Delivery State Machine & Transition Rules | Accepted | 1.0 | [`docs/13-adr/ADR-007-delivery-state-machine.md`](../13-adr/ADR-007-delivery-state-machine.md) — implemented in `v1.8.0` |
| ADR-011 | Accounting Immutability & Double-Entry Reversals | Accepted | 1.0 | [`docs/13-adr/ADR-011-accounting-immutability.md`](../13-adr/ADR-011-accounting-immutability.md) — implemented in `v1.8.0` |

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
