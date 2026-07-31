# RC3 Integration — Security Matrix (narrative)

Machine-readable results: `security-matrix.json`.

## Actors exercised

| Actor | Source |
| --- | --- |
| Unauthenticated | no token |
| Owner | RC1 staff handover |
| Branch Manager | RC1 staff handover (`branch.manager@telepizza.pk`) when sign-in succeeds |
| Supplier A / B | `scripts/seed-rc3-supplier-portal.mjs` fixtures (gitignored passwords) |

## Required assertions (API)

| Assertion | Expected |
| --- | --- |
| Unauthenticated finance/HR/supplier-portal | 401/403 |
| Supplier A cannot list/read Supplier B PO | list exclusion + 404/403 by id |
| Supplier cannot access admin purchasing/finance/HR | 401/403 |
| Owner attention/purchasing readable or honest unavailable | 200/503/404 |

## Not fully automated on this host

Full combinatorial matrix for Finance/HR/Marketing/Payroll compensation across all roles remains partially covered by slice unit tests (`pnpm test`) and prior slice security evidence. Gaps are listed in `FINAL_REPORT.md` if present.

## Principles preserved

- Default-deny permissions
- Server-derived supplier scope (no client-trusted supplier ID)
- Branch-scoped staff helpers
- Inactive principals must lose access (seed/lifecycle tests + limitations if not live-exercised)
