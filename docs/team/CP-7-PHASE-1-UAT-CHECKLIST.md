# CP-7 — Phase 1 Customer Platform UAT Checklist

**Product:** Telepizza Pakistan · Powered by Mianx.ai  
**Date:** 2026-07-19  
**Branch:** `polish/my-telepizza-ux`  
**Gate:** Phase 1 Production Ready close (after merge + migrate + this UAT)  
**Out of scope for this UAT:** Live SMTP (CP-3 Owner-blocked), JazzCash/EasyPaisa, OTP, loyalty ledger, rider GPS, Phase 2 ERP

---

## Preconditions

- [ ] Closeout PR merged (or staging build from closeout commit)
- [ ] Migrations applied in target env:
  - `20260719090000_customer_addresses.sql`
  - `20260719100000_customer_favorites.sql`
  - `20260719110000_order_reviews.sql`
- [ ] API `SUPABASE_*` + grants healthy (`/readyz` 200)
- [ ] Website pointed at that API
- [ ] Test accounts: guest browser + one authenticated customer

---

## A. Guest COD path (Tier A)

| # | Step | Pass? | Notes |
|---|---|---|---|
| A1 | Home → Menu → add pizza with modifiers → Cart | | |
| A2 | Checkout as guest, Multan delivery, COD | | |
| A3 | Order success screen shows real order number | | |
| A4 | Track order with order number + phone | | |
| A5 | WhatsApp support number shown is `0304-1110495` (not OTP) | | |

---

## B. Auth account book

| # | Step | Pass? | Notes |
|---|---|---|---|
| B1 | Sign in → My Telepizza loads Dashboard | | |
| B2 | Addresses: create Home address with recipient + phone | | |
| B3 | New browser / clear site data → sign in → address still present (cloud) | | |
| B4 | Import banner one-time if device drafts exist; not looping | | |
| B5 | Checkout signed-in lists cloud addresses; default preselected | | |
| B6 | Place COD order while signed in | | |

---

## C. Orders / reorder / reviews

| # | Step | Pass? | Notes |
|---|---|---|---|
| C1 | `/orders` shows account history (paginated if >20) | | |
| C2 | Load more appends without wiping prior page | | |
| C3 | Hub Orders preview matches cloud history when API up | | |
| C4 | Reorder pulls line items (detail fetch if list empty) | | |
| C5 | Completed order: create review (1–5 + comment) | | |
| C6 | Edit own review; cannot review another user’s order | | |
| C7 | Track link from hub/orders works | | |

---

## D. Favorites / search / settings

| # | Step | Pass? | Notes |
|---|---|---|---|
| D1 | Heart on Menu card + Product Detail; toggle persists after reload | | |
| D2 | `/favorites` lists hearts; remove works | | |
| D3 | Menu search: keyboard, clear filters returns focus, empty uses debounce | | |
| D4 | Category chip announces pressed state (a11y) | | |
| D5 | `/settings` profile/password/prefs/privacy honesty (delete via support) | | |
| D6 | Notification prefs save locally; UI does not claim live email unless SMTP live | | |

---

## E. Honesty / non-goals

| # | Check | Pass? |
|---|---|---|
| E1 | No fake JazzCash/EasyPaisa success | |
| E2 | No fake loyalty balance | |
| E3 | No live rider GPS map | |
| E4 | Notifications page does not claim automated SMTP while CP-3 blocked | |
| E5 | Order create still succeeds if local notify push fails | |

---

## Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| QA | | | PASS / FAIL |
| Owner | | | PASS / FAIL — unlocks Phase 2 ERP only on PASS |

**Fail policy:** Any B/C FAIL blocks Production Ready. A FAIL blocks Tier A pilot. D FAIL = polish reopen. E FAIL = honesty reopen (must fix before marketing claims).

**CP-3 deferral:** Live transactional email remains Owner-blocked until Support Email, Reply-To, Verified Domain, and Provider Account Name are real operational values in `docs/team/CP-0-OWNER-DECISION-PACK.md`.
