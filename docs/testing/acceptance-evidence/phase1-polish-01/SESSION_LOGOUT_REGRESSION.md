# POLISH-01 — Session / logout regression

| Check | Status |
| --- | --- |
| Sign out button `aria-label="Sign out"` | Preserved |
| Post-logout navigation `/admin/login` | Preserved |
| QA-04 signed-out dashboard bounce skip | Unchanged (`AdminDashboard`) |
| Contract test `rc6-owner-smoke-contract` | PASS |
| Shell auth gate “Staff access required” | Preserved |

No weakening of auth tests. Full headed refresh/Back matrix remains POLISH-QA / Owner e2e.
