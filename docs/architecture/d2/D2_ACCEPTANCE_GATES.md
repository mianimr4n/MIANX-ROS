# D2 Acceptance Gates — Data Reliability and Unified Operational Status

**Status:** Implementation In Progress  
**Implementation Evidence:** No  
**Release Evidence:** No  
**Engineering Authorization:** Granted (Founder authorization, 2026-07-25)

---

## Purpose

Proposed acceptance gates for the D2 slice. These gates define verified
delivery for D2 and align with governance policy in
[`../../00-governance/ACCEPTANCE_GATES.md`](../../00-governance/ACCEPTANCE_GATES.md).

No gate is satisfied until repository evidence and, where required, runtime
verification demonstrate it.

---

## Gates

| ID | Gate | Verification method |
| --- | --- | --- |
| D2-G1 | API request failures never appear as valid zero data | Static + unit tests over state resolver; UI shows ERROR/STALE, not `0` |
| D2-G2 | Successful empty responses display an honest empty state | Test empty-array/zero-record responses render EMPTY |
| D2-G3 | Stale data is visibly marked with last-successful timestamp | Component test asserts STALE + timestamp |
| D2-G4 | Retry is bounded and never creates duplicate writes | Retry applies to reads only; write paths unchanged; test asserts no write retry |
| D2-G5 | Branch and organization scope preserved on every affected request | Test scope params attached across refresh/retry |
| D2-G6 | Auth failures are distinct from network/server failures | Error normalization test distinguishes categories |
| D2-G7 | Executive, Branch, Orders, Kitchen, Delivery, Reports use consistent state semantics | Shared pattern applied; per-surface tests |
| D2-G8 | Existing POS, Orders, Kitchen, Delivery behavior does not regress | Adjacent static suites + backend Vitest pass |
| D2-G9 | Typecheck, relevant tests, and website build pass | `pnpm check`, targeted tests, `pnpm build:website` |
| D2-G10 | Production runtime verification documented separately from source verification | Separate runtime verification record |

---

## Runtime Verification Requirements

The following cannot be proven from source alone and must be recorded in a
separate runtime verification report:

- deployed API connectivity from the production website origin
- authentication propagation for each affected staff role
- production CORS behavior (`backend/api/src/app.ts` uses `corsOrigin`; `render.yaml` sets `API_CORS_ORIGIN`)
- environment-variable correctness (`/readyz` readiness in `backend/api/src/app.ts`)
- stale/offline behavior under real network failure
- correlation-ID propagation end to end (if backend echo is authorized)

---

## Acceptance Report Template (proposed)

When D2 is authorized and implemented, record acceptance as:

| Gate | Result | Evidence | Notes |
| --- | --- | --- | --- |
| D2-G1 | PASS / PASS WITH LIMITATIONS / FAIL | path/test | |
| D2-G2 | | | |
| D2-G3 | | | |
| D2-G4 | | | |
| D2-G5 | | | |
| D2-G6 | | | |
| D2-G7 | | | |
| D2-G8 | | | |
| D2-G9 | | | |
| D2-G10 | | | |

Honesty rule: never convert `PASS WITH LIMITATIONS` into `PASS` without
additional repository or runtime evidence.

---

## Related

- [`D2_REQUIREMENTS.md`](./D2_REQUIREMENTS.md)
- [`D2_TECHNICAL_DESIGN.md`](./D2_TECHNICAL_DESIGN.md)
- [`D2_REPOSITORY_EVIDENCE_CHECKLIST.md`](./D2_REPOSITORY_EVIDENCE_CHECKLIST.md)
