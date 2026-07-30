# Final Release Certification — Telepizza Admin ERP + Kitchen

**Status:** Release Candidate documentation  
**Date:** 2026-07-30  
**Branch:** `feature/final-launch-certification`  
**Opening target:** Royal Orchard — **14 August 2026**

---

## Purpose

This document certifies repository-evidence status of Admin ERP and Kitchen surfaces for the August 14 launch window.

Planning intent is not evidence. Only implemented APIs, migrations, UI wiring, and tests count.

---

## Module certification

| Module | Status | Evidence (summary) |
| --- | --- | --- |
| Dashboard (Owner Executive) | **LIVE** | Operations KPIs + low-stock; zero invented metrics |
| Menu | **LIVE** | Catalog read/write (prices, availability, categories) |
| POS | **LIVE** | Order create + Z-Report shift close |
| Kitchen | **LIVE** | Ticket board + **REQ-KIT-012** preparing → mapped recipe stock consume (atomic) |
| Inventory | **LIVE** | Items, ledger, **atomic** adjustments; GRN line stock posting |
| Purchasing | **LIVE** | Suppliers, POs, requisitions, GRN, PO approve/reject |
| Reports | **LIVE** | Sales analytics + CSV export |
| Settings | **LIVE** | Org/branch/delivery/hours/radius/fees writes |
| HR | **LIVE** | Employee directory (+ staff assignments baseline) |
| Loyalty | **LIVE** | Accounts list + earn (1 pt / 100 PKR on completed orders) |
| Marketing | **LIVE** | Coupons list/create (`/admin/marketing`) |

Kitchen stock consume requires rows in `menu_item_inventory_components`. Unmapped menu items do not block preparing. Insufficient mapped stock fails preparing with `Insufficient stock for [Item]`.

---

## Remaining Coming Soon (honest gaps)

| Item | Notes |
| --- | --- |
| AI runtime / agent execution | AI platform foundation tables/APIs exist; **no production runtime loop** |
| Rewards Catalog | Loyalty points ledger is LIVE; **reward publish/redeem catalogue Coming Soon** |
| Advanced matching (PO ↔ GRN ↔ invoice) | GRN stock posting LIVE for mapped lines; **three-way invoice matching Coming Soon** |
| Coupon quote/checkout enforcement | Coupon master CRUD LIVE; **cart/quote validation Coming Soon** |
| HR update/deactivate lifecycle | Directory LIVE; full employee lifecycle APIs still thin |
| Z-Report float / counted cash variance | Expected cash = paid cash sales only |
| Northern Bypass | Remains `coming-soon` |

---

## Migrations introduced in this certification slice

| Version | Purpose |
| --- | --- |
| `20260730220000` | Atomic inventory adjust + GRN stock posting (prerequisite on branch) |
| `20260730230000` | Kitchen recipe mapping + `kitchen_ticket_set_preparing_atomic` |
| `20260730240000` | Loyalty foundation (`loyalty_accounts`, `loyalty_transactions`) |
| `20260730250000` | Coupons foundation |

> Timestamps `20260730210000` / `20260730220000` were already used (POS Z-Report / atomic inventory). Loyalty and coupons therefore use `…240000` / `…250000` to avoid migration collisions.

**Production action required before go-live:**

```bash
npx supabase db push --linked
```

Confirm Local = Remote through `20260730250000`.

---

## Verification gates (this branch)

| Gate | Required result |
| --- | --- |
| `pnpm check` | 0 errors |
| `pnpm test` | 0 failures |
| Kitchen insufficient stock | Status `409`, message `Insufficient stock for [Item]` |
| Loyalty earn | Idempotent per order; floor(total/100) points |
| Coupons | GET/POST `/api/v1/admin/marketing/coupons` |

---

## Non-claims

This certification does **not** claim:

- Restaurant operational readiness for 14 August (devices, SOPs, rehearsals, Founder GO/NO-GO remain Owner Decision Queue items)
- Automatic recipe seeding for all menu SKUs
- Live payment provider production cutover
- Northern Bypass activation

---

## Sign-off checklist

- [ ] `pnpm check` / `pnpm test` green on branch
- [ ] Production migrations pushed through `20260730250000`
- [ ] Sample `menu_item_inventory_components` mapped for Royal Orchard critical SKUs
- [ ] Founder / Chief Architect review of Coming Soon list (no overstatement)
- [ ] Merge + deploy website + API

---

## Summary

Admin ERP core modules and Kitchen are **LIVE with documented gaps**. Remaining work for launch honesty is recipe mapping data entry, production migration apply, and Owner Decision Queue items — not inventing Rewards Catalog, AI runtime, or invoice matching.
