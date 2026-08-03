# POLISH-QA — Multi-role results

## Seeded roles exercised (headed)

| Role | Email | Landing / permitted | Forbidden probe | Logout |
| --- | --- | --- | --- | --- |
| super-admin | admin@telepizza.pk | `/admin/dashboard` | n/a | Sign out → login |
| branch-manager | branch.manager@telepizza.pk | `/admin/orders` | `/admin/finance` | Sign out |
| kitchen | kitchen.manager@telepizza.pk | `/admin/kitchen-dashboard` | `/admin/finance` | **Logout** (KDS shell label) |
| cashier | cashier@telepizza.pk | `/admin/home/cashier` | `/admin/hr` | Sign out / Logout |
| rider | rider@telepizza.pk | `/admin/delivery` | `/admin/hr` | Sign out |
| customer-support | support@telepizza.pk | `/admin/crm` | `/admin/finance` | Sign out |

Suite: `e2e/polish-qa/multi-role.spec.ts` via `playwright.polish-qa.config.ts`.

## Required properties

| Check | Result |
| --- | --- |
| Permission broadening | Not observed |
| Unauthorized Owner Command Center for restricted roles | Asserted absent |
| Logout clears session for role | Asserted |
| Cross-branch mutation | Not performed |

## Not seeded this run

host, waiter, HR-authorized-only, finance-authorized-only, supplier — **ACCEPTED coverage residual**; require D3/D4 fixtures. Static role/nav contracts from prior slices remain.

## Authorization alignment

`rc1:gate` auth/branch matrix + KDS auth **PASS** against local API.
