# Customer Ordering System

**Branch:** `feature/customer-ordering-system`  
**Base:** latest `origin/main` (`f8945b5` when branched)  
**Scope:** customer-facing ordering UX only  
**Recommendation:** **BLOCKED for production rollout pending visual/browser and live API QA; ready for code review**

## Audit and architecture reused

The implementation was audited before changes. The existing customer ordering stack was retained:

- `MenuCatalogContext` supplies API catalog data with the frozen bundled catalog as fallback.
- `PizzaCustomizerContext`, `CartContext`, and the existing topping resolver remain the ordering state and customization foundation.
- `BranchContext` remains the branch source; no branch, Kitchen, Rider, POS, or Admin behavior changed.
- Checkout continues to use `POST /orders/quote`, then `POST /orders` with the signed quote, idempotency key, normalized phone, selected branch, and optional authenticated bearer token.
- Checkout only clears the cart and routes to success after an API-created order.
- The existing tracking and cancellation APIs remain unchanged.
- Account Center's device-local address book is reused. No address table or backend persistence was added.
- API-created orders continue to be cached device-locally for My Orders. Tracking refreshes update that cached status.
- The frozen order enum remains `pending → confirmed → preparing → ready → dispatched → completed`, with `cancelled` handled as a terminal path.
- Server quote totals remain authoritative. Cart values are display estimates only.

### Audit gaps resolved

- Product customization existed only in a pizza dialog and had no quantity control or reusable product-detail view.
- Cart coupon copy implied unsupported branch verification.
- WhatsApp destinations were derived from branch phones instead of the locked ordering number.
- Checkout did not visibly expose delivery/pickup choice or the actual COD/pay-on-collection payment experience.
- Confirmation lacked payment-method wording and complete next actions.
- Tracking had a basic grid, no safe polling/manual refresh, weak cancelled treatment, and no explicit no-GPS wording.
- API order history snapshots used client-calculated totals rather than returned server totals.

## Modules shipped

### Product detail and customization

- Added `/menu/:productId` using the existing catalog.
- Added a reusable `ProductConfigurator` shared by product detail and pizza dialog.
- Uses only the catalog image. A one-image gallery is shown when only one image exists.
- Supports description, variants, quantity (1–20), optional notes, catalog-backed pizza toppings, drinks, and fries.
- Includes accessible pressed states, labels, quantity controls, focus styles, and responsive layouts.
- Final pricing copy explicitly states that checkout verifies prices on the server.

### Cart

- Preserved update, remove, clear, and subtotal behavior.
- Added dialog semantics and accessible names for close, quantity, and remove controls.
- Taxes and delivery fees are described as server-quote values calculated at checkout.
- Promo input is honestly disabled as coming soon.
- WhatsApp always uses locked ordering number `0304-1110495`.

### Checkout

- Preserved quote sequencing, expiry handling, idempotency rotation, phone normalization, authenticated bearer attachment, branch selection, and API-only success.
- Reuses signed-in customer profile and device-local saved addresses.
- Added an accessible delivery/pickup selector.
- Shows the only supported payment experience: cash on delivery or payment on collection. No online gateway behavior was invented.
- Server quote line items and totals remain canonical.
- Promo redemption is disabled with honest customer copy.

### Order confirmation

- Shows API order reference, status, returned total, branch, and payment method when order type is available.
- Does not claim a payment status because the current customer API does not return one.
- Does not invent ETA. It states that branch timing is confirmed after review.
- Added Track Order, locked-number WhatsApp, Order History, and Back to Menu actions.

### My Orders

- Existing Active, Completed, and Cancelled tabs remain in use.
- Cards continue to show real device-local order snapshots only: status, branch, date, items, total, reorder eligibility, and tracking.
- API-created snapshots now store API-returned subtotal, total, and creation timestamp.
- Successful tracking/cancellation refreshes update the matching device-local status.

### Live tracking UI

- Uses the existing tracking API and exact frozen statuses.
- Completed is customer-labelled `Delivered / collected` without changing the enum.
- Adds an accessible progress list, clear cancelled path, manual refresh, and 30-second polling only for active remote orders.
- Polling stops for completed/cancelled orders and never overlaps with backend redesign.
- Explicitly states that no driver location is available.

## Files changed

### Customer website

- `apps/website/client/src/App.tsx`
- `apps/website/client/src/components/CartDrawer.tsx`
- `apps/website/client/src/components/menu/PizzaCustomizerDialog.tsx`
- `apps/website/client/src/components/menu/ProductCard.tsx`
- `apps/website/client/src/components/menu/ProductConfigurator.tsx`
- `apps/website/client/src/lib/checkout-order.ts`
- `apps/website/client/src/lib/customer-store.ts`
- `apps/website/client/src/lib/submit-order.ts`
- `apps/website/client/src/pages/Checkout.tsx`
- `apps/website/client/src/pages/Menu.tsx`
- `apps/website/client/src/pages/OrderSuccess.tsx`
- `apps/website/client/src/pages/ProductDetail.tsx`
- `apps/website/client/src/pages/TrackOrder.tsx`

### Tests and evidence

- `tests/website/customer-ordering-system.test.mjs`
- `_documentation-audit/evidence/customer-ordering-system/README.md`
- `_documentation-audit/reports/CUSTOMER-ORDERING-SYSTEM.md`

## API, schema, catalog, and auth invariants

- No migrations or schema changes.
- No backend route or service changes.
- No auth flow, session, role, RLS, or public registration changes.
- No Kitchen, Rider, POS, Admin, or staff functionality.
- No catalog/menu/pricing content changes.
- Frozen catalog counts remain covered by the existing regression suite.
- No client-created taxes, delivery fees, discounts, payment statuses, ETA, driver data, or statuses.
- Quote and create still use the same cart lines; server pricing is authoritative.
- The locked WhatsApp ordering number is centralized through `BRAND.phone`.

## UX, accessibility, and responsive results

- Product, cart, checkout, confirmation, and tracking layouts use existing responsive grid/flex primitives.
- Interactive customizer choices expose pressed/checked states.
- Quantity and destructive cart controls have accessible names.
- Cart exposes modal dialog semantics.
- Checkout fields include labels, relevant autocomplete/input modes, and assertive error announcements.
- Tracking uses an ordered progress list with `aria-current="step"`.
- Long product/order areas use wrapping or scrolling rather than fixed-width content.
- Type-check and production build pass. Automated screenshot-based overflow verification remains blocked as described below.

## Screenshot evidence

Evidence blocker and required viewport matrix:

- `_documentation-audit/evidence/customer-ordering-system/README.md`

No screenshots were fabricated. Cursor browser automation had no available tab and could not create one; the local Playwright CLI was also unavailable. Desktop `1440 × 900` and mobile `390 × 844` captures are still required for product detail, cart, checkout, confirmation, history, and tracking. Authenticated and order-specific screens must use safely created real data.

## Validation

- `pnpm check` — **PASS** (website and backend TypeScript).
- `pnpm build` — **EXPECTED ROOT-SCRIPT FAILURE**: `Command "build" not found`.
- `pnpm build:website` — **PASS**. Vite emitted the existing large-chunk advisory (`959.52 kB`, `278.38 kB` gzip).
- Focused ordering suite — **PASS**, 29/29.
- `pnpm test:db` — **PASS**, 124/124.
- `pnpm test` — **PASS**: static/database/menu/website 124/124; backend 127/127 across 16 files.
- `git diff --check` — **PASS**.
- Browser automation — **BLOCKED**, exact evidence in the screenshot README.

## Known limitations

- Promo redemption is not implemented by the current pricing policy; UI is disabled.
- Customer APIs do not return payment method/status, so checkout shows the locked COD/pay-on-collection experience and confirmation only repeats the selected method.
- Tax, delivery fee, and discount are displayed only from the quote; current server policy may return zero.
- No ETA, driver identity, map, or live GPS exists.
- Saved addresses and My Orders are device-local. There is no customer address table or authenticated order-list endpoint.
- My Orders reflects remote status after the customer opens tracking/refreshes that order.
- Cart itself is in-memory and is not persisted across a full page reload.
- Only one catalog image exists per item, so the gallery does not fabricate additional media.
- Visual viewport QA and real quote/create/track screenshot evidence remain outstanding.

## Production rollout plan

1. Review this PR without merging.
2. Run the website against a staging/local API and existing Supabase data.
3. Verify quote/create idempotency and server totals for delivery and pickup.
4. Create a safe test order and capture the required desktop/mobile evidence.
5. Verify pending through terminal status rendering plus cancellation with existing operational tooling; do not add customer-only fake transitions.
6. Confirm keyboard navigation, focus visibility, 200% zoom, and no horizontal overflow at the evidence viewports.
7. Re-run `pnpm check`, `pnpm test`, `pnpm build:website`, and `git diff --check`.
8. Obtain product/operations approval for COD copy and locked WhatsApp handoff.
9. Only then change recommendation from BLOCKED to PASS and schedule a normal website-only deployment.

## Recommendation

**BLOCKED for production rollout** because browser screenshots, responsive visual QA, and a live API quote/create/track pass could not be completed in this environment. The code is suitable for PR review: static/type/build coverage passes, backend/schema/auth/catalog boundaries are preserved, and unsupported capabilities are represented honestly.
