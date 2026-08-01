# RC4 Schema certification notes

**Schema tip:** `20260801180000`
**App SHA:** `2f0e4326310e1036cc23a94d5573dd4d774eaf0f`

## Canonical contracts validated in Production smoke

| Area | Contract | Result |
| --- | --- | --- |
| HR employees | `employee_number` present / readable | PASS (no 42703) |
| Supplier invoices | `due_date` present / readable | PASS (no 42703) |
| Analytics product top items | `order_items.product_name` + `menu_item_id` | PASS (no `order_items.name`) |
| Relations | no `42P01` in accepted smokes | PASS |

## Analytics naming source (repository truth)

- Foundation schema: `order_items.product_name` (NOT NULL snapshot)
- Invalid historical Analytics select: `order_items.name` (never existed)
- Fix: PR #163 — select `product_name`, aggregate by `menu_item_id`

## Certification caveat

This schema alignment evidence supports operational cutover completeness. Full **RC4 certify** remains blocked by `SECURITY_ROTATION_PENDING`.
