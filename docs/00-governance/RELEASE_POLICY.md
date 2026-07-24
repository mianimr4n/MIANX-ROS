# Release Policy

**Status:** Active

---

## Purpose

This document defines the release policy for the Telepizza ROS repository.

A release represents verified software that has satisfied governance, acceptance, and repository evidence requirements.

---

## Release Principles

A release must be:

- Planned
- Verified
- Traceable
- Reproducible
- Approved

Release decisions are based on repository evidence.

---

## Release Workflow

Every release follows the same lifecycle.

```text
Architecture
        ↓
Implementation
        ↓
Repository Evidence
        ↓
Acceptance Verification
        ↓
Release Candidate
        ↓
Commit
        ↓
Pull Request
        ↓
Repository Review
        ↓
Merge
        ↓
Release
```

---

## Release Requirements

Before a release:

- Architecture is approved.
- Requirements are implemented.
- Repository evidence exists.
- Acceptance verification is complete.
- Known limitations are documented.
- Release approval has been granted.

---

## Release Candidate

A Release Candidate (RC) indicates that implementation has passed acceptance verification and is ready for repository review.

An RC is **not** a production release.

---

## Important Distinctions

```text
Implementation ≠ Verification

Acceptance ≠ Release

Commit ≠ Release

Merge ≠ Release
```

Each stage represents a separate governance decision.

---

## Repository Evidence

Release decisions should consider:

- Source code
- Build verification
- Type checking
- Tests
- Database migrations
- API contracts
- Acceptance reports
- Release records

---

## Release Approval

Release approval remains subject to project governance.

Successful implementation alone does not authorize release.

---

## Related Documents

- [GOVERNANCE.md](./GOVERNANCE.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [REPOSITORY_STATUS.md](./REPOSITORY_STATUS.md)
- [CHANGE_POLICY.md](./CHANGE_POLICY.md)

---

## Summary

Repository releases are based on verified implementation, repository evidence, and successful acceptance.

Every release should accurately represent the state of the repository.
