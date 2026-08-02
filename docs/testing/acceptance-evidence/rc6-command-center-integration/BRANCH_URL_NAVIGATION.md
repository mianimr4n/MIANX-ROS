# RC6-QA-03 — Branch & URL navigation

## Branch scope

| Mechanism | Behavior |
| --- | --- |
| Owner branch selector | `AdminBranchContext` / `branchIdFilter` drives all OCC fetches |
| URL `branchId` | **Not** invented on KPI drill-downs or command-mode URLs |
| Drill-down destinations | Existing `/admin/*` routes; retain server auth + prior branch context |

KPI registry note: branch scope uses the Owner branch selector, not a URL `branchId`.

## Command mode URL

| Token | Mode |
| --- | --- |
| `pre-open` | `PRE_OPEN` |
| `live` | `LIVE_OPERATIONS` |
| `closing` | `CLOSING` |

- Query key: `?commandMode=` only (sanitized; invalid → suggestion fallback).
- Mode write touches **only** `commandMode` — never PII keys or fabricated branch params.
- Playwright Test B deep-links each token; OCC `data-selected-command-mode` must match.

## Drill-down / Back

| Action | Expected |
| --- | --- |
| KPI drill-down | Navigates to domain route with supported filters only |
| Browser Back | Returns to OCC without forcing re-login |
| Reload on `/admin/dashboard` | Session preserved; OCC remounts |

## Filters (What Changed timeline)

- Domain / severity filters are client-side on derived events.
- No customer phone, employee salary, or order contents placed in URL query strings.

## Out of scope

- Cross-tenant URLs, shareable deep links with secrets, Production URL certification.
