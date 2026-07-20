# Agent Capability Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-003 |
| Title | Agent Capability Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per discrete capability an agent holds (e.g., "parse WhatsApp order", "assign rider", "approve PR"). Capabilities are the unit of permission review — Governance approves capabilities, not vague roles.

---

## Capability Card

| Field | Value |
|---|---|
| Capability ID | CAP-<CATEGORY>-<NNN> |
| Capability Name | <verb phrase, e.g., "Assign rider to order"> |
| Owning Agent | MX-TP-<CATEGORY>-<NNN> |
| Risk Class | <Read-only / Write-internal / Write-customer-visible / Money-moving> |
| Human Gate Required | <Yes — when / No> |

## Description
<What the capability does, in one paragraph. Business effect, not implementation.>

## Trigger Conditions
<When the agent may invoke this capability. Explicit preconditions.>

## Required Inputs
<Data the capability needs, with source and validation requirements.>

## Effects
<State changes produced: tables written, messages sent, statuses moved. Must be exhaustive.>

## Limits and Rate Bounds
<Quantitative limits: max invocations per hour, max order value, branch scope, etc.>

## Forbidden Variants
<Nearby actions this capability does NOT include (e.g., "assign rider" does not include overriding an in-progress delivery).>

## Rollback / Compensation
<How the effect is undone or compensated if wrong; who executes the rollback.>

## Evidence and Logging
<What is recorded per invocation and where; retention period.>

## Review
| Field | Value |
|---|---|
| Approved by | <Governance reviewer + human owner where gated> |
| Approval date | <YYYY-MM-DD> |
| Next review due | <YYYY-MM-DD — max 6 months out> |
