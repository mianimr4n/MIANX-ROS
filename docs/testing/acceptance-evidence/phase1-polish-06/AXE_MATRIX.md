# Axe matrix

## Automated (this repository)

| Surface | Suite | Critical | Serious |
| --- | --- | --- | --- |
| Public home / menu / admin login | `e2e/rc6/a11y-02-public.spec.ts` | 0 target | 0 target |
| Owner Command Center | Owner Playwright / prior QA | 0 (release evidence) | 0 |
| Admin authenticated matrix | Static contracts + shared shell fixes | **PR CI / Owner jobs** | See residual |

## Gate for POLISH-06 PR

- critical = 0 on tested matrix
- serious = 0 on tested matrix
- Moderate/minor not suppressed
- No global axe-rule disable

## Honest limitation

Full headed authenticated Admin axe across all families requires live local/CI stack. This PR ships shared-root fixes + static contracts; required CI Owner Playwright remains the authenticated integration path. Local live Supabase/API may be unavailable — do not invent PASS totals for unrun routes.
