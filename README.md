# Mianx ROS

**Multi-tenant Restaurant Operating System** by [Mianx.ai](https://mianx.ai).

First tenant live on the platform: **Telepizza Pakistan**.

---

## Project Overview

Mianx ROS (Restaurant Operating System) is a multi-tenant SaaS platform for running restaurant operations end-to-end — ordering, POS, kitchen, delivery, inventory, finance, CRM, loyalty, HR, and AI-driven automation.

The repository contains customer-facing applications, operational systems, backend services, documentation, and the engineering foundation that this platform is built on. It began as a dedicated build for Telepizza Pakistan; that implementation is now the platform's proven first tenant, and the reference for every module below.

---

## What Ships Today

| Surface | Location | Notes |
| --- | --- | --- |
| Customer website (PWA) | `apps/website` | React + Vite · 25+ customer pages · phone-first auth · loyalty wallet · order tracking |
| Admin ERP (Staff App) | `apps/website/client/src/pages/admin/` | 37 admin pages · 5 ops pages · 32 router modules totaling 350+ routes |
| Backend API | `backend/api` | Express · Supabase/Postgres · 1096+ backend tests |
| Database | `supabase/migrations` | Forward-only SQL migrations · Multi-tenant foundation (`organizations`/`brands`) added on top of the Phase 0–12 baseline |
| Canonical menu data | `data/catalog/` | Manifest + generated website fallback (seeded per-tenant) |

**Repository evidence determines implemented capability.**

---

## Repository Focus

Phases 0 through 12 are **PASS AND CLOSED** (latest: `v2.7.0` · Phase 12 — Customer and Staff Apps · ADR-039/040/041). All 41 ADRs (ADR-001 through ADR-041) Accepted v1.0. All Phase 0–12 work was built and verified against the platform's first tenant, Telepizza Pakistan.

Current engineering workstreams:

- **Multi-Tenant Foundation** (IN PROGRESS): promoting the single-tenant `organization_settings` singleton into a real `organizations` + `brands` model so the platform can onboard tenants beyond Telepizza.
- **Phase 13 — AI and Automation** (IN PROGRESS): demand forecasting · inventory prediction · delivery optimization · support AI · marketing automation · fraud signals · Mianx.ai agents · operational AI teams.

Future platform capabilities are tracked through the master roadmap: [`docs/14-phases/MIANX-ROS-MASTER-ROADMAP.md`](docs/14-phases/MIANX-ROS-MASTER-ROADMAP.md).

---

## Repository Status

| Area | Status |
| ------ | -------- |
| Architecture | Approved — 41 ADRs Accepted v1.0 (Telepizza tenant baseline) |
| Requirements | Maintained |
| Implementation | Phase 12 COMPLETE — `v2.7.0` shipped 2026-08-16 |
| Multi-Tenant Foundation | Phase A applied to production (`organizations` + `brands` tables live) |
| Phase 13 | AI and Automation — in progress |
| Verification | See [`docs/00-governance/REPOSITORY_STATUS.md`](docs/00-governance/REPOSITORY_STATUS.md) |

> This section reflects repository governance and does **not** imply production release, merge, deployment, or Founder sign-off.
>
> Phase 12 closeout: PR #239 squash-merged as `94e5d69` · annotated tag `v2.7.0` · GitHub Release published · 6/6 CI checks PASS · Production DB tip unchanged at `20260821000000` (closeout-only) prior to the Multi-Tenant Foundation migration. See [`docs/00-governance/REPOSITORY_STATUS.md`](docs/00-governance/REPOSITORY_STATUS.md) for the authoritative status and [`docs/releases/v2.7.0_RELEASE_NOTES.md`](docs/releases/v2.7.0_RELEASE_NOTES.md) for full release notes.

---

## Tenants

| Tenant | Brand | Branches | Status |
| --- | --- | --- | --- |
| Telepizza Pakistan | Telepizza | Royal Orchard (Operating) · Northern Bypass (Planned) | Live — first tenant |

---

## Quick Start

```bash
pnpm install

pnpm dev:website

pnpm --filter @mianx/ros-api dev
```

Website:

```text
http://localhost:3000
```

API:

```text
http://localhost:4000
```

See [`AGENTS.md`](AGENTS.md) for local development, Supabase, Docker, testing, and runtime instructions.

---

## Documentation

Documentation starts here:

```text
docs/README.md
```

Key documentation:

| Area | Location |
| ------ | ---------- |
| Documentation Portal | [`docs/README.md`](docs/README.md) |
| Governance | [`docs/00-governance/`](docs/00-governance/) |
| Architecture | [`docs/architecture/`](docs/architecture/) |
| Database | [`docs/database/`](docs/database/) |
| Operations | [`docs/operations/`](docs/operations/) |
| Agent Runtime | [`AGENTS.md`](AGENTS.md) |

Historical material — including the full Telepizza-specific implementation record (ADRs, release notes, acceptance evidence) — remains under the repository archive and reference structure. It is the proven baseline every future tenant's implementation is measured against.

Deprecated root planning files (`ROADMAP.md`, `PROJECT_STRUCTURE.md`, `PROJECT_MASTER_PLAN.md`) are **not** canonical authority.

---

## Repository Layout

```text
apps/
backend/
data/
docs/
scripts/
supabase/
tests/
```

The repository structure is intentionally modular to support future operational modules and future tenants while preserving stable implementation boundaries.

---

## Deployment

Current deployment configuration:

- Website → `vercel.json`
- API → `render.yaml`

Deployment readiness is governed by repository evidence and acceptance records.

---

## Governance Summary

Repository Governance v1 separates planning, implementation, and verification.

Engineering lifecycle:

```text
Architecture Decision (ADR)
        ↓
Requirements
        ↓
Repository Evidence
        ↓
Acceptance Gate
        ↓
Verified Delivery
```

Implementation is never considered verified until the acceptance gate has been completed.

---

## Repository Truth

The repository is the authoritative implementation source.

- Architecture defines approved direction.
- Requirements define intended capability.
- Repository evidence defines implemented capability.
- Acceptance gates define verified delivery.
- Planning documents, roadmaps, mockups, and architecture proposals are **not** implementation evidence.

No individual, document, or discussion overrides repository evidence.

---

## Powered By

Mianx.ai
