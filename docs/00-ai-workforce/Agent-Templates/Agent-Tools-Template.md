# Agent Tools Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-004 |
| Title | Agent Tools Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per tool/integration exposed to agents through the AI gateway (`backend/ai-gateway`). The AI Engineer Agent implements from this document; Governance reviews it. A tool not registered here must not exist in the gateway.

---

## Tool Registration Card

| Field | Value |
|---|---|
| Tool ID | TOOL-<NNN> |
| Tool Name | <snake_case name as exposed to agents, e.g., get_branch_orders> |
| Backing System | <Telepizza API endpoint / external service> |
| Risk Class | <Read-only / Write-internal / Write-customer-visible / Money-moving> |
| Human Gate Required | <Yes — when / No> |

## Description
<What the tool does and the business purpose it serves.>

## Input Schema
```json
{
  "<parameter>": "<type — validation rule>"
}
```

## Output Schema
```json
{
  "<field>": "<type — meaning>"
}
```

## Authorized Agents
| Agent Document ID | Scope restriction (branch, time window, value limit) |
|---|---|
| MX-TP-<CATEGORY>-<NNN> | <restriction or "none"> |

## Rate Limits
<Per-agent and global limits; behavior on limit breach (reject + log, never queue silently).>

## Error Behavior
<Structured error codes the tool returns; agent-visible guidance for each; retry policy.>

## Data Handling
<PII fields touched, redaction rules, whether outputs may be stored in agent memory.>

## Monitoring
<Metrics emitted (latency, error rate, usage per agent) and alert thresholds.>

## Review
| Field | Value |
|---|---|
| Implemented by | AI Engineer Agent (MX-TP-ENG-007) |
| Security review | <Security team sign-off + date> |
| Approved by | <Governance reviewer + human owner where gated> |
| Next review due | <YYYY-MM-DD> |
