# RC6-QA-03 — Owner journey checklist

Maps the integrated Owner path to Playwright `e2e/rc5/owner-command-center-integration.spec.ts` (local / CI-ephemeral only; never Production).

| # | Step | Playwright coverage | Expected |
| --- | --- | --- | --- |
| 1 | Refuse non-loopback base URL | `assertLocalWeb()` (tests A/B/C) | Host `localhost` / `127.0.0.1` only |
| 2 | Open staff login | Test A → `/admin/login` | Login form visible |
| 3 | Authenticate Owner | `browserLogin` + seeded enterprise account | Session established (no secrets in evidence) |
| 4 | Land Owner Command Center | `openDashboard` → `/admin/dashboard` | `data-testid=owner-command-center` visible |
| 5 | Core panels present | `assertCorePanels` | What Changed, Exception Center, Approval Inbox, Branch Health, Profitability, EOD Pack, Operational timeline |
| 6 | Since wording honesty | `what-changed-since` text | Device review **or** business window; **never** “since your last login” |
| 7 | Profitability + EOD honesty labels | Text + Accounting/Operational copy | `eod-pack-nonfinal` visible; ops ≠ posted labels present |
| 8 | Reset What Changed baseline | `what-changed-reset-baseline` | Device-local baseline update; still honest since wording |
| 9 | Timeline domain filter | `timeline-domain-filter` → kitchen | Filter applies without crash |
| 10 | Timeline severity filter | `timeline-severity-filter` → all | Filter applies without crash |
| 11 | Switch PRE_OPEN | Mode radio / `data-selected-command-mode` | Panels remain; emphasis only |
| 12 | Switch LIVE_OPERATIONS | Same | Panels remain; no refetch required for mode (shared ops data) |
| 13 | Switch CLOSING | Same | Panels remain; EOD emphasis allowed |
| 14 | EOD export controls | `eod-pack-download-csv` / `json` / `print` | Controls visible; print/CSV/JSON only (no FINAL/CLOSED UI) |
| 15 | KPI drill-down + Back | First `kpi-drilldown-*` if present | Leaves login; Back restores OCC |
| 16 | Reload protected dashboard | `page.reload` | OCC still visible; not bounced to login |
| 17 | Sign out | Sign out control | Login / staff-access gate |
| 18 | Post-logout gate | Revisit `/admin/dashboard` | OCC count = 0 |

## Companion Playwright tests

| Test | Focus |
| --- | --- |
| B | Authenticated axe (`wcag2a`/`wcag2aa`) for each `?commandMode=` — 0 critical / 0 serious target |
| C | Mobile 390×844 smoke — panels present; no forced horizontal overflow |

## Commands

```bash
pnpm test:e2e:owner
# or: playwright test --config=playwright.rc5-qa-01.config.ts e2e/rc5/owner-command-center-integration.spec.ts
```

Requires local website + seeded `scripts/.tmp_pw/staff-handover.local.json`. Never point `D3_E2E_BASE_URL` at Production.
