# DATABASE SCHEMA SUMMARY — v1.2.0

**Exported:** 2026-07-15  
**Supabase project:** `pyeowxvacgypohrbvgee`  
**Git SHA:** `697554a`  
**Note:** Release Phase did **not** mutate the database. Summary from migration inventory + Phase B/C production verification.

---

## Migration history (release-relevant)

| Timestamp | File | Role |
|---|---|---|
| 20260713190000 | `foundation_schema.sql` | Core tables, RLS, initial `product_type` check (no `topping`) |
| 20260713191000 | `seed_foundation_data.sql` | Seed data |
| 20260714100000 | `sync_verified_menu_catalog.sql` | Verified menu catalog sync |
| 20260714120000 | `grant_public_access.sql` | Role grants for API/PostgREST |
| 20260715120000 | `pizza_toppings_catalog.sql` | Sprint 2 toppings catalog (Phase B applied) |
| 20260715153000 | `option_b_toppings_catalog_repair.sql` | Idempotent Option B repair (Phase B applied) |

---

## Public tables (foundation)

| Table | Purpose |
|---|---|
| `users` | Identity |
| `roles` / `permissions` / `user_roles` / `role_permissions` | RBAC |
| `branches` | Branch master |
| `customers` | Customers |
| `menu_categories` | Menu categories (includes internal `toppings`) |
| `menu_items` | Menu SKUs (browse + topping SKUs) |
| `menu_item_variants` | Size/price variants |
| `orders` / `order_items` | Orders |
| `payments` | Payments |
| `riders` / `deliveries` | Delivery |
| `staff` | Staff |

---

## Menu model (Option B)

### `menu_categories`

- Unique `slug`
- Public browse = active rows where `slug <> 'toppings'` → **13** in production
- Internal org row: `slug = 'toppings'`, `sort_order = 130` (Admin/FK only)

### `menu_items`

- Unique `slug`
- `base_price numeric(12,2)` nullable
- `product_type` **v1.2.0 check includes** `'topping'`
- Allowed: `pizza`, `burger`, `sandwich`, `wings`, `fries`, `wrap`, `pasta`, `side`, `drink`, `deal`, **`topping`**
- Public browse items = available non-topping → **58**
- Topping SKUs (`product_type = 'topping'`) → **3**

### `menu_item_variants`

- Unique `(menu_item_id, label)`
- Topping size variants for chicken/cheese: Small/Medium/Large @ 50/100/150
- Extra Cheese Slice uses item `base_price = 60` (no size variants)

---

## Production row expectations (verified)

| Metric | Expected | Status |
|---|---:|---|
| Public categories (`slug <> toppings`) | 13 | PASS |
| Public browse items | 58 | PASS (API `itemCount`) |
| Topping SKUs | 3 | PASS |
| Chicken/Cheese size variants | 6 | PASS |
| Behari Kabab Pizza | slug `behari-kabab-pizza`, price 549, badge Starting Price, 0 variants | PASS |
| Total catalog variants (`meta.variantCount`) | 40 | PASS |
| Deals | 7 | PASS |

---

## Visibility contract

| Layer | Toppings category | Topping SKUs |
|---|---|---|
| Database | Present (`slug=toppings`) | Present |
| API `data.categories` / `data.items` | Excluded | Excluded |
| API `data.toppings` | n/a | Included |
| Public website Menu | Hidden | Hidden as cards; shown in pizza customizer |

---

## RLS / grants

- Foundation enables RLS with public read policies for menu tables.
- `grant_public_access` migration grants table privileges to `anon` / `authenticated` / `service_role`.
- Website Hybrid mode may read PostgREST directly; API filters remain the published contract for catalog shape.
