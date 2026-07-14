# Agent Templates

| Field | Value |
|---|---|
| Document ID | MX-TP-TPL-000 |
| Title | Agent Templates — Index and Usage Guide |
| Status | Draft — pending owner review |
| Version | 1.0.0 |
| Owner | Mianx.ai AI Workforce — Governance |
| Authority | Mianx.ai AI Workforce → governs, orchestrates, and powers → Telepizza AI Agent Workforce → operates and continuously improves → Telepizza Digital Enterprise |
| Classification | Internal — Governance |
| Last Updated | 2026-07-14 |

## Purpose
This folder is the single source of structure for defining every agent in the Telepizza AI Agent Workforce. Any new agent — regardless of team — must be authored from these templates so that specifications remain comparable, auditable, and governable by Mianx.ai.

## How to Create a New Agent Specification

1. Copy `Base-Agent-Template.md` into the correct category folder (see below).
2. Assign the next free Document ID for that category (scan for duplicates before assigning).
3. Fill every section — no section may be deleted; write "Not applicable — <reason>" where truly irrelevant.
4. Attach role-specific content only. Generic copy-pasted text across agents fails review.
5. Complete the supporting templates where the role needs them (Prompt, Tools, KPI, Testing, etc.).
6. Submit for review; the file stays `Status: Draft` until the human owner approves it.

## Template Files in This Folder

| Template | Document ID | Use for |
|---|---|---|
| Base-Agent-Template.md | MX-TP-TPL-001 | The 25-section master structure for any agent specification |
| Agent-Prompt-Template.md | MX-TP-TPL-002 | The agent's system prompt and instruction blocks |
| Agent-Capability-Template.md | MX-TP-TPL-003 | Declaring a single capability with permissions and limits |
| Agent-Tools-Template.md | MX-TP-TPL-004 | Registering tools/integrations an agent may call |
| Agent-Workflow-Template.md | MX-TP-TPL-005 | Multi-step workflows with gates and escalations |
| Agent-SOP-Template.md | MX-TP-TPL-006 | Standard operating procedures for recurring tasks |
| Agent-KPI-Template.md | MX-TP-TPL-007 | KPI definitions with targets and measurement sources |
| Agent-Memory-Template.md | MX-TP-TPL-008 | What an agent persists, where, and retention rules |
| Agent-Testing-Template.md | MX-TP-TPL-009 | Test scenarios and acceptance evidence for an agent |

## Category Folders

Agent specifications live in per-discipline folders: `Analytics/`, `Customer-Success/`, `Data-AI/`, `Design/`, `DevOps/`, `Engineering/`, `Executive/`, `Finance/`, `HR/`, `Infrastructure/`, `Legal/`, `Marketing/`, `Operations/`, `Product/`, `QA/`, `Research/`, `SEO/`, `Sales/`, `Security/`, `Shared/`.

The Engineering folder (MX-TP-ENG-001…010) is the reference implementation of the Base template — consult it when in doubt about depth and tone.

## Document ID Scheme

`MX-TP-<CATEGORY>-<NNN>` — e.g., `MX-TP-ENG-004` (Engineering, Backend Agent), `MX-TP-TPL-001` (this folder). IDs are never reused, including after file deletion.

## Governance Rules

- Templates change only via reviewed PRs; a template change requires a migration note for existing specs.
- Every agent spec must preserve the authority chain shown in the header of this file.
- Human approval gates listed in a spec are binding; no agent may self-waive them.

## Change History
| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-14 | Mianx.ai Documentation Completion Agent | Initial index and usage guide |
