# Pre-Launch UX Audit — Admin ERP & Customer Website

**Date:** 2026-07-29  
**Scope:** A1 polish before 14 August launch  
**Method:** Repository code review of Save / loading / success toast patterns

---

## Summary

| Module | Save / primary action | Loading state | Success toast | Verdict |
| --- | --- | --- | --- | --- |
| Menu Management (price) | Explicit **Save Changes** (not auto-save) | Saving… on button | `Price updated successfully` | **PASS** |
| Menu Management (image) | Prominent **Upload Image** (JPG/PNG) | Uploading… | `Image uploaded successfully` | **PASS** (requires storage migration) |
| Settings — Organization | **Save** | Loading… / Saving… | `Organization settings saved` | **PASS** |
| Settings — Branch | **Save** (gated until profile matches selection) | Loading… / Saving… | `Branch profile saved` | **PASS** |
| Settings — Delivery | **Save** (gated until loaded branch matches) | Loading… / Saving… | `Delivery settings saved` | **PASS** |
| POS — Place Order | **Place Order** | Placing… | `Order {n} placed successfully` + cart cleared | **PASS** |
| Kitchen (KDS) | **Accept** / **Ready** (brand-red, min-h-12) | Updating… | Status toast on transition | **PASS** |
| Customer — Add to Cart | Add via catalog / customizer | N/A (instant) | `{name} added to cart!` | **PASS** |
| Customer — Checkout | **Place Order** | Spinner + disabled | `Order placed successfully` → success page | **PASS** |

---

## 1. Menu Management

**Evidence**
- `PricingPanel.tsx` — draft price + availability; writes only on **Save Changes**.
- `AdminMenu.tsx` — `saveSku` shows toast for price vs general saves; no blur auto-save.
- `ProductDrawer.tsx` — **Upload Image** button (`accept` JPG/PNG, 2 MB); posts to `POST /admin/menu/skus/:id/image`.
- Backend: `uploadSkuImage` → Supabase Storage bucket `menu-product-images` + audit `item.image_upload`.

**Ops note:** Apply migration `20260729220000_menu_product_images_storage.sql` (`supabase db push --linked`) before production image uploads succeed.

---

## 2. Settings (Organization / Branch / Delivery)

**Evidence**
- Live forms with explicit **Save**, `Saving…`, inline success timestamp, and Sonner toasts.
- Branch / Delivery clear stale form on switch; Save disabled until loaded id matches selection.

---

## 3. POS

**Evidence**
- `AdminPos.tsx` `placeOrder` — on success: toast, clear line items + quote, keep last order number for kitchen send / receipt.

---

## 4. Kitchen (KDS)

**Evidence**
- `KitchenCard` / `KitchenDetailsPanel` — primary actions use brand-red `min-h-12` buttons.
- Labels: **Accept**, **Start preparing**, **Ready**, **Complete handoff**.
- `AdminKitchen.tsx` / `AdminKitchenDashboard.tsx` — success/error toasts on status patch.

---

## 5. Customer Website

**Evidence**
- `CartContext` — `toast.success(\`${item.name} added to cart!\`)` on add.
- `Checkout.tsx` — Place Order shows `Loader2` while submitting; success toast then `/order-success/:orderNumber`.

---

## Gaps / follow-ups (honest)

1. **Image storage migration** must be applied on linked Supabase before owner uploads work in production.
2. Inventory / Finance Settings remain **UNAVAILABLE** (no fake Save) — intentional.
3. Kitchen station assignment still Foundation (label only) — out of this polish slice.
