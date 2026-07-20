# Telepizza Documentation Map

**Status:** ACTIVE index (post repository cleanup consolidation)  
**Authority:** Living navigation spine for engineers and Founders  
**Code/schema:** Not modified by documentation cleanup

---

## How to use this tree

| Class | Meaning |
|---|---|
| **ACTIVE** | Current source of truth — start here |
| **REFERENCE** | Valid for future phases; not daily SoT |
| **ARCHIVE** | Historical evidence — do not treat as current |
| **FUTURE** | Empty TEAS slots reserved for Enterprise Foundation Pack |
| **COMPAT** | Classic path kept for tests/tooling; TEAS number is the nav alias |

---

## Navigation model (hybrid TEAS)

Numbered TEAS folders (`00-governance` … `18-reference`) are the **enterprise navigation spine**.

Living ACTIVE content is stored under **stable classic paths** so existing tests and deep links keep working:

| TEAS slot | Classic path (files live here) |
|---|---|
| `01-architecture/` | `architecture/` |
| `03-data/` | `database/` |
| `15-runbooks/` | `operations/` |
| `16-decisions/` | `team/` |
| `18-reference/catalog/` | `catalog/` |

Each numbered slot has a `README.md` pointer. Prefer the TEAS path when browsing; prefer the classic path when linking from tests or historical docs.

```text
docs/
├── README.md                 ← you are here
├── 00-governance/ … 17-releases/   TEAS slots (README + FUTURE/ACTIVE)
├── 14-phases/                ACTIVE roadmaps (canonical files)
├── architecture/             ACTIVE architecture (classic)
├── database/                 ACTIVE DB freeze (classic)
├── operations/               ACTIVE runbooks (classic)
├── team/                     ACTIVE Founder decisions (classic)
├── catalog/                  ACTIVE catalog docs (classic)
└── 18-reference/
    ├── brand/                Logo.jpg
    ├── catalog/              README → ../catalog/
    └── archive/              ARCHIVE bundles
```

---

## ACTIVE documents (start here)

| Area | Path |
|---|---|
| Master roadmap (locked sequence) | [`14-phases/TELEPIZZA-MASTER-ROADMAP.md`](14-phases/TELEPIZZA-MASTER-ROADMAP.md) |
| Milestone companion | [`14-phases/PROJECT-MILESTONE-AND-ROADMAP.md`](14-phases/PROJECT-MILESTONE-AND-ROADMAP.md) |
| Architecture | [`architecture/`](architecture/) · nav alias [`01-architecture/`](01-architecture/) |
| Database freeze & workflow | [`database/`](database/) · nav alias [`03-data/`](03-data/) |
| Catalog docs | [`catalog/`](catalog/) |
| Canonical menu data | [`../data/catalog/telepizza-canonical-menu.json`](../data/catalog/telepizza-canonical-menu.json) |
| Founder decisions (CP-0, CP-7) | [`team/`](team/) · nav alias [`16-decisions/`](16-decisions/) |
| Auth email runbook | [`operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`](operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md) |
| Agent ops | [`../AGENTS.md`](../AGENTS.md) |

### Phase 1 (customer platform) — still under Founder review

| Doc | Path |
|---|---|
| Completion audit | `architecture/PHASE-1-CUSTOMER-PLATFORM-COMPLETION-AUDIT.md` |
| Completion program | `architecture/PHASE-1-CUSTOMER-PLATFORM-COMPLETION-PROGRAM.md` |
| Deployment readiness | `architecture/PHASE-1-ENGINEERING-DEPLOYMENT-READINESS.md` |
| Migrations inventory | `architecture/PHASE-1-CUSTOMER-MIGRATIONS-INVENTORY.md` |

**Do not claim Phase 1 PASS** until Founder closure checklist is signed.

---

## REFERENCE

| Area | Path |
|---|---|
| Curated AI workforce templates (archived bulk) | `18-reference/archive/template-enterprise/00-ai-workforce/` |
| Future requirements packs | `18-reference/archive/template-enterprise/02-requirements/` |

Promote to ACTIVE only via ADR + Founder approval.

---

## ARCHIVE (historical — recoverable)

| Bundle | Path | Contents |
|---|---|---|
| Root legacy | [`18-reference/archive/root-legacy/`](18-reference/archive/root-legacy/) | Old `ROADMAP.md`, `PROJECT_*`, `REAL-MENU-EXTRACTION.md` |
| Template enterprise library | [`18-reference/archive/template-enterprise/`](18-reference/archive/template-enterprise/) | Former `docs/00–05` packs (~500 files) |
| Repository cleanup 2026-07-12 | [`18-reference/archive/repository-cleanup-20260712/`](18-reference/archive/repository-cleanup-20260712/) | CSV/TXT audits + completion report |
| Documentation audit | [`18-reference/archive/documentation-audit/`](18-reference/archive/documentation-audit/) | Business freeze pack, releases, evidence, sprint reports |
| Misc scripts | [`18-reference/archive/scripts/`](18-reference/archive/scripts/) | Former root `.verify-bundle.mjs` |

See each archive folder’s `README.md` / `INDEX.md`.

**Local compat:** after clone on Windows, recreate junction  
`_documentation-audit` → `docs/18-reference/archive/documentation-audit`  
if tooling still expects the old root path. Content is never deleted — only relocated.

---

## Deprecated / superseded

| Former location | Superseded by |
|---|---|
| Root `ROADMAP.md` | `14-phases/TELEPIZZA-MASTER-ROADMAP.md` |
| Root `PROJECT_STRUCTURE.md` | This map + real `apps/`, `backend/`, `supabase/` |
| Root `PROJECT_MASTER_PLAN.md` | Master roadmap + TEAS slots |
| `_repository-cleanup/` | `18-reference/archive/repository-cleanup-20260712/` |
| `_documentation-audit/` (as daily SoT) | Archive path above; living DB/architecture under classic paths |

---

## FUTURE (empty TEAS slots)

`00-governance`, `02-domains`, `04-api` … `13-adr`, `11-ai`, `12-quality`, `17-releases` — reserved for Enterprise Architecture Standards filings. Each contains a placeholder `README.md`.

---

## Root files (allowed)

`README.md` · `AGENTS.md` · `package.json` · `pnpm-lock.yaml` · `pnpm-workspace.yaml` · `.env.example` · `.gitignore` · `vercel.json` · `render.yaml`

**Compat shim (temporary):** `REAL-MENU-EXTRACTION.md` at repo root — identical copy of archive file, required by website contract tests until those path strings are updated in a dedicated PR.
