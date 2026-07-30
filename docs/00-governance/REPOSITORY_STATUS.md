# Repository Status

**Status:** Living Document

---

## Purpose

This document records the current verified status of the Telepizza ROS repository.

Repository status is determined by repository evidence, acceptance verification, and release records.

Planning documents do not determine repository status.

---

## Status Principles

Repository status must always distinguish between:

- Planned
- Approved
- Implemented
- Verified
- Released

These states must never be treated as equivalent.

---

## Current Repository Status

| Area | Status |
|------|--------|
| Repository Governance | Active |
| Architecture | Approved |
| Requirements | Active |
| Documentation | Active |
| Repository Evidence | Current |
| Acceptance Process | Active |
| Release Policy | Active |

---

## Current Delivery

| Item | Status |
|------|--------|
| Current Delivery Slice | Phase 2 — Admin ERP settings backend (Organization/Branch/Menu/Delivery APIs), on top of Phase 0/1 stabilization |
| Opening Operations M1–M4 | **Complete** — merged to `main` via [PR #113](https://github.com/mianimr4n/telepizza/pull/113) (`3ab4715`) |
| Phase 0 — Foundation Stabilization & CI | **Complete** — [PR #114](https://github.com/mianimr4n/telepizza/pull/114) |
| Phase 1 — Admin ERP zero-fake-data audit (15 modules) | **Complete** — [PR #115](https://github.com/mianimr4n/telepizza/pull/115) |
| Staff-assignment FK fix + Settings save/delete fixes | **Complete** — [PR #116–#118](https://github.com/mianimr4n/telepizza/pull/118) |
| Phase 2 — Organization/Branch settings APIs | **Complete** — [PR #119](https://github.com/mianimr4n/telepizza/pull/119) |
| Phase 2 — Menu/Delivery settings APIs | **Complete** — [PR #120](https://github.com/mianimr4n/telepizza/pull/120) |
| Production Migrations (Opening Ops M1–M4) | **Applied** — `npx supabase db push --linked` run 2026-07-29 |
| Northern Bypass | `coming-soon` (unchanged) |
| Next focus | Owner Decision Queue: devices onsite verification, payment provider, SOPs, training, rehearsals, Founder go/no-go for Royal Orchard opening **14 August 2026** |

Owner-facing summary remains in [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) (last verified **2026-07-29**). This document was refreshed after PR #119/#120 merge (**2026-07-29**).

### Post-Opening-Ops stabilization and settings backend (this pass)

- **CI gate**: `.github/workflows/ci.yml` added (PR #114) — typecheck + full test suite on every PR/push to `main`.
- **`user_roles`→`users` embed bug fixed**: Opening M1 added `assigned_by`/`verified_by`/`deactivated_by` FKs to `user_roles`, making the bare `users(...)` PostgREST embed ambiguous and breaking `/admin/hr` staff-assignment list/assign entirely. Fixed by hinting `users!user_roles_user_id_fkey(...)`.
- **Settings save/delete bugs fixed**: notification-channel Save was overwriting `VERIFIED` status back to `CONFIGURED`; Devices Delete was routing through a "fail" path (`FAILED`) instead of a soft-remove. Both fixed — Save now preserves verified status, Delete soft-removes to `NOT_APPLICABLE`.
- **Organization & Branch settings APIs** (PR #119): `GET/PUT /admin/settings/organization`, `GET/PUT /admin/branches/:id` — real Supabase-backed read/write, migration `20260729140000_phase2_organization_and_branch_settings.sql`. Organization/Branches panels no longer Foundation/read-only.
- **Menu & Delivery settings APIs** (PR #120): equivalent real write APIs for menu SKU pricing/availability and delivery radius/fee settings.
- Royal Orchard staff assignments: 7/7 canonical roles assigned via `/admin/hr` (Owner Decision Queue item #1 complete).
- Notification channels: Customer orders, Rider dispatch, Escalation configured and ACTIVE; Kitchen alerts still pending.

### Opening Operations (M1–M4) — verified delivery

| Milestone | Scope | Decision |
| --- | --- | --- |
| M1 | Branch staff, floors/tables, booking policy | COMPLETE |
| M2 | Payments, notifications, device verification | COMPLETE |
| M3 | SOPs, training, rehearsals, Founder GO/NO-GO, Owner handover | `OPENING_OPERATIONS_MILESTONE_3_COMPLETE` |
| M4 | Staff seeding + encrypted handover, live config, dry-run evidence | `OPENING_OPERATIONS_MILESTONE_4_COMPLETE` |

Honest non-claims from M4 evidence: no Production staff apply, no real customer notifications, no real card transactions, no Northern Bypass activation, no automatic branch status change.

### Executive Dashboard v1 (released baseline)

Executive Dashboard v1 remains **Released** to production as of merge commit `f685599` (2026-07-24). Acceptance remains **PASS WITH LIMITATIONS**.

### Production verification evidence (D1 post-deploy)

- Website Production deploy: success (`f685599`) → `https://telepizza-website.vercel.app`
- API Production deploy: success (`f685599`) → Render `telepizza-api` (`/healthz` 200)
- Production bundle markers confirmed: Active Orders, Kitchen Queue, Average Order Value, Active Deliveries, Mianx.ai Operations Insights, Loading insights, D1 operations grid copy
- `/admin/login` returns HTTP 200
- Authenticated live KPI browser session was not re-run in this post-deploy pass (gate remains login-protected)

### Accepted verification limitations (D1)

- Customer-session RBAC browser proof was unavailable (no local customer fixture).
- Live API error state was not induced during AV1 (code now prefers KPI `error` over stale payload; production induction still pending).
- Planned/disabled module cards are represented in Admin shell navigation rather than the D1 operations grid.

### Phase 0 / Phase 1 note

Phase 0 Foundation Stabilization covers CI gate recovery and documentation sync. Phase 1 Dashboard finalization is the authorized next product slice for the 14 August Royal Orchard opening. Opening readiness % remains live-evidence-driven — software milestone complete does not equal restaurant Production-ready.

---

## Status Definitions

### Planned

Work has been identified but has not been authorized for implementation.

### Approved

Architecture or requirements have been approved.

Implementation may begin.

### Implemented

Repository evidence demonstrates implementation.

Acceptance may still be pending.

### Verified

Acceptance verification has completed successfully.

Known limitations remain documented where applicable.

### Released

Verified implementation has completed the release process.

---

## Repository Truth

Repository status is based on:

- Source code
- Tests
- Acceptance reports
- Repository evidence
- Release records

Repository status must never be derived from:

- Planning documents
- Roadmaps
- Mockups
- Discussions
- Assumptions

---

## Review

This document should be updated whenever:

- a delivery reaches a new lifecycle stage;
- acceptance status changes;
- release status changes;
- repository governance changes.

---

## Related Documents

- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- [GOVERNANCE.md](./GOVERNANCE.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [DECISION_LOG.md](./DECISION_LOG.md)

---

## Summary

Repository Status provides an honest view of the current verified state of the repository.

Opening Operations M1–M4 are merged; current engineering focus is Phase 0 stabilization then Phase 1 dashboard finalization for the 14 August opening. Implementation, verification, and release remain tracked independently.
