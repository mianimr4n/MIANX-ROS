# RC6-DASH-01 — Selected exception types

## Included

| Type ID | Title | Severity rule | Source | Trust |
| --- | --- | --- | --- | --- |
| EXC-KDS-DELAY | Delayed kitchen tickets | WARNING; CRITICAL if count ≥ 5 | Kitchen tickets (≥20m) / ops fallback | DERIVED |
| EXC-DEL-UNASSIGNED | Ready orders waiting for rider | WARNING; CRITICAL if count ≥ 5 | Delivery pending+ready / ops fallback | PARTIAL_LIVE |
| EXC-STOCK-LOW | Low stock items | WARNING; CRITICAL if count ≥ 10 | Ops `lowStockCount` | PARTIAL_LIVE |
| EXC-CASH-VAR | Unresolved cash variance | WARNING; CRITICAL if count ≥ 3 | Finance attention | PARTIAL_LIVE |
| EXC-ORD-PENDING | Orders pending too long | From alert severity | Ops `PENDING_TOO_LONG` | DERIVED |

## Deferred (with reason)

| Candidate | Reason |
| --- | --- |
| Negative stock distinct card | No separate trusted KPI; low-stock covers min threshold |
| Late/at-risk GPS deliveries | No ETA tracking (UI already shows unavailable) |
| Failed payment spike | No verified failed-payments feed |
| Opening readiness gaps | Already a dedicated opening panel; avoid duplicate |
| System health /readyz | Super-admin-only; not Owner branch Exception Center |
| Supplier overdue / payroll / complaints | Prefer later DASH-04 / domain slices |
| POD missing / rider COD | NOT_PRESENT domain |
| Acknowledge / assign / snooze | Mutation — out of DASH-01 |
| Analytics exception_center | Different product — do not reuse name |

Selection priority met: trustworthy source, Owner value, existing drill-down, no migration, no provider, no mutation, deterministic tests, branch isolation.
