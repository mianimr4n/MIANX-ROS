# DATABASE CORE RESTAURANT PRE-FREEZE ARCHITECTURE

**Repository:** Telepizza (`D:\projects\telepizza`)
**Branch:** `architecture/core-restaurant-pre-freeze`
**Base:** latest `main` (includes merged PR #63 modifiers)
**Extends:** PR #62 pre-freeze completeness audit
**Date:** 2026-07-18
**Mode:** Docs / architecture only — **no production mutation, no UI implementation, no merge of apply migrations**

---

## Executive summary

Owner scope change: database freeze cannot proceed on delivery/pickup completeness alone. **Core restaurant foundations** (modifiers, tables, QR, dine-in sessions, kitchen tickets, POS/bill headers) are **mandatory before freeze**. UI remains feature-phase.

| Area | Verdict |
|---|---|
| Migration history (pre this docs PR) | Aligned on prior audit; re-verify linked dry-run in validation |
| P0 grants / DEFINER EXECUTE | Still **BLOCKS** (design in PR #62) |
| P1 unmanaged `profiles` | Still **BLOCKS** |
| Menu modifiers (PR #63) | Schema **in repo**; **not applied on linked remote** (migration list: local `20260718120000`, remote empty); branch availability gap |
| Restaurant tables / QR / sessions | **Absent — REQUIRED** |
| Kitchen tickets | **Absent — REQUIRED** |
| POS bill foundations | **Partial design — REQUIRED** (`pos_sessions`, bills, bill_orders) |
| Payment splits / POS UI / Kitchen UI | **Not freeze blockers** |
| Freeze | **BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED** |

---

## Phase 1 — Roadmap decision

**DATABASE FREEZE MUST REMAIN BLOCKED.**

Mandatory pre-freeze domains:

1. Menu modifiers
2. Restaurant tables
3. Secure table QR codes
4. Dine-in sessions
5. Kitchen tickets
6. Basic restaurant billing / POS foundation (`pos_sessions`, `restaurant_bills`, `restaurant_bill_orders`)

UI (Admin / POS / Kitchen / Rider) is **not** a freeze blocker.

---

## Phase 2 — Existing model audit

### Present and compatible

| Area | Finding |
|---|---|
| `orders.order_type` | Already `delivery` \| `pickup` \| `dine-in` |
| `orders.order_source` | Includes `website`, `whatsapp`, `mobile`, `pos`, `admin` |
| Snapshots / quote | Sprint 4.1 quote tokens + line snapshots; modifiers extend via PR #63 |
| `order_status_logs` | Append-only audit exists |
| `payments` | Order-scoped; service_role locked (Slice 2D) |
| Staff / RBAC | `roles`, `permissions`, `user_roles`, branch scope helpers |
| Website cart/checkout | Delivery/pickup primary; dine-in enum exists |
| API quote/create/track/admin | Server pricing; guest track; branch staff reads |

### Backward compatibility for delivery / pickup

| Risk | Mitigation |
|---|---|
| New nullable order FKs | Default NULL; CHECK/API reject session IDs on delivery/pickup |
| Modifier pricing | Client money ignored; empty modifiers = prior behavior |
| `extras_snapshot` | Retained alongside `order_item_modifiers` |
| Kitchen/POS tables empty | No mandatory ticket/bill on delivery create until wired |
| QR public endpoints | Separate path; cannot mutate delivery orders |

### Confirmed absences

`restaurant_tables`, QR session stores, `dine_in_sessions`, `kitchen_stations` / `kitchen_tickets` / `kitchen_ticket_items`, `pos_sessions`, `restaurant_bills`, `restaurant_bill_orders` — **none in production schema**.

### Modifier naming (PR #63)

Canonical: `modifier_groups`, `modifier_options`, **`item_modifier_groups`** (not `menu_item_modifier_groups`), `order_item_modifiers`. Architecture docs align; do not invent a rename before freeze.

---

## Phases 3–9 — Design pointers

| Phase | Document |
|---|---|
| 3 Modifiers | `docs/architecture/MENU-MODIFIER-ARCHITECTURE.md` |
| 4 Tables | `docs/architecture/DINE-IN-TABLE-QR-ARCHITECTURE.md` |
| 5 QR | same |
| 6 Sessions | same |
| 7 Order extensions | same + remediation plan |
| 8 Kitchen | `docs/architecture/KITCHEN-TICKET-ARCHITECTURE.md` |
| 9 POS/bill | `docs/architecture/POS-BILLING-FOUNDATION.md` |

### Kitchen grain decision

**One ticket per (order × station)** — not one ticket per order, not per line item as primary grain.

### POS classification

| Required before freeze | Safe for feature phase |
|---|---|
| `pos_sessions` | `payment_splits` |
| `restaurant_bills` | Offline sync, till counts, printer configs |
| `restaurant_bill_orders` | Full cashier UI |

---

## Phase 10 — RBAC / RLS

### Actors

| Actor | Principal | Branch |
|---|---|---|
| Customer (auth) | JWT → `users` | Own orders only |
| Guest QR | Token-bound session via API | Table’s branch only |
| Cashier / kitchen / manager | JWT + `user_roles` | Assigned branches |
| API | `service_role` | Enforces principal checks in app |

**Never trust client role headers.** Use `AuthPrincipal` + DB helpers (`current_user_has_branch_access`, etc.).

### Permission codes to seed (R7)

| Code | Intent |
|---|---|
| `table.read` / `table.manage` | View/manage restaurant tables + rotate QR |
| `dine_in.read` / `dine_in.manage` | Sessions open/close |
| `kitchen.read` / `kitchen.manage` | Ticket view/bump |
| `pos.session` | Open/close POS sessions |
| `pos.bill` | Create/settle bills |
| Existing `order.*` / `payment.*` | Unchanged meanings |

Role sketch: cashier → pos + order + payment; kitchen → kitchen + order.read; manager → table + dine_in + kitchen + pos; super-admin → all.

### RLS principles for new tables

- Enable RLS on all new tables.
- No anon DML; no TRUNCATE for client roles (P0).
- Staff SELECT via branch access; writes through API/service_role.
- Never SELECT `qr_token_hash` to anon.
- Guest flows only through hashed-token API resolve.

---

## Phase 11 — Document index

Updated:

- `docs/database/DATABASE-FREEZE-CHECKLIST.md`
- `docs/database/DATABASE-SCHEMA-INVENTORY.md`
- `docs/database/DATABASE-RELATIONSHIP-MATRIX.md`
- `docs/database/DATABASE-RLS-AND-GRANTS-MATRIX.md`
- `docs/architecture/TELEPIZZA-MASTER-ROADMAP.md`

Created:

- `docs/architecture/MENU-MODIFIER-ARCHITECTURE.md`
- `docs/architecture/DINE-IN-TABLE-QR-ARCHITECTURE.md`
- `docs/architecture/KITCHEN-TICKET-ARCHITECTURE.md`
- `docs/architecture/POS-BILLING-FOUNDATION.md`
- `docs/architecture/DATABASE-PRE-FREEZE-REMEDIATION-PLAN.md`
- This report

PR #62 remediation SQL designs retained under `docs/database/remediation/`.

---

## Phase 12 — Slice sequence

```text
DB-R0 P0 grants
DB-R1 P1 profiles
DB-R2 Modifiers apply + branch availability
DB-R3 restaurant_tables + QR hash
DB-R4 dine_in_sessions + order nullable FKs
DB-R5 kitchen_*
DB-R6 pos_sessions + bills + bill_orders
DB-R7 RBAC/RLS for new domain
```

Details: `docs/architecture/DATABASE-PRE-FREEZE-REMEDIATION-PLAN.md`.

---

## Current schema gaps (summary)

| Gap | Severity |
|---|---|
| P0 privilege drift | P0 |
| Unmanaged `profiles` | P1 |
| Modifiers not necessarily on remote yet | P0/P1 verify |
| No `branch_modifier_options` | Pre-freeze gap (or owner defer) |
| No `restaurant_tables` / QR | Required |
| No `dine_in_sessions` / order FK extensions | Required |
| No kitchen ticket schema | Required |
| No POS session / bill schema | Required |

## Recommended tables (new)

`restaurant_tables`, `dine_in_sessions`, `kitchen_stations`, `kitchen_tickets`, `kitchen_ticket_items`, `pos_sessions`, `restaurant_bills`, `restaurant_bill_orders`, optional `branch_modifier_options`.

Plus order columns: `dine_in_session_id`, `restaurant_table_id`, `table_display_snapshot`.

## Owner decisions needed

1. Approve P0/P1 apply from PR #62 designs.
2. Confirm modifier price deltas (already flagged in PR #63).
3. Require `branch_modifier_options` before freeze, or defer with waiver.
4. Require dine-in session binding for all new dine-in orders (Y/N).
5. Accept default product_type kitchen routing without per-item map before freeze.
6. Bill number format; QR public URL base.
7. Role → new permission mapping sign-off.

## Backward compatibility risks

- Over-strict CHECK on dine-in requiring session too early → breaks existing website dine-in.
- Dropping `extras_snapshot` → breaks Admin display (do not drop).
- Renaming `item_modifier_groups` → breaks PR #63 code (forbidden).
- Exposing raw QR tokens in logs/DB → security incident class.

---

## Freeze verdict

**BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**

DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
