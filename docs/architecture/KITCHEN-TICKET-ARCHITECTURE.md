# Kitchen Ticket Architecture

**Status:** Design only — **not migrated**  
**Date:** 2026-07-18  
**Freeze class:** **REQUIRED BEFORE DATABASE FREEZE** (schema foundations; UI deferred)  
**Related:** Sprint 4.4 lifecycle · dine-in sessions · order status logs

---

## 1. Purpose

Provide branch-isolated kitchen routing and ticket state for prep visibility across delivery, pickup, and dine-in — without implementing Kitchen UI in this phase.

## 2. Decision: ticket grain

**Locked recommendation: one kitchen ticket per (order × station).**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| One ticket per order | Simple | Mixed stations fight over one status | Reject for multi-station branches |
| **One ticket per order × station** | Parallel prep; clear routing | Slightly more rows | **Adopt** |
| One ticket per line item | Maximum detail | Noise; hard roll-up | Defer |

Order-level status remains on `orders.status` (existing lifecycle). Ticket statuses feed prep readiness; they do **not** replace order status machine.

## 3. Tables

### `kitchen_stations`

```text
kitchen_stations
  id uuid PK
  branch_id uuid NOT NULL → branches
  code varchar(40) NOT NULL          -- e.g. pizza, fryer, drinks, expo
  name varchar(120) NOT NULL
  sort_order integer NOT NULL default 0
  is_active boolean NOT NULL default true
  created_at / updated_at
  UNIQUE (branch_id, code)
```

### `kitchen_tickets`

```text
kitchen_tickets
  id uuid PK
  branch_id uuid NOT NULL → branches
  order_id uuid NOT NULL → orders
  kitchen_station_id uuid NOT NULL → kitchen_stations
  ticket_number varchar(40)            -- optional display
  status text NOT NULL                 -- queued | in_progress | ready | bumped | cancelled
  priority integer NOT NULL default 0
  fire_at timestamptz                  -- when kitchen should start
  started_at / ready_at / bumped_at
  created_at / updated_at
  UNIQUE (order_id, kitchen_station_id)
```

### `kitchen_ticket_items`

```text
kitchen_ticket_items
  id uuid PK
  kitchen_ticket_id uuid NOT NULL → kitchen_tickets
  order_item_id uuid NOT NULL → order_items
  quantity integer NOT NULL
  status text NOT NULL                 -- queued | in_progress | ready | cancelled
  station_notes text
  name_snapshot varchar(150) NOT NULL
  modifiers_snapshot jsonb NOT NULL default '[]'
  created_at / updated_at
  UNIQUE (kitchen_ticket_id, order_item_id)
```

## 4. Routing rules

1. On order confirm (or POS fire), create tickets for stations that own at least one line.
2. Route by `menu_items` → station map (recommended additive table `menu_item_kitchen_stations` or default station per `product_type`).
3. Modifier-linked drinks/sides may route to drinks/sides stations via `linked_menu_item_id` / product_type.
4. Dine-in and delivery share the same ticket model; expo station optional for assembly.

**Minimum pre-freeze:** stations + tickets + ticket_items tables + default routing by `product_type` in API (config table can follow in feature phase if owner accepts).

**Owner gate:** whether `menu_item_kitchen_stations` is required before freeze or SAFE FOR FEATURE PHASE. Recommendation: **SAFE FOR FEATURE PHASE** if default product_type routing ships with tickets schema.

## 5. Status derivation

| Layer | Source of truth |
|---|---|
| Line prep | `kitchen_ticket_items.status` |
| Station ticket | Derived or explicitly set; bump when all items ready |
| Order | Existing `orders.status` via staff/system transitions + `order_status_logs` |

Do not auto-complete dine-in orders solely from kitchen bump (billing/POS may still be open).

## 6. Audit & isolation

- Ticket status changes should append to `order_status_logs` **or** a dedicated `kitchen_ticket_events` table.
- **Pre-freeze minimum:** reuse `order_status_logs` with actor notes for ticket bumps; dedicated events = SAFE FOR FEATURE PHASE.
- All reads/writes branch-scoped via `branch_id` + `current_user_has_branch_access`.

## 7. RLS sketch

| Table | Intent |
|---|---|
| All kitchen_* | No anon; authenticated SELECT for staff with branch access; writes via service_role API |
| Never trust client `branch_id` header alone | API resolves principal → branch set |

## 8. Non-goals

- Kitchen Dashboard UI
- Printer/KDS hardware protocols
- Auto-dispatch to riders from kitchen ready
