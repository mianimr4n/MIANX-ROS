# POLISH-QA — Headed axe matrix

**Tool:** axe-core via Playwright (`wcag2a`/`wcag2aa`). **Gate:** critical=0, serious=0. Not full legal WCAG certification.

## Public

| Route | Desktop | Mobile |
| --- | --- | --- |
| `/` | PASS | PASS (`test:e2e:a11y02` + polish-qa) |
| `/menu` | PASS | PASS |
| `/admin/login` | PASS | PASS |
| `/reset-password` | PASS (polish-qa) | PASS |

## Owner Admin representative (polish-qa)

| Route | critical/serious |
| --- | --- |
| `/admin/dashboard` | 0 |
| `/admin/orders` | 0 |
| `/admin/kitchen` | 0 |
| `/admin/delivery` | 0 (after amber/emerald contrast remediation) |
| `/admin/inventory` | 0 |
| `/admin/purchasing` | 0 |
| `/admin/crm` | 0 |
| `/admin/hr` | 0 |
| `/admin/finance` | 0 |
| `/admin/reports` | 0 |
| `/admin/settings` | 0 |

## Owner command modes

RC6-QA-03 Owner Command Center axe across modes — PASS (×3 owner suite runs).

## Moderate / minor / manual

Retained as accepted residuals; not globally disabled. See `ACCEPTED_P2_P3_RESIDUALS.md`.
