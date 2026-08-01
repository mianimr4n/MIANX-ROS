# Post-deploy smoke results

**Recorded:** 2026-08-02 Asia/Karachi
**Live SHA:** `2f0e4326310e1036cc23a94d5573dd4d774eaf0f`
**Render deploy:** `dep-d9n75v15efls73a4j5hg`

## Authenticated cutover smoke

**Source:** `post-migrate-smoke-auth.json`
**Verdict:** **AUTHENTICATED SMOKE PASS**

| Gate | Result |
| --- | --- |
| `authOk` / `meOk` / `refreshOk` / `logoutClears` | true |
| Authenticated probes | 26/26 acceptable |
| `drift42703` | **[]** |
| `missingRelation` | **[]** |
| Local fixture password | not used |

## Targeted cutover verification

**Source:** `targeted-cutover-verification.json`

| Check | Result |
| --- | --- |
| HR employees / `employee_number` | **PASS** (no 42703) |
| Supplier invoices / `due_date` | **PASS** (no 42703) |

## Analytics hotfix smoke

**Source:** `analytics-hotfix-prod-smoke.json`
**Authorization:** `DEPLOY_ANALYTICS_SCHEMA_HOTFIX`

| Check | Result |
| --- | --- |
| Deployed SHA = authorized | PASS |
| Workspace / product / executive / finance | 200 |
| Drill-downs | 200 |
| `order_items.name` 42703 | none |
| `/admin/reports` UI | PASS |
| Logout | PASS |

## Module coverage (Owner)

Dashboard, HR, supplier invoices, Finance, Payroll, Loyalty, Marketing, Inventory, Documents, Analytics — PASS as recorded.

## Log review

| Source | Finding |
| --- | --- |
| Authenticated API probes | No 42703 / 42P01 / Analytics 5xx in accepted sets |
| Render log export | Not wired in-session; probe bodies used as evidence |

## Mutations

- Cutover migrations: authorized window only (prior)
- Analytics hotfix: **no** migration / **no** SQL
