# Telepizza ROS

Official digital platform for **Telepizza Pakistan** (Powered by Mianx.ai).

---

## Project Overview

Telepizza ROS (Restaurant Operating System) is the enterprise platform for Telepizza Pakistan.

The repository contains customer-facing applications, operational systems, backend services, documentation, and the engineering foundation required to evolve into a complete restaurant operating system.

---

## What Ships Today

| Surface | Location | Notes |
| --- | --- | --- |
| Customer website | `apps/website` | React + Vite · menu, cart, checkout, account |
| Backend API | `backend/api` | Express · Supabase/Postgres |
| Database | `supabase/migrations` | Forward-only SQL migrations |
| Canonical menu data | `data/catalog/` | Manifest + generated website fallback |

**Repository evidence determines implemented capability.**

---

## Repository Focus

Current engineering workstreams:

- Customer Platform
- Admin ERP Foundation
- Executive Dashboard workstream

Future platform capabilities are tracked through the roadmap and architecture documents.

---

## Repository Status

| Area | Status |
| ------ | -------- |
| Architecture | Approved |
| Requirements | Maintained |
| Implementation | Repository evidence defines implemented capability |
| Current Delivery Slice | D1 – Executive Dashboard v1 |
| Verification | See [`docs/00-governance/REPOSITORY_STATUS.md`](docs/00-governance/REPOSITORY_STATUS.md) |

> This section reflects repository governance and does **not** imply production release, merge, deployment, or Founder sign-off.
>
> Executive Dashboard v1 current honesty: Architecture PASS · Implementation PASS · Repository verification PASS · Acceptance PASS WITH LIMITATIONS · **Released** (merge `f685599` / PR #100). Known AV1 limitations remain documented in [`docs/00-governance/REPOSITORY_STATUS.md`](docs/00-governance/REPOSITORY_STATUS.md).

---

## Product Branches

- Royal Orchard (Operating)
- Northern Bypass (Planned)

---

## Quick Start

```bash
pnpm install

pnpm dev:website

pnpm --filter @telepizza/api dev
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

Historical material remains under the repository archive and reference structure.

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

The repository structure is intentionally modular to support future operational modules while preserving stable implementation boundaries.

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
