# Local Seed Data Guide

## What ships in migrations

Foundation migration seeds:

- Roles: `super-admin`, `branch-manager`, `kitchen`, `cashier`, `rider`, `customer-support`, …
- Permissions + role_permissions
- Branches: **Royal Orchard** (`royal-orchard`, operating), Northern Bypass (coming-soon)
- Menu catalog sync migrations

## Enterprise seed script

```bash
pnpm local:seed
# → node scripts/seed-local-enterprise.mjs
```

### Safety

- Exits `2` if `SUPABASE_URL` is `*.supabase.co` or non-loopback
- Passwords only in `scripts/.tmp_pw/staff-handover.local.json` (gitignored)
- Summary (no passwords): `docs/testing/acceptance-evidence/local-seed-summary.json`

### Accounts provisioned

| Email | Role | Path |
| --- | --- | --- |
| `admin@telepizza.pk` | `super-admin` | SQL escalate + Auth user (invite cannot mint owner) |
| `branch.manager@telepizza.pk` | `branch-manager` | invite finalize |
| `kitchen.manager@telepizza.pk` | `kitchen` | invite finalize |
| `cashier@telepizza.pk` | `cashier` | invite finalize |
| `rider@telepizza.pk` | `rider` | invite finalize |
| `support@telepizza.pk` | `customer-support` | invite finalize |

All branch-scoped staff → Royal Orchard.

### Sample orders (interconnected)

| Order number | Order status | Kitchen ticket |
| --- | --- | --- |
| `LOCAL-PENDING-001` | pending | — (OMS confirm creates ticket) |
| `LOCAL-CONFIRMED-001` | confirmed | queued |
| `LOCAL-PREPARING-001` | preparing | preparing |
| `LOCAL-READY-001` | ready | ready (+ delivery assigned) |
| `LOCAL-COMPLETED-001` | completed | completed |

### Coverage honesty

| Dashboard area | Seed coverage |
| --- | --- |
| Owner / Admin login | Yes |
| Branch Manager | Yes (role) |
| Kitchen KDS | Yes (queued+pipeline tickets) |
| Cashier / POS | Role yes; deep POS bill fixtures partial |
| Delivery | Partial (assigned delivery on ready order) |
| Inventory / Purchasing / Finance / HR / Loyalty | Foundation UI may use mocks or empty — **no full ledger seed yet** |
| CRM / Reports | Partial / empty depending on module |

Re-run `pnpm local:seed` after `db reset` (idempotent for emails/order numbers).
