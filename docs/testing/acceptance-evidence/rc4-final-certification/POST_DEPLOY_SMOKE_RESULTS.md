# RC4 Post-deploy smoke results (final pack)

**Live SHA:** `2f0e4326310e1036cc23a94d5573dd4d774eaf0f`
**Render deploy:** `dep-d9n75v15efls73a4j5hg`

## Cutover authenticated smoke

Source: `../rc4-production-cutover/post-migrate-smoke-auth.json`

| Gate | Result |
| --- | --- |
| auth / me / refresh / logout | PASS |
| Probes | 26 acceptable |
| `drift42703` | empty |
| `missingRelation` | empty |

## Targeted cutover checks

Source: `../rc4-production-cutover/targeted-cutover-verification.json`

| Check | Result |
| --- | --- |
| HR `employee_number` | PASS |
| Invoices `due_date` | PASS |

## Analytics hotfix smoke

Source: `../rc4-production-cutover/analytics-hotfix-prod-smoke.json`

| Check | Result |
| --- | --- |
| Deployed SHA match | PASS |
| Workspace / product / executive / finance | 200 |
| Drill-downs | 200 |
| `order_items.name` 42703 | none |
| UI `/admin/reports` | PASS |
| Logout | PASS |

## Modules covered in Owner smokes

Dashboard, HR, supplier invoices, Finance, Payroll, Loyalty, Marketing, Inventory, Documents, Analytics — PASS paths as recorded in cutover + hotfix JSON.

## Mutations during smoke

None.
