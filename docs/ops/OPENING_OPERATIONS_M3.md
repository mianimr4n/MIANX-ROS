# Opening Operations Milestone 3 — SOPs, Training, Rehearsals, Founder Approval

## Purpose

Document honest local workflows for Royal Orchard opening governance:

- SOP review and approval
- staff training and assessment
- role rehearsals and end-to-end rehearsal
- Founder go/no-go (super-admin)
- future Owner handover (no `owner` role code)

## Current verified state

Milestone 3 adds branch-scoped persistence and Admin APIs under `/api/v1/admin/opening/*` for governance, wired into shared readiness probes and Owner settings.

Northern Bypass remains **coming-soon**. No Production migrations are applied by this delivery. Production training/rehearsal/approval evidence is **not** claimed.

## SOP lifecycle

States: `NOT_REVIEWED` → `REVIEW_REQUIRED` → `REVIEWED` → `APPROVED` | `RETIRED`

Operational verification is separate: `NOT_VERIFIED` → `REHEARSAL_REQUIRED` → `VERIFIED_ONSITE` | `FAILED` | `EXPIRED`

**Documentation presence does not imply review, training, rehearsal, or onsite verification.**

## Training lifecycle

Sessions require named trainer/verifier. Participants must be real ACTIVE branch assignments with canonical roles only.

`local_test_only` completions do **not** satisfy Production readiness.

## Attendance and assessment

Attendance: INVITED → CONFIRMED → ATTENDED | ABSENT | EXCUSED  
Assessment: NOT_ASSESSED | PASS | CONDITIONAL_PASS | FAIL

Failed participants keep related readiness incomplete. Remediation uses `remediation_required` + due dates.

## Role rehearsals

Codes cover BM, cashier/POS, kitchen, rider, host/waiter floor, customer-support escalation.

COMPLETE requires participation evidence, verifier, and zero unresolved critical failures. Retest when required.

## End-to-end rehearsal

Fourteen-stage opening scenario. Does **not** execute Production orders. Local fixtures never count as Production COMPLETE.

## Founder go/no-go

Internal authorization: **super-admin** only. No `founder` role code.

Decisions: NOT_READY | REVIEW_REQUIRED | GO_CONDITIONAL | GO_APPROVED | NO_GO | WITHDRAWN

- Snapshots are immutable
- GO_CONDITIONAL requires conditions
- NO_GO requires notes
- GO_APPROVED does **not** auto-change branch status
- Northern Bypass requires a separate decision

## Owner handover

Statuses include NOT_STARTED → PREPARING → REVIEW_REQUIRED → READY_FOR_HANDOVER → ACCEPTED

No passwords or secrets. No `owner` role. Handover readiness ≠ restaurant opening approval.

## Readiness completion contracts

| Status | Meaning |
| --- | --- |
| COMPLETE | Current persisted approved/non-expired Production evidence |
| ACTIVE | Scheduled / in progress / approved pending verification |
| WAITING_ON_HUMAN | Participant, trainer, verifier, or Founder action required |
| BLOCKED | Failed assessment/rehearsal/decision |
| ERROR / OFFLINE | API or network failure |

Do not hardcode percentages. Do not mark Royal Orchard training/rehearsal/Founder approval complete without Production evidence.
