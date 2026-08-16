# ADR-028: Kitchen Order Ticket (KOT) Snapshot & Per-Item Status Model

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.3.0` (closes Phase 8 — Kitchen Dashboard, ADR-028 of 3)

---

## Context

A Kitchen Order Ticket (KOT) is the unit of work the kitchen sees: it tells
the chef "make 2 × Margherita Pizza (no olives, extra cheese) and 1 ×
Cola (500ml)". Telepizza's KOT data lives in the `kitchen_ticket_items`
table (introduced by DB-R5 migration `20260718160000_db_r5_kitchen_tickets.sql`
lines 107-126), which freezes a snapshot of each order line at the moment
the ticket is created. This snapshotting protects the kitchen from later
mutations to the underlying `order_items` row (e.g., a cashier edits the
order after the kitchen has already started cooking).

Two production migrations shape the KOT data model:

1. `20260718160000_db_r5_kitchen_tickets.sql` — creates
   `kitchen_ticket_items` with `item_name_snapshot`,
   `modifiers_snapshot` (JSONB), `quantity`, `is_completed` boolean,
   UNIQUE on `(kitchen_ticket_id, order_item_id)`.
2. `20260730230000_kitchen_recipe_stock_consume.sql` — adds
   `menu_item_inventory_components` recipe mapping + the
   `kitchen_ticket_set_preparing_atomic` SECURITY DEFINER RPC, which
   atomically transitions the ticket to `preparing` AND deducts mapped
   inventory components in a single transaction.

The frontend renders these snapshots in `KitchenCard.tsx` (181 lines) and
`KitchenDetailsPanel.tsx` (260 lines) — items list with quantity, name,
modifier lines (parsed from `modifiers_snapshot` JSONB), and special
instructions callout. The KDS view (`AdminKitchenDashboard.tsx`) shows
the same data in a 4-column board layout.

However, the KOT data model was never elevated to a formal ADR. The
deferred items — per-item prep ticks, KOT print format, sequence
numbering, fiscal printer integration — are scattered across
`docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md`,
`docs/rc1/10-KNOWN_LIMITATIONS.md`, and explicit "Planned for Phase 2"
labels in the as-built UI (e.g., `AdminKitchenDashboard.tsx` line 549:
"Quality check, per-item prep ticks, station routing, sounds, and shifts
aren't available yet"). This ADR consolidates those deferrals into a
single accepted decision with explicit trigger conditions.

This ADR formally accepts the as-built KOT snapshot model + atomic stock
consume as the canonical Phase 8 contract. Per-item status mutation,
sequence numbering, and print format are explicitly deferred (same
pattern as Phase 7's receipts deferral in ADR-023 §8).

## Decision

### 1. KOT item snapshots — frozen at ticket creation

`kitchen_ticket_items` (DB-R5 lines 107-120) stores one row per
`order_items` line on the ticket:

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `kitchen_ticket_id` | uuid FK → `kitchen_tickets.id` ON DELETE CASCADE | Parent ticket |
| `order_item_id` | uuid FK → `order_items.id` ON DELETE CASCADE | Source order line (for traceability) |
| `item_name_snapshot` | text NOT NULL | Frozen display name (e.g., "Margherita Pizza (Medium)") — NOT a FK to `menu_items` |
| `modifiers_snapshot` | jsonb NOT NULL DEFAULT `'[]'` | Frozen modifier/extra list (e.g., `[{"name":"Extra Cheese","qty":1},{"name":"No Olives","qty":1}]`) |
| `quantity` | integer NOT NULL CHECK > 0 | Frozen quantity |
| `is_completed` | boolean NOT NULL DEFAULT false | Per-item prep tick (DEFERRED for mutation — see §4) |
| `created_at` | timestamptz DEFAULT now() | Snapshot creation time |

UNIQUE constraint on `(kitchen_ticket_id, order_item_id)` guarantees no
duplicate snapshots per ticket.

**Why snapshot, not FK?** If a cashier edits an `order_items` row after
the kitchen has started cooking (e.g., adds an extra topping, changes
quantity), the kitchen must still see the original ticket that was
displayed when cooking started. The snapshot freezes the kitchen's view;
the cashier's edit creates a new `order_items` audit log entry but does
NOT retroactively change what the kitchen is cooking. The kitchen can
manually re-print the ticket (when print is implemented — deferred §5)
to get the latest snapshot via ticket cancellation + re-creation.

### 2. Idempotent Option B creation on order confirm

`createKitchenTicketForConfirmedOrder(supabase, orderId)` in
`backend/api/src/services/kitchen/tickets.ts` (around line 380) is the
sole entry point for ticket creation. It is called from
`services/orders/management.ts` lines 805-818 when an order transitions
to `confirmed`.

The function:

1. Loads the order + its `order_items` (+ product + variant for
   `item_name_snapshot` composition).
2. INSERTs a `kitchen_tickets` row with `status='queued'`,
   `priority=0`, `branch_id=order.branch_id`.
3. INSERTs one `kitchen_ticket_items` row per `order_items` line,
   composing `item_name_snapshot` from `product_name + variant_name`
   and `modifiers_snapshot` from the order item's
   `modifiers_snapshot` / `extras_snapshot` columns.
4. On unique violation (PostgreSQL error code `23505` on
   `kitchen_tickets.order_id`), the function catches the error and
   returns the existing ticket — idempotent.

There is NO database trigger that creates kitchen tickets. The DB-R5
migration comment line 10-11 makes this explicit: *"Ticket creation:
Option B — backend service on order → confirmed (idempotent
upsert/ignore duplicate). No create trigger in this slice."*

This is the same Option B pattern accepted in ADR-024 §3 for dine-in
bill auto-linking. The order→confirmed transition is the single
trigger point; both the bill link and the kitchen ticket are created
in the same service call.

### 3. Atomic stock consume on `preparing` — `kitchen_ticket_set_preparing_atomic`

When a kitchen staff member transitions a ticket to `preparing`, the
backend does NOT directly UPDATE the ticket. Instead it calls the
`kitchen_ticket_set_preparing_atomic(p_ticket_id, p_actor_user_id, p_note)`
SECURITY DEFINER RPC (migration `20260730230000` line 81+), which
performs the following in a single transaction:

1. **`SELECT FOR UPDATE`** on the ticket row — prevents concurrent
   transitions.
2. **Idempotent replay check** — if `status` is already `preparing`,
   return the existing result with `idempotent_replay: true` (no stock
   re-consume).
3. **Transition guard** — if `status NOT IN ('queued', 'accepted')`,
   raise `TICKET_TRANSITION_DENIED` (HTTP 409).
4. **Aggregate recipe needs** — for each `kitchen_ticket_items` row,
   look up `menu_item_inventory_components` rows where
   `menu_item_id = order_item.menu_item_id`, multiply
   `quantity_per_unit × kitchen_ticket_items.quantity`, and group by
   `inventory_item_id`.
5. **Stock sufficiency check** — for each aggregated component, verify
   `inventory_items.current_stock >= required_quantity`. If any fails,
   raise `Insufficient stock for <item>` (HTTP 409) and roll back the
   transaction.
6. **Insert `stock_movements` rows** — one per component, with
   `movement_type='sale'`, `quantity=-required` (negative),
   `reference_type='kitchen_ticket'`, `reference_id=p_ticket_id`.
7. **UPDATE `inventory_items.current_stock`** — decrement by the
   consumed quantity.
8. **UPDATE `kitchen_tickets`** — set `status='preparing'`,
   `started_at=now()`, `accepted_by_user_id=p_actor_user_id` (if not
   already set).
9. **Mirror onto `orders.status='preparing'`** + insert
   `order_status_logs` row with `note=p_note` (or default "Kitchen
   ticket set to preparing").

The RPC is `service_role` only — revoked from `public`, `anon`, and
`authenticated`. The backend service calls it via the service_role
Supabase client.

**Why atomic?** Two failure modes are prevented:

- **Race condition**: two kitchen staff click "Start preparing" on the
  same ticket simultaneously. The `SELECT FOR UPDATE` + idempotent
  replay check ensures only one stock consume happens; the second
  request returns the same result without side effects.
- **Partial stock deduction**: if the RPC deducted stock for items 1-3
  then failed on item 4 (insufficient stock), the kitchen would have
  consumed inventory for a ticket that's still in `queued` state. The
  single-transaction rollback ensures either ALL stock is consumed AND
  the ticket is `preparing`, OR NOTHING is consumed and the ticket stays
  in `queued`/`accepted`.

### 4. Per-item `is_completed` — DEFERRED for mutation API + UI

The `is_completed` boolean column EXISTS on `kitchen_ticket_items` (DB-R5
line 116, default `false`). It is fetched by the frontend
(`SafeKitchenTicketItem.isCompleted` in
`apps/website/client/src/lib/ops-api.ts`).

**However, no endpoint exists to mutate it.** The only PATCH route is
`/api/v1/kitchen/tickets/:id/status` — there is no
`PATCH /api/v1/kitchen/tickets/:id/items/:itemId` endpoint. The
`is_completed` column is effectively read-only display (always `false`
in Production).

The frontend explicitly acknowledges this: `KitchenManagerShell.tsx`
line 549 says *"per-item prep ticks … aren't available yet"*, and
`KitchenCard.tsx` renders items as a static list with no checkbox or
tick affordance.

This ADR accepts the current state as the V1 contract and DEFERS:

| Deferred concern | Trigger condition |
|---|---|
| `PATCH /tickets/:id/items/:itemId` endpoint | When kitchen operators request per-item prep tracking (e.g., for multi-course meals where items finish at different times) |
| UI checkbox / tap-to-tick in `KitchenCard` | Same trigger — frontend follows backend |
| Auto-complete ticket when all items ticked | Same trigger — workflow follows UI |
| `kitchen_ticket_item_events` audit table | If per-item ticks need their own audit (vs. piggybacking on `order_status_logs`) |

The column exists in schema today so that future implementation does
NOT require a migration — only backend code + UI changes.

### 5. KOT print format, sequence numbering, fiscal printer — DEFERRED

The `kitchen_tickets.sequence_number` column (DB-R5 line 34, nullable
integer) exists but is NEVER populated by the backend
(`createKitchenTicketForConfirmedOrder` does not set it). It is always
`NULL` in Production.

The frontend has a fallback: `KitchenCard.tsx` displays the ticket ID
slice (last 8 chars of UUID) when `sequence_number` is null. This is
acceptable for V1 but does not give operators a human-friendly "KOT
#42" reference.

This ADR DEFERS:

| Deferred concern | Trigger condition |
|---|---|
| Per-branch daily sequence numbering (e.g., KOT #1, #2, #3 per branch per business day) | When a print format is specified (requires ADR-030+ if print format has tax/fiscal implications) |
| `GET /api/v1/kitchen/tickets/:id/kot` print-format JSON endpoint | When a print format is specified |
| PDF serializer (html → pdf via puppeteer / playwright) | When a print format is specified + physical printer hardware is in scope |
| Fiscal printer integration (e.g., Epson TM series, Star Micronics) | When Pakistan market adopts fiscal printer regulations (currently no mandate) |
| Electronic journal (long-term KOT archive for tax audit) | Same trigger as fiscal printer |

**Why defer?** The Phase 7 receipts deferral (ADR-023 §8) established
the pattern: do NOT recommend a standalone Receipts/KOT ADR that
implies more design than exists. The current KOT surface is
database-only (item snapshots exist, are rendered, but no print, no
numbering). When printer hardware is in scope, a standalone
`ADR-030+ (KOT Print Format & Fiscal Printer)` should be authored
that specifies the format, numbering scheme, and integration contract.

### 6. `cancelKitchenTicketForOrder` — reverses consumed stock

When an order is cancelled after confirm,
`services/orders/management.ts` calls
`cancelKitchenTicketForOrder(supabase, orderId, actorUserId)` (around
line 815). This function:

1. Loads the kitchen ticket by `order_id`.
2. If ticket status is `preparing` or `ready` (i.e., stock was
   consumed), calls the `inventory_reverse_kitchen_consumption_atomic`
   RPC to reverse the stock deduction (inserts positive
   `stock_movements` rows with `movement_type='adjustment'`,
   `reference_type='kitchen_ticket_reversal'`).
3. Updates ticket status to `cancelled`, mirrors onto
   `orders.status='cancelled'`, writes `order_status_logs` row.

If the ticket is in `queued` or `accepted` (no stock consumed yet),
the reversal RPC is skipped — just the status update.

This is the ONLY supported path for reversing kitchen stock consumption.
There is no "manual stock reversal" endpoint — the kitchen cannot
un-consume stock for a ticket that's still `preparing`. If the kitchen
realizes they consumed stock for the wrong ticket, they must cancel
the order (which cancels the ticket and reverses stock) and create a
new order.

### 7. Non-goals (this ADR)

| Concern | ADR / status |
|---|---|
| Ticket lifecycle (status machine, transitions, idempotency) | ADR-027 |
| Branch isolation (RLS, helper, defense in depth) | ADR-027 §7 |
| Polling vs realtime | ADR-027 §8 (deferred to future ADR) |
| Client-side elapsed timer + display thresholds | ADR-029 |
| Priority field + auto-priority + manual escalation | ADR-029 §3 (deferred) |
| `kitchen_stations` table + station routing | ADR-029 §4 (deferred) |
| Per-item prep ticks (`PATCH /tickets/:id/items/:itemId`) | This ADR §4 (deferred) |
| KOT print format + sequence numbering + fiscal printer | This ADR §5 (deferred) |
| Recipe / BOM management UI (managing `menu_item_inventory_components` rows) | Out of scope — Phase 10 (Inventory and Procurement) |
| Wastage tracking (separate from stock consume) | Out of scope — Phase 10 |

## Consequences

### Positive

- **Snapshots protect the kitchen from order edits.** A cashier who
  edits an order after confirm does not retroactively change what the
  kitchen is cooking. The kitchen sees the original ticket; any
  additions become a new `order_items` audit entry that the kitchen
  can choose to action (or not) via a manual re-print.
- **Atomic stock consume is race-safe.** Two staff clicking "Start
  preparing" simultaneously results in one stock consume, not two.
  Insufficient stock rolls back cleanly — no partial deductions.
- **Cancellation reverses stock automatically.** Operators don't have
  to manually un-consume inventory when an order is cancelled — the
  `cancelKitchenTicketForOrder` service does it in one transaction.
- **`is_completed` column pre-exists for future per-item ticks.**
  When operators request per-item prep tracking, the implementation is
  backend code + UI changes only — no migration required.
- **`sequence_number` column pre-exists for future KOT numbering.**
  Same — no migration needed when print format is specified.

### Negative

- **`is_completed` is effectively dead code today.** The column exists,
  is fetched, but is always `false`. This is honest deferral (not a
  fake feature) but means the schema carries a column that does nothing
  in V1. The tradeoff is that future implementation is migration-free.
- **`sequence_number` is similarly dead.** Same tradeoff — column
  exists, always NULL, will be populated when print format is specified.
- **No KOT print.** Kitchen staff currently rely on screen display
  only — there is no printed ticket to pin to the prep station. For
  high-volume branches this is acceptable (KDS screen is always
  visible) but for low-tech branches a printed KOT would help.
- **Stock reversal is order-cancellation-only.** The kitchen cannot
  manually reverse a stock consume for a ticket that's still
  `preparing`. If they consumed stock for the wrong ticket, they must
  cancel the order and recreate it — which is operationally awkward.
  A future `POST /tickets/:id/reverse-stock` endpoint could address
  this, but it's not on the roadmap.
- **Snapshot drift on long-running orders.** If a ticket sits in
  `queued` for 30 minutes and the cashier edits the order in that
  window, the snapshot still reflects the original. This is by design
  (the kitchen hasn't started cooking yet, so the snapshot should match
  what they'll see when they start), but operators may be confused if
  they expect the kitchen ticket to reflect post-edit order state.

## Alternatives Considered

- **Live FK to `order_items` instead of snapshot.** Rejected: a
  kitchen staff member looking at the KDS screen would see items
  appear/disappear/change quantity in real-time as the cashier edits
  the order. This is operationally dangerous — the chef might start
  cooking item A, then item A disappears from the screen. Snapshots
  freeze the kitchen's view at the moment of ticket creation.
- **Database trigger for ticket creation (Option A).** Rejected: a
  trigger on `orders` AFTER UPDATE OF status would create the ticket
  automatically. But the trigger would need to call back into the
  application layer to compose `item_name_snapshot` from
  `product_name + variant_name` (which requires joins to `menu_items`,
  `menu_item_variants`). SQL triggers can't easily do this without
  duplicating application logic. Option B (backend service on confirm)
  keeps the composition logic in TypeScript where it's testable.
- **Per-item status mutation in V1.** Rejected for V1: adds an
  endpoint, a UI affordance, and an audit table (or extends
  `order_status_logs`). The operator demand is not yet there — most
  Telepizza tickets are 1-3 items, and per-ticket status is
  sufficient. The column is pre-positioned for V2.
- **Standalone KOT Print Format ADR for Phase 8.** Rejected (same
  pattern as Phase 7 receipts): would imply more design than exists.
  The current KOT surface is screen-only. A standalone Print Format
  ADR should be deferred until printer hardware is in scope.
- **`menu_item_inventory_components` as a separate ADR.** Considered:
  the recipe/BOM mapping is arguably an inventory concern (Phase 10)
  rather than a kitchen concern. But because the atomic consume RPC
  is invoked from the kitchen transition path, the recipe mapping is
  operationally part of the kitchen contract. It's documented here
  for completeness; Phase 10 will author a dedicated Recipe/BOM ADR
  if needed.

## As-Built Verification (2026-08-16)

`scripts/phase_8_verify.py` confirms Production Supabase has:

- ✅ `kitchen_ticket_items` table exists with all 7 columns:
  `id`, `kitchen_ticket_id`, `order_item_id`, `item_name_snapshot`,
  `modifiers_snapshot` (jsonb), `quantity` (int CHECK >0),
  `is_completed` (bool default false), `created_at`
- ✅ UNIQUE constraint `uq_kitchen_ticket_items_ticket_order_item`
  on `(kitchen_ticket_id, order_item_id)`
- ✅ Index `idx_kitchen_ticket_items_ticket_id` exists
- ✅ RLS enabled on `kitchen_ticket_items`; 2 policies (SELECT/UPDATE)
  gated on `current_user_can_access_kitchen_tickets` via parent ticket
- ✅ Grants: `authenticated` SELECT/UPDATE only; `service_role` all
  DML; `anon` revoked
- ✅ `menu_item_inventory_components` table exists with
  `menu_item_id`, `inventory_item_id`, `quantity_per_unit`
  (numeric(14,3) CHECK >0), UNIQUE on `(menu_item_id, inventory_item_id)`
- ✅ `kitchen_ticket_set_preparing_atomic(p_ticket_id, p_actor_user_id, p_note)`
  RPC exists as SECURITY DEFINER; revoked from `public`/`anon`/
  `authenticated`; granted to `service_role` only
- ✅ `stock_movements.movement_type` CHECK includes `'sale'`
- ✅ `inventory_reverse_kitchen_consumption_atomic` RPC exists (for
  cancellation reversal)
- ✅ `kitchen_tickets.sequence_number` integer column exists (nullable)
- ✅ `kitchen_tickets.priority` integer column exists (default 0)

**Result: see PHASE8_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md`](../architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md) — restaurant ops foundation
- [`docs/architecture/MENU-MODIFIER-ARCHITECTURE.md`](../architecture/MENU-MODIFIER-ARCHITECTURE.md) — `modifiers_snapshot` JSONB format
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 8 entry
- [`docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md`](./ADR-023-pos-cashier-workflow-order-source-contract.md) — §8 receipts deferral pattern (mirrored here for KOT)
- [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](./ADR-024-dine-in-bill-settlement.md) — §3 Option B auto-link (same pattern as ticket creation)
- [`docs/13-adr/ADR-011-accounting-immutability.md`](./ADR-011-accounting-immutability.md) — `stock_movements` immutability pattern
- [`docs/13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md`](./ADR-027-kitchen-ticket-lifecycle-queue-contract.md) — ticket lifecycle (parent of this ADR)
- [`docs/13-adr/ADR-029-kitchen-timers-priority-display-contract.md`](./ADR-029-kitchen-timers-priority-display-contract.md) — display contract (timers, priority, stations)
- [`supabase/migrations/20260718160000_db_r5_kitchen_tickets.sql`](../../supabase/migrations/20260718160000_db_r5_kitchen_tickets.sql) — DB-R5 schema
- [`supabase/migrations/20260730230000_kitchen_recipe_stock_consume.sql`](../../supabase/migrations/20260730230000_kitchen_recipe_stock_consume.sql) — recipe mapping + atomic consume RPC
- [`backend/api/src/services/kitchen/tickets.ts`](../../backend/api/src/services/kitchen/tickets.ts) — `createKitchenTicketForConfirmedOrder` + `cancelKitchenTicketForOrder`
- [`backend/api/src/services/orders/management.ts`](../../backend/api/src/services/orders/management.ts) — order→confirm wiring (lines 805-818)
- [`apps/website/client/src/components/admin/kitchen/KitchenCard.tsx`](../../apps/website/client/src/components/admin/kitchen/KitchenCard.tsx) — items list rendering
- [`apps/website/client/src/lib/admin-kitchen.ts`](../../apps/website/client/src/lib/admin-kitchen.ts) — `formatModifierLines` snapshot parser
