# Repository Governance

**Version:** 1.0  
**Status:** Active  
**Authority:** Repository Governance v1

---

## Purpose

This document defines the permanent governance model for the Telepizza ROS repository.

Its purpose is to ensure that architecture, implementation, verification, and release remain clearly separated throughout the engineering lifecycle.

Repository governance provides a consistent decision-making framework for all contributors.

---

## Governance Principles

The repository is governed by the following principles:

- Architecture before implementation.
- Requirements before development.
- Repository evidence over opinion.
- Acceptance before release.
- Honest documentation.
- Controlled scope changes.
- Traceable engineering decisions.

---

## Repository Truth

The repository is the authoritative implementation source.

- Architecture defines approved direction.
- Requirements define intended capability.
- Repository evidence defines implemented capability.
- Acceptance gates define verified delivery.
- Release records define released capability.

Planning documents, roadmaps, proposals, mockups, and design discussions are **not** implementation evidence.

No individual, document, AI agent, or discussion overrides repository evidence.

---

## Governance Lifecycle

Every engineering change follows the same lifecycle.

```text
Architecture Decision
        ↓
Requirements
        ↓
Implementation
        ↓
Repository Evidence
        ↓
Acceptance Verification
        ↓
Release Candidate
        ↓
Release
```

Each stage must be completed before progressing to the next.

---

## Authority Model

| Area | Authority |
|------|-----------|
| Product Vision | Founder |
| Product Priorities | Founder |
| Architecture | Founder + Chief Architect |
| Engineering | Implementation Team |
| Repository Governance | Chief Architect |
| Acceptance Review | Chief Architect |
| Release Approval | Founder |
| Implementation Truth | Repository Evidence |

---

## Architecture Governance

Architecture Decisions (ADRs) define approved system direction.

Changes affecting:

- system architecture;
- public APIs;
- shared contracts;
- database schema;
- authentication;
- security boundaries;
- module boundaries;

must be reviewed before implementation.

---

## Repository Evidence

Repository evidence includes:

- Source code
- Tests
- Database migrations
- API contracts
- Build verification
- Type checking
- Acceptance verification
- Release records

Repository evidence is the only valid implementation authority.

---

## Acceptance Governance

Implementation is not considered complete until acceptance verification has been performed.

Acceptance may result in:

- PASS
- PASS WITH LIMITATIONS
- FAIL

Limitations must be documented honestly.

A delivery must never be reported as fully complete if limitations remain.

---

## Release Governance

Release requires:

- Approved architecture
- Implemented requirements
- Repository evidence
- Successful acceptance verification
- Release approval

Merge does not automatically mean release.

Commit does not automatically mean acceptance.

---

## Documentation Governance

Documentation must accurately reflect repository evidence.

Documentation must distinguish between:

- Planned capability
- Approved architecture
- Implemented capability
- Verified capability
- Released capability

Documentation must never overstate implementation status.

---

## Scope Governance

Engineering work must remain within the currently approved scope.

Contributors must not:

- expand scope without approval;
- introduce unapproved architecture;
- bypass acceptance;
- misrepresent implementation status;
- remove governance controls.

---

## Change Management

Changes to governance documents should be:

1. Proposed.
2. Reviewed.
3. Approved.
4. Recorded.
5. Published.

Major governance changes should be reflected in the Decision Log.

---

## Related Documents

- [README.md](../../README.md)
- [AGENTS.md](../../AGENTS.md)
- [docs/README.md](../README.md)
- [ADR_INDEX.md](./ADR_INDEX.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [REPOSITORY_STATUS.md](./REPOSITORY_STATUS.md)
- [DECISION_LOG.md](./DECISION_LOG.md)
- [CHANGE_POLICY.md](./CHANGE_POLICY.md)

---

## Summary

Repository Governance v1 establishes the permanent engineering governance model for the Telepizza ROS repository.

It ensures that:

- architecture guides implementation;
- repository evidence defines implementation truth;
- acceptance verifies delivery;
- documentation reflects reality;
- releases are based on verified engineering evidence.
