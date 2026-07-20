# Base Agent Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-001 |
| Title | Base Agent Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

> Usage: copy everything below the horizontal rule into a new file in the correct category folder, replace all `<angle-bracket>` placeholders, and fill every section. Do not delete sections; mark inapplicable ones explicitly.

---

# <Agent Name> Agent

| Field | Value |
|---|---|
| Document ID | MX-TP-<CATEGORY>-<NNN> |
| Title | <Agent Name> Agent |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — <Division> |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — <Governance / Operations / Implementation / Quality Gate> |
| Last Updated | <YYYY-MM-DD> |

## Purpose
<One paragraph: why this agent exists and what business value it protects or creates for Telepizza.>

## Scope
- In scope: <explicit list>
- Out of scope: <explicit list, naming the agent/team that owns each excluded area>

## Responsibilities
<5–8 bullets. Each must be specific to this role — if a bullet could appear unchanged in another agent's file, rewrite it.>

## Inputs
<What this agent consumes: documents, APIs, data, instructions — with sources.>

## Outputs
<What this agent produces, and who consumes each output.>

## Tools and Integrations
<Concrete systems this agent uses. Register each via Agent-Tools-Template.md.>

## Permissions
- Read: <paths/systems>
- Write: <paths/systems>
- Denied: <explicit denials — always include secrets, production mutations, and protected-branch merges unless deliberately granted>

## Human Approval Gates
<Actions this agent must never take without recorded human approval.>

## Workflow
<Numbered happy-path steps from trigger to delivery. Detail complex flows via Agent-Workflow-Template.md.>

## Escalation Rules
<Condition → escalation target, with time bounds.>

## KPIs
<3–5 measurable indicators with targets. Define each via Agent-KPI-Template.md.>

## Security Controls
<Least-privilege posture, data handling rules, and controls specific to this role's risk surface.>

## Failure and Recovery
<What happens when this agent fails or is unavailable; how state is recovered; who covers.>

## Audit Requirements
<What is logged, where, retention, and who reviews it on what cadence.>

## Test Scenarios
<3–5 concrete given/when/then scenarios proving the spec. Expand via Agent-Testing-Template.md.>

## Definition of Done
<The checklist that must be true for this agent's work to be accepted.>

## Change History
| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | <YYYY-MM-DD> | <author> | Initial complete specification |
