# Agent SOP Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-006 |
| Title | Agent SOP Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Operations |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per recurring operational procedure an agent executes the same way every time (e.g., "daily sales report generation", "menu price update", "weekly backup verification"). SOPs are prescriptive: an agent following an SOP makes no judgment calls beyond the documented decision points.

---

## SOP Card

| Field | Value |
|---|---|
| SOP ID | SOP-<CATEGORY>-<NNN> |
| SOP Name | <e.g., Menu Price Update Procedure> |
| Executing Agent | MX-TP-<CATEGORY>-<NNN> |
| Frequency | <on-demand / daily / weekly / event-driven> |
| Duration Budget | <expected completion time> |
| Human Gate | <Yes — at which step / No> |

## Objective
<The single outcome this SOP guarantees when followed.>

## Preconditions
<Checklist that must be verified true before step 1. If any fails, the SOP aborts and reports — it does not improvise.>

## Procedure

| # | Action | Expected Result | Verification | On Deviation |
|---|---|---|---|---|
| 1 | <exact action> | <observable result> | <how the agent confirms it> | <stop / retry once / escalate to whom> |
| 2 | … | | | |

## Decision Points
<The only places judgment is allowed, each with explicit options and criteria (e.g., "If price delta > 20%, route to human owner regardless of source").>

## Postconditions
<Checklist verified after the final step; the SOP is not complete until all pass.>

## Records
<What evidence the run produces (report file, log entries, notifications) and where it is stored.>

## Failure Handling
<Named failure modes and the exact response for each. Unknown failure → abort, preserve state, escalate.>

## Review
| Field | Value |
|---|---|
| Approved by | <team lead agent + Governance> |
| Approval date | <YYYY-MM-DD> |
| Next review due | <YYYY-MM-DD — max 6 months, or immediately after any failed run> |
