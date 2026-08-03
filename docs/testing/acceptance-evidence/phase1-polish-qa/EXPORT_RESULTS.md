# POLISH-QA — Export results

| Export | Generator | Formula guard | Scope | Result |
| --- | --- | --- | --- | --- |
| Owner EOD CSV | Frontend | Yes (`=+-@` prefix harden) | Owner session / branch context | PASS |
| Owner EOD JSON | Frontend allowlist | N/A | Aggregate | PASS |
| Object URL revoke after download | Frontend | N/A | EOD | PASS |
| Backend `/reports/sales/export` | Backend | **No** formula harden | Role-gated reports | ACCEPTED_P2 residual |
| Backend `/reports/orders/export` | Backend | **No**; includes `contact_name`/`contact_phone` | Role-gated | ACCEPTED_P2 residual |

No Production export downloads performed or committed.
