# RC6-QA-03 — Cross-capability consistency

## Shared data plane

- `AdminDashboard` owns `useOperationalData` fetches (ops dashboard, orders, kitchen, delivery, PO/invoices, finance/HR attention, posted P&L when permitted).
- `OwnerCommandCenter` **composes** DASH-01…08 from those props — mode switch must not spawn a second ops fetch storm.
- Branch scope comes from `AdminBranchContext` / `branchIdFilter`, shared by all panels.

## Honesty alignment

| Topic | Integrated rule |
| --- | --- |
| Since wording | Device review baseline or selected business window — never “last login” |
| EOD status | Preview / reviewable / non-final only — never FINAL or CLOSED |
| Profitability | Operational Estimate vs Accounting Posted labels required when both shown |
| Mode emphasis | Presentation-only helpers; formulas and source values unchanged |
| Finance gate | `financeEnabled={canLoadFinance}` from dashboard into OCC; posted P&L omitted when disabled |
| Degraded | Shared retry (`onExceptionRetry`) + `totalFailure` paths; no silent all-clear |

## Composition across modes

Static contract (`tests/website/rc6-qa-03-command-center-integration.test.mjs`): every mode (`PRE_OPEN`, `LIVE_OPERATIONS`, `CLOSING`) includes sections `exception-center`, `approval-inbox`, `branch-health`, `profitability-truth`, `eod-pack`, `what-changed`.

## Mutation / provider boundary (integrated)

Panels must not expose Acknowledge / Approve / Finalize / Close Day. No OpenAI / WhatsApp / SendGrid / Resend in OCC. LocalStorage for What Changed stores aggregates/timestamps only (no tokens).

## Residual inconsistencies (honest)

- DASH-04 remains fragmented source-backed inbox — not a unified SoD engine.
- DASH-08 timeline is derived + device-local — not an org-wide audit store.
- Production website tip remains historical `152ce40…`; integrated UI not Production-verified.
