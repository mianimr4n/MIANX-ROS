# Phase 2 Readiness Audit — Parallel Maintenance Plan

**Audit date:** 2026-08-04
**Status:** PROPOSED — Maintenance tasks classified into a dedicated parallel lane

---

## Parallel Maintenance Items

| Item | Severity | Owner | Surface | Parallel Allowed? | Blocks Phase 2? | Acceptance Criteria |
|---|---|---|---|---|---|---|
| **Backend Sales CSV Formula Hardening** | P2 | Engineering | `backend/api/src/modules/admin/reports.ts` | Yes | No | CSV export formulas sanitized against injection; numbers formatted deterministically. |
| **CSP Rollout Design** | P2 | Security | `apps/website/vite.config.ts`, Vercel Headers | Yes | No | Content-Security-Policy headers defined, tested in report-only mode, zero broken assets. |
| **Marketing Image Optimization** | P2 | Frontend | `apps/website/client/public/images` | Yes | No | Images compressed to WebP/AVIF format; image payload size reduced by > 40%. |
| **`/ops/*` Discoverability** | P3 | Frontend | `apps/website/client/src/App.tsx` | Yes | No | Deep links and navigation shortcuts added for direct access to staff operational views. |
| **Dual Branch/Filter Chrome Cleanup** | P2 | Frontend | Admin Header / Branch Selector | Yes | No | Redundant branch selector dropdowns unified across AdminShell and sub-pages. |
| **P11-VIS-02 & P11-VIS-03 Visual Polish** | P3 | Frontend | Admin Dashboard & KPI Cards | Yes | No | Visual spacing, color contrast, and typography alignment completed for P11 standards. |
| **Moderate/Minor Accessibility Residuals** | P2 | Frontend | Admin ERP Forms | Yes | No | Form controls receive explicitly associated `<label>` tags; zero axe warnings on minor components. |
| **Untested Production-Role Coverage** | P2 | QA | Playwright Test Suite | Yes | No | Automated login and smoke coverage added for cashier, host, waiter, and support roles. |

---

## Governance Rules for Parallel Lane

1. Maintenance PRs must be submitted separately with prefix `maint/` or `fix/`.
2. Maintenance changes MUST NOT be mixed into Phase 2 feature PRs.
3. Completing maintenance tasks does NOT count as Phase 2 feature progress.
