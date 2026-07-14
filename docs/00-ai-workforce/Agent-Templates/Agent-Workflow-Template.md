# Agent Workflow Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-005 |
| Title | Agent Workflow Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per multi-step, multi-agent, or gated workflow (e.g., "customer order lifecycle", "production deployment", "refund handling"). Simple single-agent flows stay in the agent spec's Workflow section.

---

## Workflow Card

| Field | Value |
|---|---|
| Workflow ID | WF-<NNN> |
| Workflow Name | <e.g., Order-to-Delivery Lifecycle> |
| Trigger | <event or schedule that starts it> |
| Owning Agent | MX-TP-<CATEGORY>-<NNN> |
| Participating Agents | <list of Document IDs> |
| Human Gates | <count + where — must match step table> |

## Business Outcome
<One paragraph: the end state this workflow guarantees for Telepizza.>

## Step Table

| # | Step | Actor (Agent ID) | Input | Output | Gate | On Failure |
|---|---|---|---|---|---|---|
| 1 | <step name> | <agent> | <input> | <output> | <none / human / automated check> | <retry / compensate / escalate> |
| 2 | … | | | | | |

## State Model
<The states an entity moves through (e.g., order: placed → confirmed → preparing → ready → picked-up → delivered / cancelled) and which step performs each transition. Illegal transitions must be rejected by the backend, not just by convention.>

## Timeouts and SLAs
<Per-step time budgets and what happens on expiry (auto-escalation target).>

## Compensation Logic
<How partial completion is unwound — e.g., payment captured but kitchen rejected → automatic refund initiation + customer notification + human alert.>

## Concurrency Rules
<What happens when the same entity is touched by parallel executions; locking or idempotency keys required.>

## Observability
<Events emitted per step; the dashboard where the workflow's live state is visible; alert conditions.>

## Review
| Field | Value |
|---|---|
| Approved by | <Governance reviewer + human owner where gated> |
| Approval date | <YYYY-MM-DD> |
| Next review due | <YYYY-MM-DD> |
