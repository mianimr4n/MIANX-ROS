# Telepizza Documentation Map

**Status:** ACTIVE Owner-first documentation spine
**Authority:** Navigation for Founder / Owner (super-admin) and engineering
**Last verified:** 2026-08-03 — `v1.5.0` released; Phase 1.1 professional-readiness audit complete (gate pending); see `00-governance/REPOSITORY_STATUS.md` and `testing/acceptance-evidence/phase1-professional-readiness-audit/`

---

## Start here (Owner)

| Doc | Why |
| --- | --- |
| [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md) | Full canonical map |
| [00-governance/PROJECT_STATUS.md](./00-governance/PROJECT_STATUS.md) | Opening status |
| [14-phases/OPENING_READINESS_PLAN.md](./14-phases/OPENING_READINESS_PLAN.md) | Path to 14 August |
| [11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md](./11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md) | Mianx.ai Team Center model |
| [15-runbooks/OPENING_DAY_RUNBOOK.md](./15-runbooks/OPENING_DAY_RUNBOOK.md) | Opening day actions |

---

## Repository Governance

Authority chain:

```text
README.md → AGENTS.md → docs/README.md → docs/00-governance/ → Architecture → Requirements → Evidence → Acceptance → Release
```

Repository evidence is the authoritative implementation source. Planning documents are not implementation evidence.

Decision Log is an **Append-only Record**: [00-governance/DECISION_LOG.md](./00-governance/DECISION_LOG.md).

Current repository status: [00-governance/REPOSITORY_STATUS.md](./00-governance/REPOSITORY_STATUS.md).

---

## Canonical ACTIVE TEAS documents

| Slot | Canonical file |
| --- | --- |
| 00-governance | PROJECT_STATUS.md · OPERATING_PRINCIPLES.md · DECISION_LOG.md · REPOSITORY_STATUS.md |
| 01-architecture | CURRENT_SYSTEM_MAP.md |
| 02-domains | DOMAIN_CAPABILITY_MATRIX.md |
| 03-data | PRODUCTION_DATA_BASELINE.md |
| 04-api | API_CATALOG.md |
| 05-events | ORDER_TO_DELIVERY_LIFECYCLE.md |
| 06-frontend | DASHBOARD_ROUTE_MATRIX.md |
| 07-backend | BACKEND_CAPABILITY_MATRIX.md |
| 08-security | RBAC_AND_ACCESS_MATRIX.md |
| 09-observability | PRODUCTION_HEALTH_SIGNALS.md |
| 10-devops | RELEASE_AND_ROLLBACK_RUNBOOK.md |
| 11-ai | MIANX_AI_TEAM_OPERATING_MODEL.md · AGENT_REGISTRY.md |
| 12-quality | ACCEPTANCE_MATRIX.md |
| 14-phases | OPENING_READINESS_PLAN.md (+ existing roadmaps) |
| 15-runbooks | OPENING_DAY_RUNBOOK.md (+ classic operations/) |
| 17-releases | RELEASE_HISTORY.md |
| 18-reference | GLOSSARY_AND_DATA_STATES.md |

Classic ACTIVE paths remain valid: `architecture/`, `database/`, `operations/`, `team/`, `catalog/`, `admin/`, `founder/`, `staff/`.

---

## Production architecture truth

- Website: Vercel
- API: Render
- DB/Auth: Supabase PostgreSQL
- One monorepo — **not** live Kubernetes/microservices/Prisma/mobile/event-bus

Branches: Royal Orchard = operating · Northern Bypass = coming-soon

---

## ARCHIVE / REFERENCE

Historical packs remain under `18-reference/archive/`. Legacy ZIP corpus is catalogued privately outside Git and is **not** imported wholesale.

---

## RC6 planning (not implementation evidence)

Living RC6 contracts and roadmap live under [`planning/`](./planning/). Command Center contracts: `RC6_COMMAND_CENTER_ARCHITECTURE.md` and related registries. Acceptance evidence: `testing/acceptance-evidence/rc6-*/`.
