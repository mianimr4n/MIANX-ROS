# ADR-034: Recipe/BOM & COGS Costing Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.5.0` (closes Phase 10 — Inventory and Procurement, ADR-034 of 3)

---

## Context

Telepizza's recipe / Bill-of-Materials (BOM) layer connects the menu
catalog (ADR-020) to the inventory stock master (ADR-033). When the
kitchen transitions a ticket to `preparing`, the
`kitchen_ticket_set_preparing_atomic` RPC (ADR-028 §3) reads the
active recipe for each menu item, computes the ingredient quantities,
and atomically deducts stock via the `sale_consumption` movement type.

The recipe data model was shipped in two waves:

1. `20260730230000_kitchen_recipe_stock_consume.sql` — creates the
   `menu_item_inventory_components` mapping table (denormalized
   active-recipe cache) + the original
   `kitchen_ticket_set_preparing_atomic` RPC.
2. `20260731180000_rc4_inventory_recipes_cogs.sql` — creates the
   versioned `inventory_recipes` + `inventory_recipe_lines` +
   `inventory_recipe_modifier_effects` tables, the consumption-event
   audit tables (`inventory_consumption_events` +
   `inventory_consumption_event_lines`), the
   `inventory_stock_exceptions` table, the
   `inventory_recipe_audit_events` table, and the
   `inventory_cogs_events` table. Also replaces the original
   `kitchen_ticket_set_preparing_atomic` RPC with a richer version
   that writes consumption events + COGS events alongside stock
   movements.

The backend service layer (`backend/api/src/services/inventory/recipes.ts`,
681 lines) exposes recipe CRUD + activate/deactivate + duplicate +
missing-recipe detection. The admin router
(`backend/api/src/modules/admin/inventory-recipes.ts`, 252 lines)
exposes 8 recipe routes. The frontend recipe management surface lives
inside `AdminInventory.tsx` (recipe tab). 246 backend tests
(`inventory-recipes.test.ts`) cover the recipe lifecycle.

However, the recipe + COGS data model was never elevated to a formal
ADR. The deferral of modifier-effect consumption, recipe versioning
rollback, COGS GL posting, and cost-history tracking is documented in
`InventoryFoundationPanel.tsx` and `InventoryInsights.tsx` honest-gap
blocks. This ADR consolidates those deferrals into a single accepted
decision.

This ADR formally accepts the as-built recipe + BOM + COGS model as the
canonical Phase 10 contract. Modifier-effect consumption certification,
COGS GL posting, and recipe versioning rollback are explicitly deferred.

---

## Decision

### 1. Versioned recipes (one-active-per-menu_item)

`inventory_recipes` (migration `20260731180000` lines 9-32) stores
versioned recipes scoped to `(branch_id, menu_item_id)`. The
`status` column has three values: `draft`, `active`, `inactive`. The
partial UNIQUE index `uq_inventory_recipes_one_active` (lines 35-37)
guarantees at most ONE active recipe per `(branch_id, menu_item_id)` at
any time.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `menu_item_id` | uuid FK → `menu_items(id)` ON DELETE CASCADE | Menu item this recipe produces |
| `name` | text NOT NULL | Recipe name (e.g., "Margherita Pizza (Medium) — Standard") |
| `version` | integer NOT NULL CHECK ≥ 1 | Version number (monotonically incremented by service layer) |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `active`, `inactive`} | Lifecycle status |
| `yield_factor` | numeric(10,4) NOT NULL DEFAULT 1 CHECK > 0 | Yield multiplier (e.g., 1.2 = recipe produces 120% of nominal quantity) |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` ON DELETE SET NULL | Author |
| `updated_by` | uuid FK → `users(id)` ON DELETE SET NULL | Last editor |
| `activated_at` | timestamptz | Activation timestamp (set when status → `active`) |
| `deactivated_at` | timestamptz | Deactivation timestamp (set when status → `inactive`) |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz DEFAULT now() | Last update (auto-maintained by trigger) |

UNIQUE constraint on `(branch_id, menu_item_id, version)` — version
numbers are unique per (branch, menu_item) pair.

**Why versioned, not single-row?** Recipe changes are operationally
risky (wrong quantities → stock variance + customer complaints).
Versioning allows a BM to draft a new recipe, test it, activate it,
and — if it causes issues — reactivate the prior version. The
`duplicate` endpoint (`POST /api/v1/admin/inventory/recipes/:id/duplicate`)
creates a new draft from an existing recipe, allowing easy iteration.
The `activate` endpoint (`POST /api/v1/admin/inventory/recipes/:id/activate`)
atomically sets the new recipe to `active` and demotes any prior active
recipe to `inactive` within a single transaction (service layer
`recipes.ts` line 410-460).

**Why one-active-per-menu_item?** The kitchen atomic consume RPC reads
the active recipe at the moment of ticket creation. If two recipes were
simultaneously active, the RPC would have to choose, leading to
non-deterministic stock deductions. The partial UNIQUE index makes this
choice impossible at the DB level.

### 2. Recipe ingredient lines (`inventory_recipe_lines`)

`inventory_recipe_lines` (lines 50-65) stores one row per ingredient in
a recipe. Each line references an `inventory_item` (the ingredient) and
specifies a quantity + unit + waste factor.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `recipe_id` | uuid FK → `inventory_recipes(id)` ON DELETE CASCADE | Parent recipe |
| `inventory_item_id` | uuid FK → `inventory_items(id)` ON DELETE RESTRICT | Ingredient (RESTRICT prevents deleting an item that's still in a recipe) |
| `quantity` | numeric(14,4) NOT NULL CHECK > 0 | Quantity per unit of menu item |
| `unit` | text NOT NULL | Unit of measure (must be convertible to the inventory_item's unit via `inventory/units.ts`) |
| `waste_factor` | numeric(10,4) NOT NULL DEFAULT 1 CHECK > 0 | Waste multiplier (e.g., 1.1 = 10% waste allowance) |
| `sort_order` | integer NOT NULL DEFAULT 0 | Display order |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |

UNIQUE constraint on `(recipe_id, inventory_item_id)` — each ingredient
appears at most once per recipe.

**Why a waste factor?** Dough, cheese, and toppings all have realistic
waste (trim loss, spillage, drip loss). The waste factor allows the
recipe to specify the *consumed* quantity (e.g., 200g dough × 1.05 waste
factor = 210g deducted from stock). Without this, every recipe would
silently understate consumption, leading to chronic stock variance.

### 3. Modifier effects (documented but DEFERRED for consume)

`inventory_recipe_modifier_effects` (lines 75-90) stores per-modifier
ingredient deltas. For example, "Extra Cheese" modifier might add 50g
cheese to the recipe; "No Olives" might remove 20g olives.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `recipe_id` | uuid FK → `inventory_recipes(id)` ON DELETE CASCADE | Parent recipe |
| `modifier_option_id` | uuid FK → `modifier_options(id)` ON DELETE CASCADE | Modifier option (e.g., "Extra Cheese") |
| `inventory_item_id` | uuid FK → `inventory_items(id)` ON DELETE RESTRICT | Ingredient affected |
| `quantity_delta` | numeric(14,4) NOT NULL | Delta (positive for add, negative for remove) |
| `unit` | text NOT NULL | Unit of measure |
| `effect_type` | text NOT NULL CHECK ∈ {`add`, `remove`} | Effect classification |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |

UNIQUE on `(recipe_id, modifier_option_id, inventory_item_id, effect_type)`.

**Critical deferral:** The `kitchen_ticket_set_preparing_atomic` RPC
(REPLACE'd in this migration, lines 200-280) reads ONLY the base
`inventory_recipe_lines` — it does NOT consult
`inventory_recipe_modifier_effects`. The migration's comment (line 76)
makes this explicit: "Kitchen consume uses base recipe lines only until
modifier consume is certified." This means if a customer orders
"Margherita Pizza with Extra Cheese", the kitchen consumes the base
recipe's cheese quantity — NOT the extra cheese. The extra cheese is
effectively free from an inventory perspective until modifier consume
is implemented.

**Why defer?** Modifier consume requires resolving the modifier tree
for each order item at ticket-creation time, which adds complexity to
the atomic RPC. The base-recipe-only path was certified in RC4; modifier
consume requires its own certification cycle (correctness under
modifier-groups, quantity multipliers, free/paid modifiers, etc.). The
deferral is documented in the migration comment and surfaced in the
`InventoryInsights.tsx` UI ("Modifier-effect consume: deferred — base
recipe only").

### 4. Consumption events (idempotent + reversible)

`inventory_consumption_events` (lines 100-130) is the audit table for
every kitchen-driven stock consume. It is idempotent via the
`UNIQUE(idempotency_key)` constraint and reversible via the
`reversed_event_id` self-FK.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `order_id` | uuid FK → `orders(id)` ON DELETE CASCADE | Source order |
| `kitchen_ticket_id` | uuid FK → `kitchen_tickets(id)` ON DELETE SET NULL | Source ticket (nullable if ticket is deleted) |
| `event_type` | text NOT NULL CHECK ∈ {`consume`, `reverse`} | Event classification |
| `idempotency_key` | text NOT NULL UNIQUE | Idempotency key (typically `kitchen_ticket_id + ':set_preparing'`) |
| `source_event` | text NOT NULL DEFAULT `'kitchen_preparing'` | Triggering event |
| `request_id` | text | Request ID for traceability |
| `actor_user_id` | uuid FK → `users(id)` ON DELETE SET NULL | Actor |
| `reversed_event_id` | uuid FK → `inventory_consumption_events(id)` ON DELETE SET NULL | Reverse-event link (set on `reverse` events) |
| `status` | text NOT NULL DEFAULT `'posted'` CHECK ∈ {`posted`, `reversed`, `noop`} | Lifecycle status |
| `metadata` | jsonb NOT NULL DEFAULT `'{}'` | Additional context (e.g., `{"ticket_status": "preparing"}`) |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |

Two indexes: `idx_inv_consumption_ticket` (for ticket-scoped queries)
and `idx_inv_consumption_order` (for order-scoped queries).

**Why idempotent?** The kitchen ticket state machine (ADR-027 §3)
guarantees that a ticket can transition to `preparing` at most once.
However, the API may receive duplicate requests (network retries,
operator double-clicks). The idempotency key ensures that a second
request with the same key returns the original result without
re-deducting stock. The RPC's first action is `INSERT ...
ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`; if the INSERT
returns no rows, the RPC fetches the existing event and returns it.

**Why reversible?** If a ticket is cancelled AFTER it transitions to
`preparing` (e.g., customer cancels mid-preparation), the consumed
stock must be returned. The `inventory_reverse_kitchen_consumption_atomic`
RPC (lines 290-360) creates a `reverse` event with
`reversed_event_id` pointing to the original `consume` event, inserts
compensating `stock_movements` (positive quantities), increments
`inventory_items.current_stock`, and marks the original event as
`status='reversed'`. This mirrors the ADR-011 (Accounting Immutability)
double-entry reversal pattern.

`inventory_consumption_event_lines` (lines 140-160) stores the
per-ingredient breakdown of each event, with FK to `stock_movements.id`
for traceability.

### 5. COGS events (cost-of-goods-sold tracking)

`inventory_cogs_events` (lines 200-230) records the cost-of-goods-sold
for each consumption event. It is the financial-grade companion to
`inventory_consumption_events`.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `consumption_event_id` | uuid FK → `inventory_consumption_events(id)` ON DELETE CASCADE | Source event |
| `order_id` | uuid FK → `orders(id)` ON DELETE CASCADE | Denormalized for query efficiency |
| `kitchen_ticket_id` | uuid FK → `kitchen_tickets(id)` ON DELETE SET NULL | Denormalized |
| `total_cost` | numeric(14,4) NOT NULL CHECK ≥ 0 | Total COGS for the event |
| `cost_currency` | varchar(3) NOT NULL DEFAULT `'PKR'` | Currency code (ISO 4217) |
| `cost_breakdown` | jsonb NOT NULL DEFAULT `'[]'` | Per-ingredient cost breakdown |
| `cost_source` | text NOT NULL DEFAULT `'last_known'` CHECK ∈ {`last_known`, `weighted_average`, `fifo`, `manual`} | Costing method |
| `cost_as_of` | timestamptz NOT NULL | Timestamp the cost was computed (for audit) |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |

**Costing method:** The current implementation uses `last_known` — the
`cost_price` from `inventory_items` at the moment of consumption. This
is the simplest method and matches the ADR-033 §1 design (single
point-in-time cost). The `cost_source` column is forward-compatible
with `weighted_average`, `fifo`, and `manual` methods, which are
DEFERRED (§8).

**Why track COGS separately from consumption events?** Consumption
events are operational (what was consumed); COGS events are financial
(what it cost). Separating them allows the finance layer (Phase 11)
to recompute COGS under different costing methods without touching the
operational ledger. It also allows COGS to be posted to the GL
separately from stock movements (ADR-011 pattern).

### 6. Stock exceptions (variance tracking)

`inventory_stock_exceptions` (lines 170-195) records cases where the
atomic consume RPC encountered a variance — e.g., insufficient stock
for an ingredient, but the consume proceeded anyway because the
`kitchen_ticket_set_preparing_atomic` RPC has a "soft fail" mode for
non-critical ingredients (currently disabled — see §8).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `inventory_item_id` | uuid FK → `inventory_items(id)` ON DELETE RESTRICT | Item with variance |
| `consumption_event_id` | uuid FK → `inventory_consumption_events(id)` ON DELETE CASCADE | Source event |
| `exception_type` | text NOT NULL CHECK ∈ {`insufficient_stock`, `negative_stock`, `missing_recipe`, `unit_conversion_failed`} | Exception classification |
| `severity` | text NOT NULL DEFAULT `'warning'` CHECK ∈ {`info`, `warning`, `error`} | Severity level |
| `quantity_requested` | numeric(14,4) | Requested quantity |
| `quantity_consumed` | numeric(14,4) | Actual consumed quantity |
| `metadata` | jsonb NOT NULL DEFAULT `'{}'` | Additional context |
| `resolved_at` | timestamptz NULLABLE | Resolution timestamp |
| `resolved_by` | uuid FK → `users(id)` ON DELETE SET NULL | Resolver |
| `created_at` | timestamptz DEFAULT now() | Creation timestamp |

### 7. Recipe audit events

`inventory_recipe_audit_events` (lines 240-270) records every recipe
lifecycle event (create, update, activate, deactivate, duplicate,
delete). It is the governance audit trail for recipe changes.

### 8. Cost-availability honesty model

The recipe service (`recipes.ts` lines 100-120) exposes a
`CostAvailability` type with four values:

| Value | Meaning |
|---|---|
| `LIVE` | All ingredient `cost_price` values are non-null and recent (< 30 days) |
| `DERIVED` | Some ingredient `cost_price` values are null but a category-level average was used |
| `UNAVAILABLE` | No cost data available — `estimatedCost` is null |
| `DEFERRED` | Cost computation is explicitly deferred (e.g., for a recipe with no lines) |

The frontend (`InventoryInsights.tsx`) renders this as a colored badge
on each recipe row. This is the same honesty model used in
`WhatsAppIntegrationBanner.tsx` (Phase 2.2) and `AdminKitchenDashboard.tsx`
(Phase 8) — surfacing what's live vs. deferred rather than hiding the
gap.

### 9. API surface (as-built)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/inventory/recipes` | `inventory.manage` OR `admin.access` | List recipes (filterable by branch_id, menu_item_id, status) |
| `GET` | `/api/v1/admin/inventory/recipes/missing` | `inventory.manage` OR `admin.access` | List menu items with NO active recipe |
| `GET` | `/api/v1/admin/inventory/recipes/:id` | `inventory.manage` OR `admin.access` | Get single recipe (with lines + cost breakdown) |
| `POST` | `/api/v1/admin/inventory/recipes` | `inventory.manage` OR `admin.access` | Create recipe (draft) |
| `PATCH` | `/api/v1/admin/inventory/recipes/:id` | `inventory.manage` OR `admin.access` | Update recipe (lines, name, yield_factor, notes) |
| `POST` | `/api/v1/admin/inventory/recipes/:id/activate` | `inventory.manage` OR `admin.access` | Activate recipe (demotes prior active) |
| `POST` | `/api/v1/admin/inventory/recipes/:id/deactivate` | `inventory.manage` OR `admin.access` | Deactivate recipe |
| `POST` | `/api/v1/admin/inventory/recipes/:id/duplicate` | `inventory.manage` OR `admin.access` | Duplicate recipe (creates new draft) |

### 10. Deferred items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| Modifier-effect consumption (read `inventory_recipe_modifier_effects` in `kitchen_ticket_set_preparing_atomic`) | Owner sign-off that base-recipe-only consume is causing >2% stock variance on modifier-heavy orders |
| COGS GL posting (post `inventory_cogs_events` to `journal_entries` via ADR-011 pattern) | Phase 11 (Finance and Reporting) — when BMs request COGS dashboards in the GL |
| Weighted-average / FIFO costing methods | Phase 11 — when last-known cost causes COGS distortion >5% on volatile-price ingredients |
| Cost history (`inventory_cost_history` table) | Phase 11 — same trigger as costing methods |
| Recipe versioning rollback (1-click revert to prior active version) | First incident of a bad recipe activation causing customer complaints |
| Soft-fail mode for non-critical ingredients (consume what's available, log exception, continue) | First incident of kitchen ticket blocking on a single missing ingredient |
| Recipe yield factor enforcement (currently informational only — consume does NOT multiply by yield_factor) | Owner request for yield-adjusted recipes OR >3 incidents of over/under-consumption due to yield |
| Per-recipe waste tracking (compare recipe waste_factor to actual waste via `inventory_stock_exceptions`) | First quarterly stock count showing >5% variance on recipe items |
| Recipe import/export (bulk CSV upload for multi-branch rollout) | Second branch opening (currently recipes are branch-scoped and must be re-authored per branch) |

---

## Consequences

**Positive:**

- Versioned recipes with one-active-per-menu_item guarantee
  deterministic kitchen consume.
- Consumption events are idempotent + reversible — the kitchen can
  safely retry `set_preparing` and reverse on cancellation.
- COGS events provide financial-grade cost tracking, separated from
  operational consume for finance-layer recomputation.
- Stock exceptions surface variances for follow-up.
- The cost-availability honesty model ensures the UI never lies about
  what's live vs. deferred.
- The `menu_item_inventory_components` denormalized cache (updated on
  recipe activate) allows the kitchen RPC to read a single row per
  ingredient rather than joining `inventory_recipes` +
  `inventory_recipe_lines` on every ticket.

**Negative:**

- Modifier-effect consume is deferred — extra cheese / no olives do
  NOT affect stock deductions today. This silently understates
  consumption for modifier-heavy orders.
- `last_known` costing can distort COGS when ingredient prices are
  volatile (e.g., fresh produce).
- Yield factor is informational only — consume does not multiply by
  `yield_factor`. This is a known gap.
- Recipe duplication does NOT copy modifier effects (must be re-added
  manually).

**Neutral:**

- The recipe schema is branch-scoped — each branch authors its own
  recipes. A multi-branch recipe catalog is deferred to Phase 15
  (franchise rollout).

---

## Related

- [ADR-011](./ADR-011-accounting-immutability.md) — Accounting Immutability & Double-Entry Reversals (reversal pattern)
- [ADR-020](./ADR-020-canonical-single-price-menu-catalog.md) — Canonical Single-Price Menu Catalog (menu_items FK)
- [ADR-028](./ADR-028-kot-snapshot-per-item-status.md) — KOT Snapshot & Per-Item Status Model (kitchen→inventory consume bridge)
- [ADR-033](./ADR-033-inventory-stock-master-movement-ledger-contract.md) — Inventory Stock Master & Movement Ledger (Phase 10 sibling)
- [ADR-035](./ADR-035-procurement-suppliers-grn-contract.md) — Procurement, Suppliers & GRN Contract (Phase 10 sibling)
- `supabase/migrations/20260730230000_kitchen_recipe_stock_consume.sql` — original kitchen consume
- `supabase/migrations/20260731180000_rc4_inventory_recipes_cogs.sql` — versioned recipes + COGS
- `backend/api/src/services/inventory/recipes.ts` — service layer
- `backend/api/src/services/inventory/units.ts` — unit conversion helpers
- `backend/api/src/modules/admin/inventory-recipes.ts` — admin routes
- `backend/api/tests/inventory-recipes.test.ts` — test coverage (246 tests)
