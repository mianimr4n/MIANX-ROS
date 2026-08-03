# POLISH-QA — Findings reconciliation

Source registers: `phase1-professional-readiness-audit/FINDINGS_REGISTER.md` + POLISH-01…07 residuals.

## Totals

| Class | Count |
| --- | --- |
| RESOLVED (original P1) | 10 of 11 listed P1 rows closed in POLISH-03/04; shell-branch residual accepted P2 |
| P0 unresolved | **0** |
| P1 unresolved | **0** |
| ACCEPTED_P2_RESIDUAL | See `ACCEPTED_P2_P3_RESIDUALS.md` |
| ACCEPTED_P3_RESIDUAL | See `ACCEPTED_P2_P3_RESIDUALS.md` |
| BLOCKING_UNRESOLVED | **0** |
| MOVED_TO_PHASE2_WITH_APPROVED_SCOPE_REASON | Delivery/Rider lifecycle depth, Settings control-plane (explicit Phase 2; not used to hide P1 defects) |

## Named residual classifications

| Item | Classification | Notes |
| --- | --- | --- |
| 1. Backend sales/orders CSV formula injection | **ACCEPTED_P2_RESIDUAL (B)** | Reachable, role-gated; user-influenced contact fields; no formula guard in backend `csvEscape`. Frontend EOD CSV guarded. No unauthorized-data P0/P1 proven. Backend change requires separate authorization. |
| 2. CSP | **ACCEPTED_P2_RESIDUAL** | `NOT_CONFIGURED`; not falsely claimed; no active exploit path proven. |
| 3. Marketing image optimization | **ACCEPTED_P3_RESIDUAL** | Maintenance; not readiness blocker. |
| 4. Headed Admin accessibility residual | **RESOLVED for critical/serious** on representative matrix (POLISH-QA headed); moderate/minor remain accepted. |
| 5. Eleven-viewport Admin matrix | **RESOLVED** via POLISH-QA headed overflow matrix (11 viewports × representative routes). |
| 6. Branch/filter dual chrome | **ACCEPTED_P2_RESIDUAL** | Settings edit-target labeled; filter-bar dupes remain. |
| 7. `/ops/*` discoverability | **ACCEPTED_P2_RESIDUAL** | Legacy staff ops vs Admin ERP; not dead primary Admin route. |
| 8. P11-VIS-02 / P11-VIS-03 | **ACCEPTED_P2 / P3** | Card padding / insight list style debt. |
| 9. Moderate/minor/manual a11y | **ACCEPTED_P2/P3** | Tracked; not suppressed globally. |
| 10. Static-only tests without browser | **VERIFIED** where headed now exists (Owner ×3, a11y02, polish-qa); remaining static contracts documented as complementary. |

## Original P1 rows

| ID | Status |
| --- | --- |
| P11-SET-01/02 | RESOLVED (POLISH-04) |
| P11-HR-01 | RESOLVED (POLISH-04) |
| P11-COM-01/02 | RESOLVED (POLISH-04) |
| P11-STATE-01/02 | RESOLVED (POLISH-04) |
| P11-OPS-01/02 | RESOLVED (POLISH-03) |
| P11-CRM-01 | RESOLVED (POLISH-04) |
| P11-SHELL-branch | ACCEPTED_P2_RESIDUAL (partial POLISH-01) |

## Gate honesty

Phase 1.1 overall gate remains **PENDING PRODUCTION CERTIFICATION** / **NOT PASSED** until POLISH-QA merges, deploys, and Production verification completes. No full legal WCAG claim.
