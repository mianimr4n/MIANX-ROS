# ADR-020: Canonical Single-Price Menu Catalog & Atomic Price Audit

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.1.0` (closes Phase 6 — Admin and ERP Core, Menu/Pricing surface)

---

## Context

Telepizza's menu catalog originally used a multi-variant pricing model:
`menu_items` (the product concept) had N `menu_item_variants` (one per
size: small / medium / large), each with its own `price`. This matched
the legacy POS export and the initial seed (`20260713191000_seed_foundation_data.sql`).

By Sprint 4 (July 2026), this model had become an operational liability:

1. **Variant explosion.** Every product had to be created 3× (once per
   size), even when the price was the same. The catalog had ~14 items
   × ~3 sizes = ~42 SKUs, of which only ~14 had meaningfully different
   prices.
2. **Quote-time ambiguity.** The order-create flow had to pick a
   `variant_id` per line item, which meant the public catalog API had
   to expose the variant table — leaking an internal modeling detail
   to customers.
3. **Audit gap.** Price changes updated `menu_item_variants.price` in
   place, with no audit trail. A branch manager could change a price
   and there was no record of who/when/before/after.
4. **Branch override conflict.** The `branch_menu_item_overrides`
   table (created in foundation schema) was meant to allow per-branch
   pricing, but its semantics were never specified — would it
   override the variant price, or replace the variant entirely?

Sprint 4 Phase B (commit `20260725130000`) froze the **canonical
single-price model**: every sellable SKU is one `menu_items` row with
exactly one `price`. The legacy `menu_item_variants` table is retained
read-only for historical `order_items.variant_id` readability, and a
mapping table (`menu_variant_sku_mappings`) preserves the 1:1
relationship between legacy variants and current SKUs.

Price changes flow through a single atomic RPC
(`update_menu_item_price_atomic`) that updates the price AND inserts
an audit row in the same transaction. Idempotency is enforced via a
correlation-key unique index; optimistic concurrency via an
`expected_old_price` parameter.

This ADR formally accepts the Sprint 4 Phase B frozen architecture as
the canonical Phase 6 decision and records the as-built implementation.

## Decision

### 1. Single canonical price per SKU

Every `menu_items` row carries exactly one current selling price:

| Column | Type | Constraint |
|---|---|---|
| `menu_items.price` | `numeric(10,2)` | `NOT NULL`, `CHECK (price >= 0)` |
| `menu_items.size_label` | `text` | nullable; display only (e.g. "Medium") |
| `menu_items.size_code` | `text` | `CHECK (size_code IN ('small','medium','large'))` or null |
| `menu_items.product_group_slug` | `text` | presentation grouping only (e.g. "pepperoni-pizza"); **never** used for pricing indirection |
| `menu_items.base_price` | `numeric(10,2)` | **DEPRECATED** — retained for rollback only; do not read in application code |

A "Large Pepperoni Pizza" and a "Medium Pepperoni Pizza" are two
distinct `menu_items` rows. They share a `product_group_slug` for
presentation grouping on the customer-facing menu, but each has its
own SKU, its own price, and its own audit history.

### 2. Legacy variant table is read-only

`menu_item_variants` is preserved indefinitely for historical
readability of `order_items.variant_id` (orders placed before the
Sprint 4 refactor reference variant IDs, not menu_item IDs). A hard
trigger `prevent_menu_item_variant_writes()` blocks any
INSERT/UPDATE/DELETE on the table unless the session-local GUC
`telepizza.allow_variant_writes = 'on'` is set — which only the
Sprint 4 migration itself did, once.

```sql
-- 20260725140000_canonical_menu_price_audit_atomic.sql:154-176
CREATE OR REPLACE FUNCTION public.prevent_menu_item_variant_writes()
RETURNS trigger AS $$
BEGIN
  IF current_setting('telepizza.allow_variant_writes', true) <> 'on' THEN
    RAISE EXCEPTION 'menu_item_variants is read-only (ADR-020). Use menu_items.price instead.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_menu_item_variant_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.menu_item_variants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_menu_item_variant_writes();
```

### 3. Variant-to-SKU mapping (historical readability)

`menu_variant_sku_mappings` is a 1:1 mapping table created by the
Sprint 4 migration. For every legacy `menu_item_variants.id`, it
records the new `menu_items.id` that replaced it. Backfilled once,
never updated.

```text
menu_variant_sku_mappings
  old_variant_id  UUID  FK → menu_item_variants.id (read-only)
  new_menu_item_id UUID  FK → menu_items.id
  migrated_at     timestamptz default now()
```

Application code that needs to resolve a legacy `order_items.variant_id`
to a current SKU joins through this table. The mapping is immutable.

### 4. Atomic price-change RPC

All price changes flow through a single RPC:

```text
update_menu_item_price_atomic(
  p_menu_item_id      UUID,
  p_new_price         NUMERIC,
  p_actor_user_id     UUID,
  p_correlation_id    TEXT,        -- caller-generated, idempotency key
  p_expected_old_price NUMERIC DEFAULT NULL  -- optimistic concurrency
)
RETURNS TABLE(updated BOOLEAN, previous_price NUMERIC, new_price NUMERIC,
              audit_event_id UUID, idempotent_replay BOOLEAN)
```

Semantics:

| Case | Behavior |
|---|---|
| Price unchanged (`p_new_price` == current `price`) | No UPDATE, no audit row, returns `updated=false, idempotent_replay=false` |
| `p_expected_old_price` != current `price` | Raises `PRICE_CONFLICT` (exception) — caller must retry with fresh price |
| `(resource_id, action, correlation_id)` already in `menu_audit_events` | No UPDATE, no audit row, returns `updated=false, idempotent_replay=true` |
| Valid change | UPDATE `menu_items.price`, INSERT `menu_audit_events` row, returns `updated=true` |

Both operations execute in a single transaction — there is no window
where the price is updated but the audit row is missing, or vice
versa.

### 5. Audit trail (`menu_audit_events`)

Every catalog mutation (price change, availability toggle, category
reorder, SKU create/update) writes a row to `menu_audit_events`:

| Column | Purpose |
|---|---|
| `resource_type` | `menu_category` / `menu_item` |
| `resource_id` | UUID of the affected row |
| `action` | free-text action code (e.g. `price_change`, `availability_toggle`, `sku_create`) |
| `scope` | `global` / `branch` |
| `branch_id` | nullable; set for branch-scoped actions |
| `before_data` | JSONB snapshot of the row before the change |
| `after_data` | JSONB snapshot of the row after the change |
| `note` | optional free-text (no PII) |
| `correlation_id` | caller-generated; supports idempotent replay |
| `actor_user_id` | the staff user who made the change |
| `created_at` | `now()` |

The table is append-only (no UPDATE / DELETE trigger exists, but
application code never attempts either). A unique index
`menu_audit_events_correlation_uidx` on `(resource_id, action, correlation_id)`
enforces idempotency for the atomic price-change RPC.

### 6. `branch_menu_item_overrides` is INACTIVE by design

The `branch_menu_item_overrides` table (created in foundation schema,
re-asserted in `20260725130000`) is **reserved but inactive**. No
runtime code path reads it. The comment in the migration (lines
109-110) states: "Founder approval required before any code reads
this table."

Per-branch pricing is currently achieved through the `coupons` and
`loyalty_rewards` systems (ADR-021), not through menu price overrides.
This avoids the dual-source-of-truth problem (is the price the menu
price or the override price?) and keeps the menu catalog globally
consistent.

If a future business requirement demands per-branch menu pricing, a
separate ADR must be authored to define the override semantics,
resolution order, and audit trail before any code reads the table.

### 7. Modifier system (orthogonal)

The modifier system (`modifier_groups`, `modifier_options`,
`item_modifier_groups`, `order_item_modifiers`) added in
`20260718120000_product_modifier_system.sql` is orthogonal to the
single-price model. Modifiers are size-scaled price deltas applied
at order time (e.g. "+150 PKR for extra cheese on a large pizza").
They do not affect the menu item's canonical `price`.

Modifier groups are attached to `menu_items` via `item_modifier_groups`.
A modifier option's `price_delta` is added to the menu item's `price`
when the order is created. The order's `order_item_modifiers` rows
snapshot the delta at order time (immutable).

### 8. Admin API surface

```text
# backend/api/src/modules/admin/menu.ts (mounted under /admin/menu)
GET    /admin/menu/categories
POST   /admin/menu/categories
PATCH  /admin/menu/categories/:id

GET    /admin/menu/products              (product groups for presentation)
POST   /admin/menu/products              (create new SKU)
PATCH  /admin/menu/products/:id          (update SKU; price changes → update_menu_item_price_atomic RPC)
PATCH  /admin/menu/items/:id             (Owner ERP contract alias)
PATCH  /admin/menu/items/:id/availability (86 / un-86 toggle)
PATCH  /admin/menu/variants/:id          (legacy variant → mapped SKU; does NOT write menu_item_variants)
PUT    /admin/menu/skus/:id              (canonical alias)
POST   /admin/menu/skus/:id/image        (upload to menu-product-images storage bucket)
GET    /admin/menu/audit                 (audit events list)
```

Reads require `menu.read`; mutations require `menu.write` or
`admin.access`. All mutations write a `menu_audit_events` row.

## Consequences

### Positive

- **One price per SKU, period.** No more "which variant is the
  canonical one?" ambiguity. The customer-facing catalog API exposes
  `menu_items` directly.
- **Atomic price audit.** Every price change is recorded with
  who/when/before/after in the same transaction as the price update.
  No window for inconsistency.
- **Idempotent retries.** The `correlation_id` unique index means a
  retried price-change RPC (e.g. after a network blip) is a no-op,
  not a duplicate audit row.
- **Optimistic concurrency.** The `p_expected_old_price` parameter
  lets the UI detect stale reads ("the price was changed by another
  admin while you were editing") and surface a conflict UI.
- **Legacy variant readability preserved.** Historical orders that
  reference `variant_id` can still be displayed correctly via the
  mapping table.
- **No dual-source-of-truth for branch pricing.** Per-branch
  promotions flow through coupons/loyalty, not menu overrides. The
  catalog is globally consistent.

### Negative

- **No live per-branch menu pricing.** If a branch needs a different
  shelf price for the same SKU (not a promotion — a different
  permanent price), the only path today is a separate `menu_items`
  row, which loses the `product_group_slug` presentation grouping.
  This is a deliberate trade-off; per-branch pricing is a Phase 11+
  concern.
- **Modifier deltas are not in the audit trail.** The
  `menu_audit_events` table records menu item changes but not
  modifier group/option changes. Modifier changes are RLS-protected
  admin-only writes but have no formal audit trail. To be addressed
  in a future ADR if modifier audit becomes a requirement.
- **`base_price` column is dead but present.** It cannot be dropped
  without a coordinated migration (rollback safety). It is marked
  DEPRECATED in comments; application code must not read it.

## Alternatives Considered

- **Keep the multi-variant model, add audit.** Rejected: the variant
  explosion was the root problem. Adding audit alone would not fix
  the catalog API surface that leaked variant IDs to customers.
- **Introduce a `menu_item_prices` table (effective-dated).**
  Rejected: would have introduced time-travel query semantics
  ("what was the price on 2026-07-15?") that no current use case
  demands. The `menu_audit_events.before_data` JSONB snapshot
  supports historical queries without a separate prices table.
- **Make `branch_menu_item_overrides` the primary per-branch pricing
  mechanism.** Rejected: dual source of truth (menu price vs
  override price) makes quote-time resolution ambiguous. Per-branch
  promotions are better handled through coupons (ADR-021) which are
  scoped, time-bounded, and auditable.
- **Use Postgres temporal tables (`period` / `system_time`).**
  Rejected: temporal tables are heavy, not well-supported by
  Supabase client libraries, and overkill for the current audit
  requirement.
- **Soft-delete `menu_item_variants` (mark inactive instead of
  blocking writes).** Rejected: soft-delete would still allow
  accidental writes via the application layer. A hard trigger is
  the only safe way to enforce the read-only invariant.

## As-Built Verification (2026-08-16)

`scripts/phase_6_verify.py` confirms Production Supabase has:

- ✅ 4 menu tables: `menu_categories`, `menu_items`, `menu_item_variants`
  (read-only), `menu_variant_sku_mappings`
- ✅ 1 audit table: `menu_audit_events` with `correlation_id` unique index
- ✅ 1 inactive override table: `branch_menu_item_overrides` (no runtime
  reads)
- ✅ 4 modifier tables: `modifier_groups`, `modifier_options`,
  `item_modifier_groups`, `order_item_modifiers`
- ✅ `menu_items.price` column: NOT NULL, CHECK (price >= 0), no NULLs in data
- ✅ `menu_items.base_price` column: present but deprecated
- ✅ `update_menu_item_price_atomic` RPC exists and is callable
- ✅ `prevent_menu_item_variant_writes` trigger exists on
  `menu_item_variants`
- ✅ Every legacy variant has a `menu_variant_sku_mappings` row
- ✅ `menu.read` / `menu.write` permissions seeded

**Result: see `PHASE6_FINAL_GATE.md` for full verification matrix.**

## References

- [`docs/13-adr/ADR-001-branch-configuration-inheritance.md`](./ADR-001-branch-configuration-inheritance.md) — branch override reservation (settings layer)
- [`docs/13-adr/ADR-012-domain-event-audit.md`](./ADR-012-domain-event-audit.md) — domain events audit (menu events are NOT yet mirrored; future work)
- [`docs/13-adr/ADR-021-deals-coupons-loyalty-engine.md`](./ADR-021-deals-coupons-loyalty-engine.md) — per-branch promotions via coupons
- [`backend/api/src/services/menu/management.ts`](../../backend/api/src/services/menu/management.ts) — `MenuManagementService` (writes via `update_menu_item_price_atomic` RPC)
- [`backend/api/src/services/catalog/supabase.ts`](../../backend/api/src/services/catalog/supabase.ts) — read-only `CatalogDataSource`
- [`backend/api/src/services/catalog/types.ts`](../../backend/api/src/services/catalog/types.ts) — `MenuCatalogSku` contract
- [`backend/api/src/modules/admin/menu.ts`](../../backend/api/src/modules/admin/menu.ts) — admin endpoints
- Migrations: `20260713190000_foundation_schema.sql`, `20260713191000_seed_foundation_data.sql`, `20260718120000_product_modifier_system.sql`, `20260725130000_canonical_single_price_menu_domain.sql`, `20260725140000_canonical_menu_price_audit_atomic.sql`, `20260729220000_menu_product_images_storage.sql`
