# Canonical Single-Price Menu Domain

Status: **Implemented locally — NOT applied to production**
Authorized: Founder Product and Engineering Decision, 2026-07-25
Founder price lock: **2026-07-26** — migration `20260725120000` expanded real-menu prices are the initial authoritative production-intended prices. Older bootstrap board prices (e.g. Tele Special 499/950/1570) are stale. Owner/Admin may edit later via Admin Menu; every change records through `update_menu_item_price_atomic`.
Migrations:
- `supabase/migrations/20260725120000_expand_and_activate_real_menu_catalog.sql` *(authoritative initial price board)*
- `supabase/migrations/20260725130000_canonical_single_price_menu_domain.sql`
- `supabase/migrations/20260725140000_canonical_menu_price_audit_atomic.sql`

---

## 0. Source of truth (locked terminology)

| Layer | Role |
| --- | --- |
| **Runtime source of truth** | Database accessed through the canonical Menu API (`GET /api/v1/menu/catalog`, Admin Menu APIs). Customer, Admin, POS, Orders, Kitchen, Reports, and dashboard readiness all consume this. |
| **Bootstrap catalog** | `data/catalog/telepizza-canonical-menu.json` — reviewed import/definition board only. **Not** an independent runtime catalog after DB initialization. |
| **Generated derivatives** | Offline `menu-data.ts`, migration upsert rows, fixtures — must carry source checksum and must not be hand-edited as a second price list. |

JSON and TypeScript fallbacks are **never** authoritative when the API succeeds.

### Founder price decision (2026-07-26)

```text
Authoritative initial prices = 20260725120000 expanded real-menu prices
Examples: Tele Special Small 620 / Medium 1250 / Large 1890
Stale bootstrap prices (499 / 950 / 1570) must not remain
completionStatus = OWNER_PRICES_LOCKED_EXPAND_20260725120000
```

Future price changes happen only through Admin Menu and the atomic audit RPC.

---

## 1. Decision

Telepizza uses **one global menu** across Customer Website, Admin ERP, POS, Orders, Kitchen,
Reports, dashboards, and future channels.

**Every sellable menu item (SKU) has exactly one current selling price.**

`menu_item_variants` is no longer the pricing model. It is deprecated and retained only for
rollback and historical order readability.

---

## 2. Domain model

### Menu Category

| Field | Notes |
| --- | --- |
| `id` | uuid |
| `name` | display name |
| `slug` | unique |
| `sort_order` | display order |
| `is_active` | inactive categories are hidden from browse |
| `created_at`, `updated_at` | |

### Sellable Menu Item / SKU (`menu_items`)

| Field | Notes |
| --- | --- |
| `id` | uuid — **the exact identifier every layer uses** |
| `category_id` | FK to `menu_categories` |
| `product_group_slug` | nullable; presentation grouping only |
| `name` | full SKU name, e.g. `Tele Special — 12 inch Large` |
| `slug` | unique |
| `size_label` | nullable, e.g. `12 inch Large` |
| `size_code` | nullable machine tier: `small` \| `medium` \| `large` |
| `description` | |
| `price` | **NOT NULL, `>= 0`** — the one selling price |
| `is_available` | an unavailable SKU cannot be newly ordered |
| `image_url` | nullable |
| `sort_order` | order inside its family / category |
| `base_price` | **DEPRECATED** legacy column, retained for rollback only |

### Modifier Group / Modifier Option

Unchanged by this refactor. Groups (Crust, Extra Toppings, Dips, Drink Choice) attach to a SKU
through `item_modifier_groups`; each option carries at most one additional price delta.
**Modifier prices are separate from the SKU's primary selling price** and are never folded into it.

---

## 3. SKU versus product family

A **product family** is presentation metadata, not a pricing container.

```
Tele Special                      <- family (product_group_slug: "tele-special")
├─ Tele Special — 6 inch Small    <- SKU, price 620
├─ Tele Special — 10 inch Medium  <- SKU, price 1250
└─ Tele Special — 12 inch Large   <- SKU, price 1890
```

Rules:

1. Every SKU has exactly one price.
2. `price` is server-authoritative. A client-supplied price is never trusted.
3. `slug` is unique across all SKUs.
4. `price` is non-negative.
5. An unavailable SKU cannot be newly ordered.
6. Historical orders retain their captured name and price snapshots.
7. Product grouping is presentation metadata, not pricing indirection.
8. Customer, POS, Admin, Kitchen and Reports use the same SKU id.
9. No active runtime path depends on `menu_item_variants`.

Single-price products (Zinger Burger) remain one SKU whose `product_group_slug` equals its own
slug and whose `size_label` is null.

---

## 4. One-price rule enforcement

| Layer | Enforcement |
| --- | --- |
| Database | `menu_items.price NOT NULL` + `menu_items_price_non_negative CHECK (price >= 0)` |
| Migration | In-transaction assertion aborts on any null/negative price or duplicate slug |
| Backend catalog | `MenuCatalogSku.price` is a required number; no variant array is exposed |
| Backend pricing | `resolveSku()` returns one SKU; the line price is that SKU's `price` |
| Admin API | `price` is a single non-negative number on create and update |
| Admin UI | One `Price (PKR)` field; no variant-price matrix is rendered |
| Offline fallback | Generator emits exactly one `price:` per SKU; a static test asserts it |

---

## 5. Migration strategy

The migration is **additive and forward-only**. It performs no `TRUNCATE`, no `DELETE`, no
`CASCADE` on catalog data, and drops no table or column.

Steps:

1. Snapshot `order_items` and all catalog counts into temporary tables for later assertions.
2. Add `product_group_slug`, `size_label`, `size_code`, `price`, `sort_order` to `menu_items`.
3. Create `menu_variant_sku_mappings (old_variant_id, new_menu_item_id, migrated_at)`.
4. Create `menu_audit_events` and the inactive `branch_menu_item_overrides`.
5. Backfill `product_group_slug = slug` and `price = base_price` for single-price products.
6. Expand every variant family:
   - the lowest-sorted variant **keeps the original `menu_items` row and id**;
   - every other variant becomes a **new** SKU row in the same category;
   - the family's `item_modifier_groups` rows are mirrored onto each new SKU;
   - each variant is recorded in `menu_variant_sku_mappings`.
7. Apply `NOT NULL` + non-negative constraints and the family/category indexes.
8. Deprecate `menu_item_variants` via table comment.
9. Enable RLS, policies and grants on the three new tables.
10. Run safety assertions; any violation aborts the whole transaction.

SKU slug rule (shared by the migration and the offline-fallback generator so both agree on SKU
identity): `slug = product_group_slug + "-" + (size_code | slugify(label) | "option-N")`.

### Idempotency

Conversion is driven by the absence of a `menu_variant_sku_mappings` row, and every insert uses
`ON CONFLICT ... DO UPDATE` / `DO NOTHING`. Re-running the migration performs no further inserts.
Verified locally by applying it twice to a production-shaped scratch database; counts were
identical on both runs.

---

## 6. Historical order compatibility

- `order_items.menu_item_id` and `order_items.variant_id` are **never rewritten**. The migration
  asserts that every pre-existing order line still resolves to the same references.
- `order_items.variant_id` keeps a table comment describing it as a historical snapshot.
- Every legacy `variant_id` resolves to exactly one current SKU through
  `menu_variant_sku_mappings`; the migration asserts there are no unmapped variants and no order
  line pointing at an unmapped variant.
- Historical totals and name/price snapshots are never recalculated.
- Reorder (`apps/website/client/src/lib/reorder.ts`) resolves an old family slug plus
  `variantName` to the current SKU and warns the customer when the exact size no longer exists.

---

## 7. Canonical menu API

`GET /api/v1/menu/catalog` is the single catalog contract for all channels.
`meta.contract` is `canonical-single-price-v1`.

```jsonc
{
  "categories": [
    {
      "id": "…",
      "name": "Signature Pizza",
      "items": [
        {
          "productGroupSlug": "tele-special",
          "name": "Tele Special",
          "options": [
            {
              "id": "…",
              "name": "Tele Special — 6 inch Small",
              "sizeLabel": "6 inch Small",
              "price": 620,
              "available": true
            }
          ]
        }
      ]
    }
  ],
  "skus": [ /* flat list of the same SKUs, for search and POS */ ],
  "toppings": [ /* internal SKUs for the customizer / Admin / POS */ ]
}
```

The grouping is presentation only. Every option is a real sellable SKU with one price.
`menu_item_variants` is neither read nor exposed.

### Admin surface

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/admin/menu/categories` | `menu.read` |
| POST | `/api/v1/admin/menu/categories` | `menu.write` |
| PATCH | `/api/v1/admin/menu/categories/:id` | `menu.write` |
| GET | `/api/v1/admin/menu/products` | `menu.read` |
| POST | `/api/v1/admin/menu/products` | `menu.write` |
| PATCH | `/api/v1/admin/menu/products/:id` | `menu.write` |
| GET | `/api/v1/admin/menu/audit` | `menu.read` |

Bodies are `.strict()`; a `variants` payload is rejected with `400 VALIDATION_ERROR`.

---

## 8. Admin price-management workflow

1. Open **Admin → Menu Management**. Each grid card is one sellable SKU.
2. Select a card to open the drawer. The drawer shows the SKU's family siblings, each with its own
   price, so the owner can move between sizes without a price matrix.
3. Edit the single **Price (PKR)** field and/or the **Available to order** checkbox, then save.
4. The server validates `menu.write`, applies the change, and appends a `menu_audit_events` row.
5. The drawer's **Change history** section reloads from `/admin/menu/audit`.

Audit rows record actor, resource id, action (`item.price_change` when the price moved),
before/after price and availability, scope (`global`), and timestamp.

---

## 9. Global versus branch pricing

Current Founder decision: **one canonical global menu**. Every branch sees the same catalog, the
same SKU ids, the same prices, the same grouping, and the same modifier definitions. Northern
Bypass remains coming-soon and inherits the canonical menu for setup and readiness only.

`branch_menu_item_overrides (branch_id, menu_item_id, price_override, availability_override)`
exists but is **inactive by design**. No runtime path reads it. The effective price is always
`menu_items.price`. Enabling branch price divergence requires separate Founder authorization.

---

## 10. Deprecation of `menu_item_variants`

`menu_item_variants` is **deprecated, not dropped**.

- It is not a pricing source and is not exposed by any API.
- No new rows should be inserted.
- Every row maps to a sellable SKU in `menu_variant_sku_mappings`.

It may be dropped only after **all** of the following hold:

1. All production references are migrated.
2. All code references are removed.
3. All tests pass.
4. Rollback is documented.
5. Production verification is complete.

---

## 11. Rollback

The migration is additive, so rollback does not require restoring data:

- `menu_item_variants` is untouched — the previous pricing model is intact.
- `menu_items.base_price` is retained.
- `order_items` rows are unchanged.

To roll back, revert the application code to the previous release. The database can keep the new
columns and tables safely because nothing else reads them.

Reverting the SKU **split itself** (re-collapsing new SKU rows into their families) is a separate,
manual operation: the added SKU rows are identifiable by joining `menu_variant_sku_mappings` where
`new_menu_item_id` is not the family's original id. Do not attempt it while orders reference
those SKUs.

---

## 12. Production data apply plan (NOT EXECUTED)

Not authorized in this pass. When authorized:

1. Take a full production dump (`schema` + `data`), stored as release evidence.
2. Restore the dump into a scratch database and apply the migration there first.
3. Verify with the SQL in §13; every assertion must return the expected value.
4. Apply the migration to production inside a maintenance window.
5. Re-run §13 verification against production and attach the output as acceptance evidence.
6. Deploy the application release that reads `menu_items.price`.
7. Keep `menu_item_variants` in place; schedule its removal as a separate authorized slice.

---

## 13. Verification SQL

```sql
select count(*)                            from menu_categories where is_active;
select count(*)                            from menu_items;                          -- sellable SKUs
select count(distinct product_group_slug)  from menu_items;                          -- product families
select count(*)                            from menu_items where price is null;      -- must be 0
select count(*)                            from menu_items where price < 0;          -- must be 0
select count(*) from (select slug from menu_items group by slug having count(*) > 1) d;  -- must be 0
select count(*)                            from menu_variant_sku_mappings;           -- one per legacy variant
select count(*) from menu_item_variants v
  left join menu_variant_sku_mappings m on m.old_variant_id = v.id
  where m.old_variant_id is null;                                                    -- must be 0
```

---

## 14. Local verified counts (scratch database, production-shaped)

Measured after applying the migration twice to `menu_canon`:

| Metric | Count |
| --- | --- |
| Categories (active) | 27 |
| Browse categories (excluding `toppings`) | 26 |
| Sellable SKUs (all) | 157 |
| Available SKUs | 156 |
| Browse SKUs (non-topping) | 149 |
| Topping SKUs | 7 |
| Product families | 129 |
| Sized SKUs (`size_label` present) | 43 |
| Legacy variants | 43 |
| Variant → SKU mappings | 43 |
| Modifier groups | 8 |
| Modifier options | 27 |
| Item ↔ modifier-group links | 259 |
| SKUs without one non-negative price | 0 |
| Duplicate SKU slugs | 0 |

These are local scratch-database figures. **Production counts are unverified in this pass.**
