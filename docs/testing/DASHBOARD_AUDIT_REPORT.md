# Dashboard Audit Report — Owner Handover Readiness

> Generated: 2026-07-30  
> Branch: `feature/final-dashboard-audit`  
> Scope: Telepizza Admin ERP (`apps/website/client/src/pages/admin` + related admin components)  
> Rule: Zero fake data. Tags reflect repository evidence only.

---

## Executive verdict

**Owner Handover status: READY WITH PHASE 2 BACKLOG**

Core restaurant operations (orders, POS, kitchen, delivery, menu, inventory ledger, purchasing with three-way matching, finance GL, reports CSV, settings, staff/opening) are **LIVE**. Remaining gaps are explicitly labeled **Planned for Phase 2** (or hidden) — not presented as broken MISSING features.

Three-way matching (PO total ↔ posted GRN ↔ invoice amount) is **LIVE** on invoice create (`matching_status`).

---

## Phase 1 — Incomplete tag scan (summary)

Searched admin pages/components for `Coming Soon`, `MISSING`, `FOUNDATION`, `Not available`.

| Area | Pre-audit finding | API exists? | Disposition |
| --- | --- | --- | --- |
| Purchasing three-way matching | Was MISSING historically | Yes — invoice create matching | Already LIVE (PR #138) |
| Inventory Receive / Received today | Coming Soon | Yes — Purchasing GRN + movements | **Wired** |
| Inventory Log waste / Waste today | Coming Soon | Yes — `movementType=waste` | **Wired** |
| Inventory Stock value | Coming Soon / unavailable | Partial — `cost_price × qty` | **Wired (DERIVED)** |
| Finance Outstanding payables | Coming Soon | Yes — supplier invoices | **Wired (operational AP)** |
| Finance Cash / AR / Tax / VAT | Coming Soon | No dedicated APIs | **Phase 2** |
| Marketing checkout validation | Coming Soon | Coupons master only | **Phase 2** |
| Loyalty rewards catalog | Coming Soon | Accounts + earn only | **Phase 2** |
| Menu import/export/bulk/nested tree/modifier edit | Coming Soon | Catalog CRUD only | **Phase 2** |
| Reports Excel/PDF/schedule | Coming Soon | CSV export only | **Phase 2** |
| HR attendance/leave/payroll | FOUNDATION | Employees only | **Phase 2** |
| Inventory transfers / recipe BOM | Coming Soon | No | **Phase 2** |
| Settings export / payment tax engines | Coming Soon | Partial env-managed | **Phase 2** |

---

## Phase 2 — Fixes applied this audit

### Wired to existing APIs
1. **Inventory KPIs** — Waste today / Received today from `stock_movements`; Stock value = Σ(`current_stock × cost_price`).
2. **Inventory waste form** — Posts `POST /admin/inventory/adjustments` with `movementType: "waste"`.
3. **Inventory receiving panel** — Points to LIVE Purchasing GRN (`/admin/purchasing`).
4. **Stock adjustments** — Movement type selector (`adjustment` | `receipt` | `waste`).
5. **Finance outstanding payables** — Loads `GET /admin/purchasing/invoices`; KPI + Payable panel show open invoices.
6. **Purchasing three-way matching** — Confirmed LIVE (`UNMATCHED` | `MATCHED` | `DISCREPANCY`).

### Cleaned for Owner presentation
- User-facing `Coming Soon` retagged to **Planned for Phase 2** (or removed/hidden) across Inventory, Finance, Menu, Reports, Loyalty, Marketing, Settings.
- Disabled dead filter checkboxes removed (Inventory advanced filters, Reports category/payment stubs).
- Inventory header actions: Receive (GRN) + Log waste (live); removed fake Export/Import/Transfer buttons.

---

## Module status matrix

| Module | Route | Status | Notes |
| --- | --- | --- | --- |
| Executive Dashboard | `/admin` | **LIVE** | Ops KPIs; some widgets foundation-scoped honestly |
| Opening / Owner handover | `/admin/opening*` | **LIVE** | Governance APIs present |
| Orders | `/admin/orders` | **LIVE** | |
| POS | `/admin/pos` | **LIVE** | Z-report live; draft/print Phase 2 |
| Kitchen | `/admin/kitchen` | **LIVE** | Item view/history foundation |
| Delivery | `/admin/delivery` | **LIVE** | |
| Floor / Tables / Reservations | `/admin/floor*` | **LIVE** | Setup required until tables seeded |
| Menu Management | `/admin/menu` | **LIVE** | Import/export/bulk/nested tree/modifier edit → Phase 2 |
| Inventory | `/admin/inventory` | **LIVE** | Transfers, recipe BOM, FIFO/WAC → Phase 2 |
| Purchasing & Suppliers | `/admin/purchasing` | **LIVE** | Includes three-way matching |
| Finance & Accounting | `/admin/finance` | **LIVE** | GL + TB + P&L; operational AP; cash/AR/VAT → Phase 2 |
| Reports / BI | `/admin/reports` | **LIVE** | Sales analytics + CSV; Excel/PDF → Phase 2 |
| CRM / Customers | `/admin/customers` | **LIVE** | VIP/blocked foundation where no API |
| Loyalty | `/admin/loyalty` | **LIVE** (ledger) | Rewards catalog → Phase 2 |
| Marketing / Coupons | `/admin/marketing` | **LIVE** (master) | Checkout validation → Phase 2 |
| HR / Workforce | `/admin/hr` | **LIVE** (directory) | Attendance/leave/payroll → Phase 2 |
| Settings | `/admin/settings` | **LIVE** | Export/tax engines → Phase 2 |
| WhatsApp Order Center | `/admin/whatsapp` | **LIVE** / partial | Per module honesty banner |
| AI Team | `/admin/ai-team` | **FOUNDATION** | Planned for Phase 2 autonomy |

---

## Phase 2 backlog (Owner-visible, not blocking ops)

1. Coupon quote/checkout enforcement  
2. Loyalty rewards burn catalog  
3. Menu import/export/bulk + nested categories + modifier editing  
4. Inventory branch transfers + recipe consumption engine + FIFO/WAC  
5. Finance cash/bank, AR aging, VAT returns, GL AP auto-post, COGS auto-post  
6. Reports Excel/PDF + scheduled delivery  
7. HR attendance, leave, shifts, payroll  
8. AI autonomous runtime  

---

## Verification

| Gate | Result |
| --- | --- |
| `pnpm check` | Required green before merge |
| `pnpm test` | Required green before merge |
| Three-way matching migration | Applied (`20260730280000_three_way_matching.sql`) |

---

## Authority note

This report reflects **repository evidence** after the audit commit. Planning docs do not override implemented capability. Items marked LIVE have exercised API/UI wiring; Phase 2 items must not be demonstrated as complete to the Owner.
