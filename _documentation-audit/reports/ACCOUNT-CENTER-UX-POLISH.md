# Account Center UX Polish (post-PR #58)

**Date:** 2026-07-17
**Repository:** `D:\projects\telepizza`
**Branch:** `fix/account-center-ux-polish`
**Base:** latest `main` (PR #58 merged)
**Scope:** Customer Account Center + related Orders page copy only.
**Out of scope:** Sprint 4.6, Rider/Kitchen/Admin/POS, OTP, catalog/menu/pricing, auth architecture redesign, merge/deploy.

---

## Owner feedback implemented

| # | Area | Change |
|---|---|---|
| 1 | Overview | Customer-facing dashboard copy and real summaries for recent/active orders, saved addresses, email, phone, and Rewards. No fake metrics or device wording. |
| 2 | Profile | More consistent card spacing and honest green **Email ✓ Verified** / amber **Phone ⚠ Verification Pending** states. |
| 3 | Security | Live checklist for 8+ characters, uppercase, lowercase, number, and special character. Existing backend validation is unchanged. |
| 4 | Orders | “Recent Orders / You have N recent order(s)” copy, clearer empty states, menu CTA, and order-history CTA. |
| 5 | Addresses | Larger empty-state icon, improved spacing, and a primary **Add Address** CTA without changing address behavior. |
| 6 | Loyalty | Telepizza Rewards Coming Soon card for earning, redemption, birthday treats, and exclusive member offers. No fake points. |
| 7 | Notifications | Disabled Coming Soon preferences for Order Updates, Promotions, Delivery Alerts, and Special Offers. |
| 8 | Header | Name and email hierarchy plus honest email and phone verification badges with improved wrapping and spacing. |
| 9 | Responsive | Mobile navigation now wraps into a grid instead of horizontally scrolling; cards use responsive padding and `min-w-0`. |
| 10 | Accessibility | Visible keyboard focus, semantic buttons/navigation, ARIA labels and live regions, decorative icon hiding, and Escape-to-close for the address form. |
| 11 | Consistency | Standardized card padding, radius, subtle shadows, button treatments, typography, icon sizing, and status colors. |

---

## Verification run

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm check` | Pass |
| `pnpm test:db` (includes `tests/website/**`) | Pass — 119 tests |
| `pnpm build:website` | Pass |
| `git diff --check` | Pass |

---

## Responsive / browser evidence

Signed-out screenshots from PR #58 final QA remain under
`_documentation-audit/evidence/customer-account-center-final-qa/` (390 / 768 / 1280 / 1440).

This polish pass:

- Source review covers the required 320 / 375 / 390 / 768 / 1024 widths: the account navigation uses a two-column mobile grid, four columns at `sm`, and a vertical sidebar at `lg`; content cards wrap and use responsive padding with no page-level horizontal overflow.
- Browser capture was attempted against `http://localhost:3000/account`, but the browser service returned `No browser tab available`. No new screenshot is claimed; the existing signed-out evidence above is retained.
- Authenticated Account Center tabs still need owner/credentialed visual pass.

---

## Remaining limitations

1. Addresses and order history retain their existing browser-local storage behavior (not server-synced).
2. Phone OTP / notifications / loyalty earning remain intentionally unavailable.
3. Authenticated viewport screenshots not captured in this pass without a signed-in session.
4. No merge/deploy from this branch.

---

## Files touched

- `apps/website/client/src/pages/Account.tsx`
- `apps/website/client/src/pages/Orders.tsx`
- `tests/website/customer-auth-production.test.mjs`
- `_documentation-audit/reports/ACCOUNT-CENTER-UX-POLISH.md`
