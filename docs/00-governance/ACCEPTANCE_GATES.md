# Acceptance Gates

**Status:** Active

---

## Purpose

This document defines the acceptance verification process for the Telepizza ROS repository.

Acceptance Gates ensure that implementation is verified through repository evidence before being considered complete or ready for release.

---

## Acceptance Principles

Acceptance verification is based on evidence, not opinion.

A feature is not considered complete because:

- development has finished;
- code has been merged;
- screenshots look correct;
- a demo succeeded.

Implementation must be verified through repository evidence.

---

## Acceptance Workflow

Every delivery follows the same verification process.

```text
Implementation
        ↓
Repository Verification
        ↓
Acceptance Review
        ↓
Acceptance Decision
        ↓
Release Candidate
```

---

## Repository Evidence

Acceptance should consider evidence such as:

- Source code
- Type checking
- Tests
- Build verification
- API validation
- Database migrations
- UI verification
- Regression testing

Additional evidence may be required depending on the delivery.

---

## Acceptance Outcomes

### PASS

Requirements implemented.

Acceptance criteria satisfied.

No known limitations.

Delivery is eligible for release.

### PASS WITH LIMITATIONS

Requirements substantially implemented.

Minor limitations remain.

Limitations are documented.

Release decision remains subject to project approval.

### FAIL

Implementation does not satisfy approved requirements.

Critical defects remain.

Acceptance criteria are not met.

Further implementation is required.

---

## Acceptance Report

Every acceptance review should include:

- Architecture status
- Requirements status
- Implementation status
- Repository verification
- Acceptance result
- Known limitations
- Regression assessment

---

## Verification Rules

Acceptance must never:

- hide limitations;
- invent successful verification;
- assume implementation without evidence;
- report planned work as complete.

Repository evidence always takes priority.

---

## Release Gate

Acceptance is required before release.

Passing acceptance does **not** automatically:

- create a commit;
- merge a branch;
- publish a release.

Release follows the repository release policy.

---

## Related Documents

- [GOVERNANCE.md](./GOVERNANCE.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [REPOSITORY_STATUS.md](./REPOSITORY_STATUS.md)
- [DECISION_LOG.md](./DECISION_LOG.md)

---

## Summary

Acceptance Gates ensure that every delivery is verified through repository evidence before progressing toward release.

Engineering quality is determined by verified implementation, not by development completion alone.
