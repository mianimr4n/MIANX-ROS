# Phase 1.1 — Findings register

Severity model: P0 security/outage · P1 core/honesty · P2 professional UX · P3 cosmetic

## Summary

| Severity | Count |
| --- | --- |
| P0 | **0** |
| P1 unresolved | **0** (original P1 closed or accepted P2 residual) |
| P2 accepted residuals | See `phase1-polish-qa/ACCEPTED_P2_P3_RESIDUALS.md` |
| P3 accepted residuals | See `phase1-polish-qa/ACCEPTED_P2_P3_RESIDUALS.md` |

**Gate:** NOT PASSED — PENDING PRODUCTION CERTIFICATION (`phase1-polish-qa/`).


## P0

None evidenced. (Logout bounce fixed in QA-04 / `v1.5.0`.)

## P1 (blockers for “professionally ready” claim)

| ID | Route | Role | Expected | Actual | Fix slice |
| --- | --- | --- | --- | --- | --- |
| P11-SET-01 | `/admin/settings` | admin.access | Nav reflects editable | **Resolved in POLISH-04** (Opens module) | POLISH-04 |
| P11-SET-02 | `/admin/settings` | admin.access | Readiness banner shown | **Resolved in POLISH-04** (mounted contextual) | POLISH-04 |
| P11-HR-01 | `/admin/hr` | staff.* | Header matches payroll LIVE | **Resolved in POLISH-04** | POLISH-04 |
| P11-COM-01 | `/admin/inventory` | inventory | Empty stock ≠ all-clear | **Resolved in POLISH-04** | POLISH-04 |
| P11-COM-02 | `/admin/purchasing` | purchasing | Prod-unverified caveat | **Resolved in POLISH-04** | POLISH-04 |
| P11-STATE-01 | inventory | inventory | empty ≠ healthy | **Resolved in POLISH-04** | POLISH-04 |
| P11-STATE-02 | settings | admin | unsupported ≠ Available | **Resolved in POLISH-04** | POLISH-04 |
| P11-OPS-01 | `/admin/delivery` | delivery | Deferred not primary chrome | **Resolved in POLISH-03** (stubs collapsed) | POLISH-03 |
| P11-OPS-02 | `/admin/whatsapp` | order.manage | Orders-only framing | **Resolved in POLISH-03** (attribution framing) | POLISH-03 |
| P11-CRM-01 | `/admin/crm` | order.manage | VIP/blocked Foundation | **Resolved in POLISH-04** (unavailable) | POLISH-04 |
| P11-SHELL-branch | shell+filters | all | Single branch mental model | Dual selectors | **POLISH-01 partial** — Settings edit-target labeled; filter-bar dupes residual |

(Full P2/P3 enumerated across domain audit files; tracked in backlog.)

## Reproduction (screenshot-free)

Example **P11-COM-01:** With zero stock items, open Inventory insights → observe “Every tracked item is above its minimum” (`admin-inventory.ts` when `lowStockCount===0` without guarding `stockItemCount===0`).
