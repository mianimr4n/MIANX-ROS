# Log monitoring notes

**Live SHA:** `2f0e432`
**Scope:** Production health + authenticated smoke signatures (no secrets)

| Signal | Observation |
| --- | --- |
| `/healthz` | 200 / ok |
| `/readyz` | 200, empty `issues` |
| Cutover authenticated probes | no new 42703 / 42P01 |
| Analytics hotfix probes | no `order_items.name`, no 42703/42P01, no Analytics 5xx |
| `due_date` / `employee_number` regressions | none observed |
| Secret leakage in evidence | avoided (redaction; `.local-backups/` gitignored) |

Render/platform bulk log export was not available without platform credentials in-session.
