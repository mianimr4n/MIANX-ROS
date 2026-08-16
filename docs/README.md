# Telepizza Documentation Map

**Status:** ACTIVE Owner-first documentation spine
**Authority:** Navigation for Founder / Owner (super-admin) and engineering
**Last verified:** 2026-08-16 — **Phase 12 COMPLETE (`v2.7.0`)** — PR #239 squash-merged as `94e5d69` · annotated tag `v2.7.0` · GitHub Release published · 6/6 CI checks PASS · Production DB tip unchanged at `20260821000000` (closeout-only — same as Phase 5/6/7/8/9/10/11) · All 41 ADRs (ADR-001 through ADR-041) Accepted v1.0 · Phase 13 (AI and Automation) UNLOCKED. See `00-governance/REPOSITORY_STATUS.md` and `testing/acceptance-evidence/phase12-closeout/`.

---

## Start here (Owner)

| Doc | Why |
| --- | --- |
| [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md) | Full canonical map |
| [00-governance/PROJECT_STATUS.md](./00-governance/PROJECT_STATUS.md) | Project status (Phase 12 shipped, Phase 13 unlocked) |
| [14-phases/TELEPIZZA-MASTER-ROADMAP.md](./14-phases/TELEPIZZA-MASTER-ROADMAP.md) | Master phase roadmap (Phases 0–15) |
| [17-releases/RELEASE_HISTORY.md](./17-releases/RELEASE_HISTORY.md) | Release history (`v2.0.0` → `v2.7.0`) |
| [11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md](./11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md) | Mianx.ai Team Center model (Phase 13 foundation) |
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

## Phase release history (verified)

| Phase | Tag | PR | ADRs | Status |
| --- | --- | --- | --- | --- |
| Phase 5 — Order Lifecycle | `v2.0.0` | #232 | ADR-018 | ✅ COMPLETE |
| Phase 6 — Admin and ERP Core | `v2.1.0` | #233 | ADR-019/020/021/022 | ✅ COMPLETE |
| Phase 7 — POS System | `v2.2.0` | #234 | ADR-023/024/025/026 | ✅ COMPLETE |
| Phase 8 — Kitchen Dashboard | `v2.3.0` | #235 | ADR-027/028/029 | ✅ COMPLETE |
| Phase 9 — Rider and Delivery App | `v2.4.0` | #236 | ADR-030/031/032 | ✅ COMPLETE |
| Phase 10 — Inventory and Procurement | `v2.5.0` | #237 | ADR-033/034/035 | ✅ COMPLETE |
| Phase 11 — Finance and Reporting | `v2.6.0` | #238 | ADR-036/037/038 | ✅ COMPLETE |
| Phase 12 — Customer and Staff Apps | `v2.7.0` | #239 | ADR-039/040/041 | ✅ COMPLETE |
| Phase 13 — AI and Automation | — | — | — | 🔓 UNLOCKED (not started) |
| Phase 14 — Full Integration and QA | — | — | — | 🔒 Not started |
| Phase 15 — Final Production Launch | — | — | — | 🔒 Not started |

All releases since Phase 5 are **closeout-only** (no new migrations). See [`17-releases/RELEASE_HISTORY.md`](./17-releases/RELEASE_HISTORY.md) for full release notes links and [`14-phases/TELEPIZZA-MASTER-ROADMAP.md`](./14-phases/TELEPIZZA-MASTER-ROADMAP.md) for the authoritative master roadmap.

---

## ARCHIVE / REFERENCE

Historical packs remain under `18-reference/archive/`. Legacy ZIP corpus is catalogued privately outside Git and is **not** imported wholesale. Pre-Phase-5 RC4/RC5/RC6 closeout evidence packs remain under `testing/acceptance-evidence/rc4-*/` through `rc6-*/` and `phase1-*/` for historical reference.
