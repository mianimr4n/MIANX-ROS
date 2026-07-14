# Agent Testing Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-009 |
| Title | Agent Testing Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Quality Gate |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per agent, expanding the Test Scenarios section of its specification into an executable test plan. An agent may not be activated, and a prompt/tool change may not deploy, without its test plan passing.

---

## Test Plan Card

| Field | Value |
|---|---|
| Test Plan ID | TST-<CATEGORY>-<NNN> |
| Agent Under Test | MX-TP-<CATEGORY>-<NNN> |
| Prompt/Config Version Covered | <version this plan validates> |
| Runner | <where these tests execute: CI suite, evaluation harness, manual checklist> |

## Scenario Table

| # | Scenario | Given | When | Then | Type | Automated |
|---|---|---|---|---|---|---|
| 1 | <name> | <preconditions/fixtures> | <action/input> | <expected outcome, observable> | <happy / boundary / failure / security> | <yes / manual> |
| 2 | … | | | | | |

Minimum coverage per agent: at least one scenario each for — happy path, invalid input, permission denial, escalation trigger, and (for LLM-backed agents) prompt-injection resistance.

## Fixtures and Test Data
<Datasets used (e.g., curated multilingual order messages, staging menu snapshot); where they live; how they are refreshed without leaking production PII.>

## Pass Criteria
<Exact thresholds: deterministic scenarios 100%; statistical scenarios (parsing accuracy etc.) with named threshold and sample size.>

## Regression Policy
<Every production incident attributable to this agent adds a scenario here before the fix merges. List incident-derived scenarios explicitly.>

## Evidence
<What a passing run produces (report artifact, CI link) and where evidence is archived for audit.>

## Schedule
<When the plan runs: on every change to agent code/prompt/tools, plus <cadence> scheduled regression runs.>

## Review
| Field | Value |
|---|---|
| Approved by | <QA team agent + owning team lead> |
| Approval date | <YYYY-MM-DD> |
| Next review due | <YYYY-MM-DD> |
