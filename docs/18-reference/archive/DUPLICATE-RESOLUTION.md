# Duplicate resolution notes (documentation cleanup)

**Date:** 2026-07-21  
**Class:** REFERENCE — merge ledger (no content deleted)

Duplicates were **relocated or aliased**, not silently discarded. Canonical winners:

| Topic | Canonical (ACTIVE) | Archived / superseded copies |
|---|---|---|
| Master roadmap | `docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md` | Root `ROADMAP.md` → `archive/root-legacy/`; stub at `docs/architecture/TELEPIZZA-MASTER-ROADMAP.md` |
| Milestone roadmap | `docs/14-phases/PROJECT-MILESTONE-AND-ROADMAP.md` | Former `docs/architecture/` copy moved here |
| Project structure | Living tree + `docs/README.md` | `archive/root-legacy/PROJECT_STRUCTURE.md` |
| Project master plan | Master roadmap + TEAS slots | `archive/root-legacy/PROJECT_MASTER_PLAN.md` |
| Database freeze pack | `docs/database/*` | Sprint freeze reports remain under `archive/documentation-audit/reports/` |
| Business freeze pack | `archive/documentation-audit/business-freeze-pack/` | Historical only; not living menu SoT |
| Menu extraction | `data/catalog/telepizza-canonical-menu.json` + `docs/catalog/` | `REAL-MENU-EXTRACTION.md` (root compat + `archive/root-legacy/`); `evidence/REAL_MENU_EXTRACTED.md` |
| Phase 1 reports | `docs/architecture/PHASE-1-*.md` | Older sprint reports in `archive/documentation-audit/reports/` |
| Auth architecture | `docs/architecture/AUTHENTICATION_ARCHITECTURE.md` | Sprint-03 auth reports in archive |
| Repository cleanup noise | Completion + INDEX only for daily nav | Full CSV/TXT retained under `archive/repository-cleanup-20260712/` |

**Rule applied:** Duplicate → Archive → Verify → Delete only if approved. No deletes of unique content in this cleanup.
