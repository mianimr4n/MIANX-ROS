# Database V1 Freeze — Security Certification Evidence (thin)

**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Remote head migration:** `20260718171000`  
**Mode:** Evidence only (B-07)

## Objects present (to_regclass)

| Object | Present |
|---|---|
| `restaurant_tables` | yes |
| `dine_in_sessions` | yes |
| `kitchen_tickets` | yes |
| `kitchen_ticket_items` | yes |
| `restaurant_bills` | yes |
| `bill_orders` | yes |
| `profiles` | no (retired R1) |

## RLS

All six restaurant freeze tables: `relrowsecurity = true`.  
Public tables with RLS disabled: **none**.

## Policies (restaurant slice)

| Table | Policies |
|---|---|
| `restaurant_tables` | Staff select branch restaurant tables |
| `dine_in_sessions` | Staff select/update branch dine-in sessions |
| `kitchen_tickets` | Kitchen select/update branch tickets |
| `kitchen_ticket_items` | Kitchen select/update branch ticket items |
| `restaurant_bills` | POS select/update branch restaurant bills |
| `bill_orders` | POS select branch bill orders |

## Grants / hash columns

| Check | Result |
|---|---|
| anon table writes (INSERT/UPDATE/DELETE/TRUNCATE) | **none** |
| `authenticated` SELECT `restaurant_tables.qr_token_hash` | **false** (after `20260718171000`) |
| `anon` SELECT `qr_token_hash` | **false** |
| `authenticated` SELECT/UPDATE `dine_in_sessions.public_token_hash` | **false** |
| `anon` SELECT `public_token_hash` | **false** |

Note: Original R3/R4 `REVOKE SELECT (hash)` after table-level `GRANT SELECT` was ineffective in PostgreSQL. Corrected by `20260718171000` (explicit non-hash column grants).

## API smoke

| Endpoint | Result |
|---|---|
| `GET https://telepizza-api.onrender.com/healthz` | ok; modules include dine-in, kitchen, admin |
| `GET https://telepizza-api.onrender.com/readyz` | ok; issues=[] |

## Regression

| Command | Result |
|---|---|
| `pnpm check` | PASS |
| `pnpm test:db` | PASS (175) |
| `pnpm test:backend` | PASS (178) |
| `pnpm build:website` | PASS |
| `git diff --check` | PASS |
