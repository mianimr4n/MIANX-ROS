# RC4 Schema certification notes

**Schema tip:** `20260801180000`
**App SHA:** `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291`
**Security closeout:** `SECURITY_CLOSEOUT_COMPLETE`

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

## Status

Schema alignment and post-cutover hotfixes are evidenced. Security closeout is complete — see `SECURITY_CLOSEOUT.md` and `FINAL_REPORT.md`.
