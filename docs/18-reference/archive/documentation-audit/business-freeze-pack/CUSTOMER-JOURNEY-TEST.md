# Customer Journey Test Plan

**Pack:** Telepizza V1 Business Freeze Pack  
**Date:** 2026-07-14  
**Prerequisite:** Menu workbook + catalog frozen; branding claims resolved.  
**Environments:** Local (`pnpm dev:website`) + Production (Vercel)

---

## Journey map

```text
Home → Menu → Customize → Cart → Checkout → WhatsApp → Order → Confirmation
```

| Step | Route / component | Success criteria |
|---|---|---|
| 1 Home | `/` | Featured items match frozen catalog; branch + hours correct |
| 2 Menu | `/menu` | All V1 categories; prices = PRODUCT-CATALOG |
| 3 Customize | `PizzaCustomizerDialog` | Variants, addons, totals correct |
| 4 Cart | Cart drawer | Line items, qty, subtotal accurate |
| 5 Checkout | Checkout form | Branch, name, address, phone validation |
| 6 WhatsApp | `wa.me` link | Message readable; all items + prices |
| 7 Order | Staff-readable | Kitchen can fulfill from message alone |
| 8 Confirmation | Post-submit UX | Clear next steps; no dead ends |

---

## Device matrix

| ID | Device | Viewport | Browser | Tester | Date | Result |
|---|---|---|---|---|---|---|
| DT-01 | Desktop | 1280×800 | Chrome | | | ⬜ |
| DT-02 | Desktop | 1920×1080 | Chrome | | | ⬜ |
| TB-01 | Tablet | 768×1024 | Safari / Chrome | | | ⬜ |
| MB-01 | Mobile | 375×667 | Safari iOS | | | ⬜ |
| MB-02 | Mobile | 390×844 | Chrome Android | | | ⬜ |

---

## Test cases

### TC-01 Home

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 1.1 | Load `/` | Hero, branch selector, hours visible | ⬜ | ⬜ | ⬜ |
| 1.2 | Featured deals | Prices match catalog | ⬜ | ⬜ | ⬜ |
| 1.3 | Navigate to Menu | Link works | ⬜ | ⬜ | ⬜ |
| 1.4 | Catalog source | Live Supabase OR documented fallback | ⬜ | ⬜ | ⬜ |
| 1.5 | No stale prices | Spot-check 5 items vs workbook | ⬜ | ⬜ | ⬜ |

### TC-02 Menu browse

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 2.1 | All V1 categories visible | Count = frozen set | ⬜ | ⬜ | ⬜ |
| 2.2 | Category filter | Items filter correctly | ⬜ | ⬜ | ⬜ |
| 2.3 | Search by name | Returns correct item | ⬜ | ⬜ | ⬜ |
| 2.4 | Item card price | Matches catalog base or "from" variant | ⬜ | ⬜ | ⬜ |
| 2.5 | Missing category | No telebar if BFR-007 = defer | ⬜ | ⬜ | ⬜ |
| 2.6 | Supabase banner | No error banner when live load fixed | ⬜ | ⬜ | ⬜ |

### TC-03 Customize

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 3.1 | Open pizza customizer | Variants S/M/L with 10" label if BFR-005 | ⬜ | ⬜ | ⬜ |
| 3.2 | Select each variant | Price updates | ⬜ | ⬜ | ⬜ |
| 3.3 | Add toppings | Addon prices per BFR-012 | ⬜ | ⬜ | ⬜ |
| 3.4 | Specialty M/L pizza | Crown / Chicago prices correct | ⬜ | ⬜ | ⬜ |
| 3.5 | Single-price item | Burger, pasta — no broken dialog | ⬜ | ⬜ | ⬜ |
| 3.6 | Deal item | Bundle description matches catalog | ⬜ | ⬜ | ⬜ |

### TC-04 Cart

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 4.1 | Add item | Appears with name + variant + price | ⬜ | ⬜ | ⬜ |
| 4.2 | Change quantity | Total recalculates | ⬜ | ⬜ | ⬜ |
| 4.3 | Remove item | Line removed | ⬜ | ⬜ | ⬜ |
| 4.4 | Multiple items | Subtotal = sum of lines | ⬜ | ⬜ | ⬜ |
| 4.5 | Persist refresh | Cart survives reload (if designed) | ⬜ | ⬜ | ⬜ |
| 4.6 | Zinger in deal | Message reflects deal price not phantom SKU | ⬜ | ⬜ | ⬜ |

### TC-05 Checkout

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 5.1 | Open checkout | Form fields visible | ⬜ | ⬜ | ⬜ |
| 5.2 | Branch selection | Royal Orchard / Coming Soon rules | ⬜ | ⬜ | ⬜ |
| 5.3 | Required fields | Validation messages | ⬜ | ⬜ | ⬜ |
| 5.4 | Phone format | Accepts 0304-1110495 style | ⬜ | ⬜ | ⬜ |
| 5.5 | Empty cart guard | Cannot checkout empty | ⬜ | ⬜ | ⬜ |

### TC-06 WhatsApp

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 6.1 | Tap order on WhatsApp | Opens `wa.me/923041110495` (or configured) | ⬜ | ⬜ | ⬜ |
| 6.2 | Message body | Branch, items, variants, total in PKR | ⬜ | ⬜ | ⬜ |
| 6.3 | Special chars | Urdu / emoji if used — no corruption | ⬜ | ⬜ | ⬜ |
| 6.4 | Deal line items | Readable bundle description | ⬜ | ⬜ | ⬜ |

### TC-07 Order fulfillment (manual)

| # | Action | Expected | Result |
|---|---|---|---|
| 7.1 | Staff reads WA message | Can identify every SKU | ⬜ |
| 7.2 | Prices match kitchen expectation | No surprise totals | ⬜ |
| 7.3 | Variant sizes clear | 10" not ambiguous | ⬜ |

### TC-08 Confirmation UX

| # | Action | Expected | Desktop | Tablet | Mobile |
|---|---|---|---|---|---|
| 8.1 | After WA handoff | User sees confirmation / instructions | ⬜ | ⬜ | ⬜ |
| 8.2 | Return to menu | Can add more items | ⬜ | ⬜ | ⬜ |

---

## Regression spot-check list (20 SKUs)

Test on **mobile** after every catalog change:

| SKU | Category | Check price | Pass |
|---|---|---|---|
| tele-special | Signature | S/M/L | ⬜ |
| tikka | Classic | S/M/L | ⬜ |
| crown-crust | Specialty | M/L | ⬜ |
| quarter-broast | Broast | single | ⬜ |
| patty-burger | Burgers | single | ⬜ |
| zinger-burger | Burgers | *if added* | ⬜ |
| crunchy-sandwich | Sandwich | single | ⬜ |
| fried-crispy-wings | Wings | single | ⬜ |
| loaded-fries | Fries | single | ⬜ |
| behari-roll | Wraps | single | ⬜ |
| crunchy-pasta | Pasta | single | ⬜ |
| family-festival | Deals | bundle | ⬜ |
| drink-1-5l | Drinks | single | ⬜ |
| malai-boti | Specialty | *if added* | ⬜ |
| smokehouse-burger | Grill | *if added* | ⬜ |

---

## Known defects (test until fixed)

| Defect | Impact on journey | Fix phase |
|---|---|---|
| Supabase catalog fetch fails | Menu shows fallback banner | Post-freeze tech |
| Home imports static menu directly | Featured prices may drift from live | Post-freeze tech |
| Zinger absent but in deals | WA message ambiguity | BFR-002 |
| 53 stale prices | Wrong totals | Workbook UPDATE |

---

## Journey gate (G6)

**Pass criteria:**

- [ ] 100% of test cases ⬜ → ✅ on MB-01 (primary mobile)
- [ ] 100% on DT-01 (desktop)
- [ ] 100% on TB-01 (tablet)
- [ ] 20-SKU spot-check all pass
- [ ] Zero 🔴 known defects open

**QA lead:** _________________ **Date:** _________

---

*Execute after [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md) freeze status = LOCKED for all V1 SKUs.*
