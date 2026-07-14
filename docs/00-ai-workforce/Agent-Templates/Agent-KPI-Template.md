# Agent KPI Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-007 |
| Title | Agent KPI Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per KPI referenced in any agent specification. A KPI without a definition card is not a KPI — it cannot be measured, so it cannot govern. The Analytics team (docs/05-ai-agents/07) owns measurement infrastructure; the agent's team owns the target.

---

## KPI Card

| Field | Value |
|---|---|
| KPI ID | KPI-<CATEGORY>-<NNN> |
| KPI Name | <e.g., Order-parse exact-match accuracy> |
| Owning Agent | MX-TP-<CATEGORY>-<NNN> |
| Business Link | <the Telepizza outcome this protects: revenue, delivery speed, uptime, cost, trust> |

## Definition
<Precise, unambiguous definition. Anyone computing this KPI from the same data must get the same number.>

## Formula
```text
<numerator> / <denominator>, measured over <window>
```

## Data Source
<Exact tables/streams/logs the measurement reads; who owns them; known data-quality caveats.>

## Target and Thresholds
| Level | Value | Response |
|---|---|---|
| Target | <value> | none — healthy |
| Warning | <value> | <action + owner> |
| Critical | <value> | <action + escalation, time-bound> |

## Measurement Cadence
<How often computed, by what job, and where published (dashboard/report).>

## Gaming Risks
<How this KPI could be satisfied while betraying its intent (e.g., raising parse accuracy by over-asking clarification), and the guard metric that detects it.>

## Baseline
<Current value at definition time, with measurement date. Targets without baselines are guesses.>

## Review
| Field | Value |
|---|---|
| Approved by | <team lead agent + Analytics team> |
| Approval date | <YYYY-MM-DD> |
| Next review due | <YYYY-MM-DD> |
