# ADR-033: Inventory Stock Master, Movement Ledger & Atomic Adjustment Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.5.0` (closes Phase 10 — Inventory and Procurement, ADR-033 of 3)

---

## Context

Telepizza's inventory backend is the warehouse-of-truth for every ingredient,
consumable, and packaging SKU that flows through a branch. The data model
was shipped in RC3 via two migrations:

1. `20260730160000_inventory_backend.sql` — creates `inventory_items`
   (branch-scoped stock master) and `stock_movements` (immutable ledger).
2. `20260730220000_atomic_inventory_and_grn_stock.sql` — adds the
   `adjust_inventory_stock_atomic` SECURITY DEFINER RPC, extends the
   movement-type CHECK constraint to include `purchase` and `sale`, and
   introduces the GRN-side `create_goods_receiving_with_stock_atomic`
   RPC (covered in ADR-035).

The backend service layer (`backend/api/src/services/inventory/management.ts`,
449 lines) and admin router (`backend/api/src/modules/admin/inventory.ts`,
195 lines) expose 5 routes (items CRUD, adjustments, movements listing) gated
by the `inventory.manage` permission (seeded to `super-admin` +
`branch-manager` per migration line 14-19). The frontend
(`apps/website/client/src/pages/admin/AdminInventory.tsx`, 310 lines,
plus 7 supporting components totalling ~1500 lines) renders an owner-facing
stock dashboard.

However, the inventory data model was never elevated to a formal ADR. The
deferral of low-stock alerts, dedicated transfer endpoint, batch/lot
tracking, expiry dating, multi-warehouse, and cost-history tracking is
documented piecemeal in `docs/rc1/10-KNOWN_LIMITATIONS.md` and the
`InventoryFoundationPanel.tsx` honest-gap block (lines 28-46). This ADR
consolidates those deferrals into a single accepted decision with explicit
trigger conditions.

This ADR formally accepts the as-built stock master + immutable ledger +
atomic adjustment model as the canonical Phase 10 contract. Low-stock
alerts, dedicated transfers, batch tracking, and costing history are
explicitly deferred (same pattern as Phase 7's online-payment deferral in
ADR-023 §8 and Phase 8's per-item prep tick deferral in ADR-028 §4).

---

## Decision

### 1. Branch-scoped stock master (`inventory_items`)

`inventory_items` (migration lines 24-49) stores one row per (branch, SKU)
combination. The `(branch_id, sku)` UNIQUE constraint guarantees no
duplicate SKUs within a branch; SKUs are normalized to UPPERCASE on insert
(`management.ts` line 233) for case-insensitive matching.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope (every item belongs to exactly one branch) |
| `sku` | varchar(80) NOT NULL | Stock-keeping unit (UCCASE-normalized on insert) |
| `name` | varchar(200) NOT NULL | Display name |
| `category` | varchar(120) | Free-text category (e.g., "Dough", "Cheese", "Packaging") |
| `unit` | varchar(40) NOT NULL DEFAULT `'unit'` | Unit of measure (e.g., "kg", "L", "piece") — no FK to a units table |
| `current_stock` | numeric(14,3) NOT NULL DEFAULT 0 CHECK ≥ 0 | On-hand quantity (cannot go negative — enforced by atomic RPC) |
| `minimum_stock` | numeric(14,3) NOT NULL DEFAULT 0 CHECK ≥ 0 | Minimum display threshold (advisory only — NO automated alert) |
| `reorder_level` | numeric(14,3) NOT NULL DEFAULT 0 CHECK ≥ 0 | Reorder display threshold (advisory only — NO automated alert) |
| `cost_price` | numeric(14,2) NULLABLE | Last-known cost per unit (manual entry; not auto-updated by GRN) |
| `status` | text NOT NULL DEFAULT `'active'` CHECK ∈ {`active`, `inactive`, `discontinued`} | Lifecycle status |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz DEFAULT now() | Last update (auto-maintained by `set_updated_at()` trigger) |

UNIQUE constraint on `(branch_id, sku)`. Three indexes: `idx_inventory_items_branch_id`,
`idx_inventory_items_status`, `idx_inventory_items_name`.

**Why branch-scoped, not tenant-global?** Telepizza operates on a centralized
single-database + RLS model (ADR-026 §3). Each branch manages its own stock
levels independently because suppliers, delivery cadences, and waste rates
differ per branch. A tenant-global catalog would force branch A's stock-out
to block branch B's sale. The branch-scoped model lets each branch run its
own reorder cycle while still allowing HQ (super-admin) to view all branches
via the `super-admin` RLS bypass.

**Why no FK to a `units` table?** Units are free-text strings to keep the
schema additive and avoid a breaking migration to backfill a units master
table. The `inventory/units.ts` service (97 lines) provides
`resolveUnit()` and `effectiveIngredientQuantity()` helpers for unit
conversion in recipe contexts (cross-reference ADR-034 §3). A formal
units master is DEFERRED (§8).

### 2. Immutable movement ledger (`stock_movements`)

`stock_movements` (migration lines 60-86) is an append-only ledger. Every
change to `current_stock` MUST be accompanied by a row here. There is NO
trigger that enforces append-only at the DB level (no `BEFORE UPDATE` /
`BEFORE DELETE` blocker); immutability is enforced at the API layer
(`management.ts` line 446 — `listMovements` is the only movement API;
there is no `updateMovement` or `deleteMovement` route).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `inventory_item_id` | uuid FK → `inventory_items(id)` ON DELETE RESTRICT | Item being moved (RESTRICT prevents silent cascade) |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope (denormalized from `inventory_items.branch_id` for query efficiency) |
| `movement_type` | text NOT NULL CHECK ∈ 8 values | Movement classification (see §3) |
| `quantity` | numeric(14,3) NOT NULL CHECK ≠ 0 | Quantity delta (positive for inbound, negative for outbound) |
| `reference_type` | varchar(80) | Free-text reference (e.g., `'goods_receiving'`, `'kitchen_ticket'`, `'adjustment'`) |
| `reference_id` | uuid | Optional FK to the referencing record |
| `reason` | text | Free-text reason (e.g., "Opening stock on item create") |
| `created_by` | uuid FK → `users(id)` ON DELETE SET NULL | Actor who recorded the movement |
| `created_at` | timestamptz DEFAULT now() | Movement timestamp |

Four indexes: `idx_stock_movements_item_id`, `idx_stock_movements_branch_id`,
`idx_stock_movements_created_at` (DESC for latest-first queries),
`idx_stock_movements_type`.

**Why append-only?** Stock movements are the financial-grade audit trail
for inventory. If a movement could be retroactively edited or deleted, the
ledger would no longer reconcile with `current_stock` and the COGS
calculation (ADR-034 §5) would be untrustworthy. The append-only pattern
mirrors ADR-011 (Accounting Immutability) and ADR-007 (Delivery State
Transitions) — both of which use DB-level triggers to enforce immutability.
For stock movements, we accept the API-layer enforcement as sufficient
because the only write paths are: (a) the `adjust_inventory_stock_atomic`
RPC, (b) the `create_goods_receiving_with_stock_atomic` RPC (ADR-035 §6),
and (c) the `kitchen_ticket_set_preparing_atomic` RPC (ADR-028 §3). All
three are SECURITY DEFINER functions owned by the service role; no
application-level code can insert into `stock_movements` directly because
the table is `grant insert on public.stock_movements to service_role` only
(migration line 99-100). A DB-level immutability trigger is DEFERRED (§8).

### 3. Eight movement types (CHECK constraint)

The migration's CHECK constraint (lines 67-74) enumerates eight movement
types. The first six are the original RC3 set; `purchase` and `sale` were
added by the `20260730220000` migration:

| Type | Sign | Trigger | Reference |
|---|---|---|---|
| `receipt` | positive | Manual adjustment with `movementType='receipt'` OR GRN posting | `goods_receiving.id` via GRN RPC |
| `adjustment` | either | Manual adjustment (positive or negative delta) | null |
| `transfer_in` | positive | Reserved for branch transfers (NOT exposed via API in v2.5.0 — DEFERRED §8) | null |
| `transfer_out` | negative | Reserved for branch transfers (NOT exposed via API in v2.5.0 — DEFERRED §8) | null |
| `waste` | negative | Manual waste recording | null |
| `sale_consumption` | negative | Kitchen atomic consume via `kitchen_ticket_set_preparing_atomic` (ADR-028 §3) | `kitchen_ticket_id` |
| `purchase` | positive | GRN posting via `create_goods_receiving_with_stock_atomic` (ADR-035 §6) | `goods_receiving.id` |
| `sale` | negative | Reserved for POS-driven stock deduction (NOT wired in v2.5.0 — POS uses `sale_consumption` via kitchen) | null |

**Why distinguish `sale_consumption` vs `sale`?** The `sale_consumption`
type is fired by the kitchen's atomic stock consume RPC when a ticket
transitions to `preparing` (ADR-028 §3). This is the *ingredient-level*
deduction (e.g., 1× Margherita Pizza consumes 200g dough + 100g cheese).
The `sale` type is reserved for a future POS-driven *finished-good-level*
deduction (e.g., 1× Margherita Pizza sold → decrement a finished-goods
inventory item). Telepizza's kitchen model treats every sale as a
consumption event (ingredients consumed at `preparing` time), so `sale` is
not currently used. It is reserved for the future "display inventory"
use-case where a branch sells pre-made items (e.g., drinks) that don't
require kitchen preparation.

### 4. Atomic adjustment RPC (`adjust_inventory_stock_atomic`)

`adjust_inventory_stock_atomic` (migration `20260730220000` lines 22-110)
is a SECURITY DEFINER function that performs two writes in a single
transaction:

1. INSERT into `stock_movements` with the requested delta + movement_type.
2. UPDATE `inventory_items.current_stock` to `current_stock + quantity_delta`.

The function enforces four invariants:

- `QUANTITY_DELTA_INVALID` — quantity delta must be non-zero (HTTP 400).
- `INVENTORY_ITEM_NOT_FOUND` — item UUID must exist (HTTP 404).
- `INSUFFICIENT_STOCK` — outbound delta (negative) cannot drive
  `current_stock` below 0 (HTTP 409). The check is `current_stock +
  quantity_delta >= 0`.
- `MOVEMENT_TYPE_INVALID` — movement_type must be in the CHECK constraint
  enum (HTTP 400).

On any invariant violation, the function raises an exception and the
transaction rolls back, leaving `current_stock` and `stock_movements`
consistent. The service layer (`management.ts` lines 340-356) maps the
exception text to HTTP codes.

**Why SECURITY DEFINER?** The function is owned by the service role and
executes with service-role privileges, bypassing RLS. This is necessary
because the API server uses the service role to write — it does not
impersonate the staff user. The trade-off is that the function must
self-enforce all invariants (it cannot rely on RLS for branch scoping).
The `assertBranchMembership(scope, existing.branchId)` check in
`management.ts` line 327 is the API-layer pre-check that ensures the
actor has access to the item's branch before the RPC is invoked.

### 5. RLS policy matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `inventory_items` | `authenticated` using `current_user_has_branch_access(branch_id)` | service_role only | service_role only | service_role only (via CASCADE from branch delete) |
| `stock_movements` | `authenticated` using `current_user_has_branch_access(branch_id)` | service_role only | service_role only | service_role only |

The `current_user_has_branch_access(branch_id)` function (shipped in
foundation migration) returns true if the JWT's `branch_ids` claim
contains the given branch_id, OR if the user is `super-admin`. This
mirrors the pattern established in ADR-019 (RBAC) and reused in ADR-023
(POS) and ADR-027 (Kitchen).

### 6. Permission seed

The `inventory.manage` permission is seeded (migration lines 14-19) to
the `super-admin` and `branch-manager` roles. The admin routes
(`modules/admin/inventory.ts` line 96) accept EITHER `inventory.manage`
OR `admin.access` (the super-admin bypass) — same pattern as Phase 6
admin routes.

### 7. API surface (as-built)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/inventory/items` | `inventory.manage` OR `admin.access` | List items (branch-scoped) |
| `POST` | `/api/v1/admin/inventory/items` | `inventory.manage` OR `admin.access` | Create item (with optional opening stock → inserts `receipt` movement) |
| `PATCH` | `/api/v1/admin/inventory/items/:id` | `inventory.manage` OR `admin.access` | Update item metadata (NOT `current_stock` — use adjustments) |
| `POST` | `/api/v1/admin/inventory/adjustments` | `inventory.manage` OR `admin.access` | Atomic adjustment via `adjust_inventory_stock_atomic` RPC |
| `GET` | `/api/v1/admin/inventory/movements` | `inventory.manage` OR `admin.access` | List movements (filterable by branch_id, inventory_item_id, limit ≤ 200) |

Recipe routes (mounted on the same router) are covered in ADR-034 §6.

### 8. Deferred items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| Low-stock / reorder alerts (automated notification when `current_stock ≤ reorder_level`) | Owner request for automated reorder prompts OR >3 stock-out incidents per branch per month |
| Dedicated `inventory_transfers` table + transfer endpoint (currently `transfer_in`/`transfer_out` movement types exist in CHECK but no API) | Second branch opening OR inter-branch stock moves become operational routine |
| Batch / lot tracking (`inventory_batches` table with `received_date`, `expiry_date`, `lot_number`) | Regulatory requirement OR >2% waste rate attributable to expiry |
| Cost history (`inventory_cost_history` table tracking cost_price changes over time for accurate COGS) | Phase 11 (Finance and Reporting) — when BMs request historical COGS dashboards |
| DB-level immutability trigger on `stock_movements` (block UPDATE/DELETE) | First audit finding that flags the API-only immutability enforcement as insufficient |
| Units master table (`inventory_units` with conversions) | >5 distinct units per branch causing recipe conversion errors |
| Multi-warehouse per branch (`inventory_warehouses` table) | Branch square footage exceeds single-warehouse capacity OR separate dry/cold storage zones require independent tracking |
| Negative stock override (allow `current_stock < 0` for backorder scenarios) | First legitimate backorder scenario (currently blocked by CHECK constraint + RPC invariant) |
| `sale` movement type wiring (POS-driven finished-goods deduction) | Phase 11 — when pre-made items (drinks, desserts) require finished-goods inventory tracking |
| Stock count / physical inventory adjustment workflow (planned count → variance → posting) | Owner request for quarterly stock count OR shrinkage >2% |

---

## Consequences

**Positive:**

- Stock movements are an immutable financial-grade audit trail that
  reconciles with `current_stock` and feeds COGS (ADR-034 §5).
- Branch-scoped items allow independent reorder cycles per branch.
- The `adjust_inventory_stock_atomic` RPC guarantees atomicity —
  partial writes are impossible.
- 8 movement types cover the full lifecycle of inventory (receipt,
  adjustment, transfer, waste, sale consumption, purchase, sale) and
  leave room for future use-cases without schema changes.
- RLS ensures staff can only see their branch's inventory; super-admin
  sees all.

**Negative:**

- No automated low-stock alerts — staff must manually check the
  InventoryKPIs panel. The `minimum_stock` and `reorder_level` columns
  are display-only until alerts are implemented.
- No dedicated transfer endpoint — inter-branch transfers must be
  recorded as two manual adjustments (`transfer_out` from source,
  `transfer_in` to destination) with no atomic guarantee.
- No batch/expiry tracking — ingredients are FIFO implicitly (no
  structured enforcement).
- `cost_price` is a single point-in-time value (last-known), not a
  history. COGS calculations (ADR-034 §5) use this last-known value
  rather than a weighted-average or FIFO cost.

**Neutral:**

- The 8-value CHECK constraint on `movement_type` requires a migration
  to extend. Adding a new type is additive (ALTER TABLE ADD CONSTRAINT),
  but removing one is breaking. The 8 chosen types are designed to cover
  all foreseeable inventory operations.

---

## Related

- [ADR-011](./ADR-011-accounting-immutability.md) — Accounting Immutability & Double-Entry Reversals (pattern origin for append-only ledger)
- [ADR-019](./ADR-019-rbac-authorization-principal.md) — RBAC Authorization Principal & Permission Model
- [ADR-026](./ADR-026-branch-sync-offline-safe-pos-contract.md) — Branch Sync & Offline-Safe POS Contract (centralized DB + RLS pattern)
- [ADR-028](./ADR-028-kot-snapshot-per-item-status.md) — KOT Snapshot & Per-Item Status Model (kitchen→inventory atomic consume bridge)
- [ADR-034](./ADR-034-recipe-bom-cogs-costing-contract.md) — Recipe/BOM & COGS Costing Contract (Phase 10 sibling)
- [ADR-035](./ADR-035-procurement-suppliers-grn-contract.md) — Procurement, Suppliers & GRN Contract (Phase 10 sibling)
- `supabase/migrations/20260730160000_inventory_backend.sql` — schema
- `supabase/migrations/20260730220000_atomic_inventory_and_grn_stock.sql` — atomic RPC
- `backend/api/src/services/inventory/management.ts` — service layer
- `backend/api/src/modules/admin/inventory.ts` — admin routes
- `apps/website/client/src/pages/admin/AdminInventory.tsx` — frontend
