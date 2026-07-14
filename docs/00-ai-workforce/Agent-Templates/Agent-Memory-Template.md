# Agent Memory Template

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-008 |
| Title | Agent Memory Template |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

> Usage: one filled copy per agent that persists state between runs. Declares exactly what an agent remembers, where, for how long, and who can read it. Undeclared persistence is a policy violation — agents may not accumulate shadow state.

---

## Memory Declaration Card

| Field | Value |
|---|---|
| Memory ID | MEM-<CATEGORY>-<NNN> |
| Owning Agent | MX-TP-<CATEGORY>-<NNN> |
| Storage Backend | <approved store: Postgres table, document store path — never local files or ad-hoc caches> |
| Contains PII | <Yes — fields / No> |

## Memory Classes

| Class | Contents | Purpose | Retention | Example |
|---|---|---|---|---|
| Working | <per-task state> | resume interrupted work | <hours–days, auto-purged> | current batch progress |
| Episodic | <completed run records> | audit, retrospectives | <per audit policy> | past report runs with outcomes |
| Knowledge | <learned facts, alias tables, thresholds> | improve future decisions | <until superseded, versioned> | menu name aliases, seasonal demand notes |

## Write Rules
<What events cause writes; validation before persistence; who else may write to this memory (usually: nobody).>

## Read Rules
<Which agents/humans may read each class; PII redaction on read where applicable.>

## Update and Correction
<How wrong memories are corrected — corrections are appended with provenance, not silently overwritten, for episodic and knowledge classes.>

## Retention and Deletion
<Per-class retention schedule; deletion mechanism; legal holds; customer data deletion requests propagate here within the mandated window.>

## Memory Poisoning Defenses
<How the agent prevents untrusted input (customer messages, external data) from being persisted as trusted knowledge — provenance tagging and review thresholds required for knowledge-class writes.>

## Backup and Recovery
<Whether this memory is backed up (episodic/knowledge: yes; working: no), and rebuild procedure after loss.>

## Review
| Field | Value |
|---|---|
| Approved by | <Governance + Security teams> |
| Approval date | <YYYY-MM-DD> |
| Next review due | <YYYY-MM-DD> |
