# API CONTRACT EXPORT — v1.2.0

**Exported:** 2026-07-15  
**Runtime base:** `https://telepizza-api.onrender.com`  
**Git SHA:** `697554a`  
**Source of truth:** live production + `backend/api/src/modules/*`

---

## Envelope

Successful JSON responses use:

```json
{ "ok": true, "data": {}, "meta": {} }
```

Errors use the shared API error shape (`code`, `message`, status).

---

## System

| Method | Path | Auth | Status (prod) | Notes |
|---|---|---|---|---|
| GET | `/healthz` | none | 200 | Liveness |
| GET | `/readyz` | none | 200 | Readiness; fails when Supabase env missing |
| GET | `/api/v1/meta/modules` | none | 200 | Module list from `apiModules` |

---

## Menu (Sprint 2 contract change)

### `GET /api/v1/menu/catalog`

**Auth:** none (public)  
**Production:** 200  

**Response `data`:**

| Field | Type | Rule |
|---|---|---|
| `categories` | `MenuCatalogCategory[]` | Public browse only — **excludes** internal `toppings` category |
| `items` | `MenuCatalogItem[]` | Public browse only — **excludes** `productType: "topping"` |
| `toppings` | `MenuCatalogItem[]` | Shared topping SKUs for customizer / Admin / POS — **not** browse cards |

**Response `meta` (v1.2.0):**

| Field | Prod value | Meaning |
|---|---:|---|
| `source` | `"supabase"` | Data origin |
| `module` | `"menu"` | Module id |
| `categoryCount` | 13 | `categories.length` |
| `itemCount` | 58 | `items.length` |
| `toppingCount` | 3 | `toppings.length` |
| `variantCount` | 40 | Sum of variants on items **and** toppings |
| `dealCount` | 7 | Items with `productType === "deal"` |

**`MenuCatalogItem` fields:**

```text
id, slug, name, category, categorySlug, description, image,
badge?, price?, productType, featured, variants?
```

**`MenuCatalogVariant` fields:**

```text
id, label, price, sizeCode?, isDefault
```

**`productType` values (public items):**  
`pizza` | `burger` | `sandwich` | `wings` | `fries` | `wrap` | `pasta` | `side` | `drink` | `deal`

**Topping `productType`:** `topping` (only in `data.toppings`)

---

## Branches

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/branches` | none | Live list; prod count = 2 |
| POST | `/api/v1/branches/resolve` | none | **Not implemented** (501-style stub) |

Body for resolve (validated, not executed): `{ latitude, longitude }`

---

## Orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/orders` | none* | Create order |
| GET | `/api/v1/orders/:orderNumber/tracking` | none* | Requires `?phone=` |

\* No customer JWT required in v1.2.0; Sprint 3 auth not in force.

**Create body (zod):**

```text
branchCode, customerId?, orderType(delivery|pickup|dine-in),
orderSource(website|whatsapp|mobile|pos|admin),
contactName, contactPhone, deliveryAddress?, notes?, couponCode?,
items[]: {
  menuItemSlug, variantLabel?, quantity, unitPrice,
  productName, variantName?, instructions?,
  extras[]?: { label, price }
}
```

Toppings on website orders map to **extras / modifier lines**, not separate top-level menu products.

---

## Auth / Admin / Riders (pre-Sprint 3 stubs)

| Module | Base path | v1.2.0 status |
|---|---|---|
| auth | `/api/v1/auth` | Login/refresh routes exist; **Sprint 3 not started** |
| riders | `/api/v1/riders` | Role-gated stubs |
| admin | `/api/v1/admin` | Role-gated stubs |

These are **not** part of the Sprint 2 customer release surface.

---

## Breaking / additive changes vs pre-Sprint 2

| Change | Kind |
|---|---|
| `data.toppings` added | **Additive** |
| `meta.toppingCount` / `variantCount` / `dealCount` added | **Additive** |
| Public `items` never include topping SKUs | Contract clarification |
| Public `categories` never include `toppings` | Contract clarification |

Clients that only read `categories` + `items` remain compatible.  
Clients that need customizer prices **must** read `data.toppings`.

---

## Verification command

```bash
node scripts/verify-production-api.mjs https://telepizza-api.onrender.com
curl -s https://telepizza-api.onrender.com/api/v1/menu/catalog
```
