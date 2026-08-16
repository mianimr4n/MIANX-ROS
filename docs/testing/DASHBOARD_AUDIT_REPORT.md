# Dashboard Audit Report — Owner Handover Readiness

> Generated: 2026-07-30 (initial audit)  
> **Reconciled: 2026-08-16 — Phase 12 COMPLETE (`v2.7.0`)**  
> Branch: `dashboard-status-refresh-v2.7.1` (refresh pass)  
> Scope: Telepizza Admin ERP (`apps/website/client/src/pages/admin` + related admin components)  
> Rule: Zero fake data. Tags reflect repository evidence only.

---

## Executive verdict

**Owner Handover status: PHASE 12 SHIPPED — V1 PRODUCT FEATURE-COMPLETE**

Core restaurant operations — orders, POS, kitchen, delivery, menu, inventory ledger, purchasing with three-way matching, finance GL, reports CSV/Excel/PDF, settings, staff/opening, customer mobile PWA, franchise portal, rider delivery dashboard, staff app, and support panel — are **LIVE in Production** across the Phase 5–12 closeout waves (`v2.0.0` through `v2.7.0`).

The original "Phase 2 backlog" items identified in the 2026-07-30 audit have been **shipped across Phases 5–12**. Residual deferred items are now formally tracked as "DEFERRED" with explicit trigger conditions in the relevant ADRs (ADR-018 through ADR-041) — not as "Phase 2 backlog".

Three-way matching (PO total ↔ posted GRN ↔ invoice amount) is **LIVE** on invoice create (`matching_status`) — formally accepted via ADR-035 in Phase 10 (`v2.5.0`).

---

## Phase 5–12 closeout reconciliation (replaces 2026-07-30 "Phase 2 backlog")

The 8 items originally tagged as "Phase 2 backlog" in the 2026-07-30 audit have been resolved as follows:

| # | Original Phase 2 backlog item | Resolution | Phase / ADR |
| --- | --- | --- | --- |
| 1 | Coupon quote/checkout enforcement | ✅ SHIPPED — three-engine promotions surface (menu-level deal SKUs + coupons + loyalty rewards) | Phase 6 / ADR-021 (`v2.1.0`) |
| 2 | Loyalty rewards burn catalog | ✅ SHIPPED — loyalty wallet + earn + burn + tier progression | Phase 6 / ADR-021 (`v2.1.0`) |
| 3 | Menu import/export/bulk + nested categories + modifier editing | 🟡 PARTIAL — canonical single-price catalog + modifier system LIVE; bulk import/export + nested tree DEFERRED | Phase 6 / ADR-020 (`v2.1.0`) |
| 4 | Inventory branch transfers + recipe consumption engine + FIFO/WAC | 🟡 PARTIAL — versioned recipes + BOM + atomic stock consume + COGS via `last_known` LIVE; dedicated `inventory_transfers` table + FIFO/WAC DEFERRED | Phase 10 / ADR-033/034/035 (`v2.5.0`) |
| 5 | Finance cash/bank, AR aging, VAT returns, GL AP auto-post, COGS auto-post | 🟡 PARTIAL — branch GL + 4 financial-statement RPCs + AR + AP + tax_definitions + COGS events LIVE; automated GL posting from kitchen/PO/invoice + multi-currency + bank reconciliation DEFERRED | Phase 11 / ADR-036/037/038 (`v2.6.0`) |
| 6 | Reports Excel/PDF + scheduled delivery | ✅ SHIPPED — 12 reports routes + 25-module analytics registry + CSV/Excel/PDF export | Phase 6 / ADR-022 (`v2.1.0`) + Phase 11 enhancements (`v2.6.0`) |
| 7 | HR attendance, leave, shifts, payroll | ✅ SHIPPED — HR module with 48 routes incl. attendance/leave/payroll calc | Phase 6 / ADR-019 (`v2.1.0`) |
| 8 | AI autonomous runtime | 🔒 DEFERRED — Phase 13 (AI and Automation) UNLOCKED; ADR-013/014/015 AI governance framework already Accepted v1.0 | Phase 13 (not yet started) |

---

## Module status matrix (current — reconciled 2026-08-16)

| Module | Route | Status | Notes |
| --- | --- | --- | --- |
| Executive Dashboard | `/admin` | **LIVE** | 25-module owner workspace analytics aggregation |
| Opening / Owner handover | `/admin/opening*` | **LIVE** | Governance APIs present |
| Orders | `/admin/orders` | **LIVE** | ADR-018 order lifecycle (Phase 5 / `v2.0.0`) |
| POS | `/admin/pos` | **LIVE** | Cashier workflow + Z-report + cash reconciliation LIVE (ADR-023/024/025/026, Phase 7 / `v2.2.0`); KOT print format + fiscal printer + `pos_sessions` table DEFERRED |
| Kitchen | `/admin/kitchen` | **LIVE** | 4-column KDS + 6-state ticket lifecycle + KOT snapshot + timers + priority LIVE (ADR-027/028/029, Phase 8 / `v2.3.0`); per-item prep ticks + KOT print + server-side SLA + auto-priority + `kitchen_stations` DEFERRED |
| Delivery | `/admin/delivery` | **LIVE** | `AdminDelivery.tsx` + 8 sub-components + 10 admin routes + 4 rider-facing routes + aggregate KPIs (ADR-030/031/032 + ADR-008/009/010, Phase 9 / `v2.4.0`); live rider map + per-rider KPIs + `rider_daily_summaries` + auto-dispatch DEFERRED |
| Floor / Tables / Reservations | `/admin/floor*` | **LIVE** | Setup required until tables seeded |
| Menu Management | `/admin/menu` | **LIVE** | Canonical single-price catalog + atomic price audit + modifier system (ADR-020, Phase 6 / `v2.1.0`); import/export + bulk + nested tree DEFERRED |
| Inventory | `/admin/inventory` | **LIVE** | Stock master + 8 movement types + versioned recipes + BOM + COGS (ADR-033/034, Phase 10 / `v2.5.0`); dedicated `inventory_transfers` table + low-stock alerts + FIFO/WAC + `inventory_cost_history` DEFERRED |
| Purchasing & Suppliers | `/admin/purchasing` | **LIVE** | 8-state PO + 3-state GRN + 3-way match + supplier portal with 20 routes (ADR-035, Phase 10 / `v2.5.0`) |
| Finance & Accounting | `/admin/finance` | **LIVE** | Branch GL + 4 financial-statement RPCs + AR + AP + tax_definitions + COGS + cash reconciliation + COD reconciliation (ADR-036/037/038, Phase 11 / `v2.6.0`); automated GL posting + multi-currency + bank reconciliation + dedicated `refunds` table + partial-refund API DEFERRED |
| Reports / BI | `/admin/reports` | **LIVE** | 12 reports routes + 25-module analytics registry + CSV/Excel/PDF export + scheduled reports (ADR-022, Phase 6 / `v2.1.0` + Phase 11 enhancements) |
| CRM / Customers | `/admin/customers` | **LIVE** | 8 CRM routes + `AdminCrm.tsx` (306 lines) — de facto support panel (Phase 12 / `v2.7.0`); customer 360 unified view + ticketing system + refund initiation workflow DEFERRED |
| Loyalty | `/admin/loyalty` | **LIVE** | Loyalty wallet + earn + burn + tier progression (ADR-021, Phase 6 / `v2.1.0`); birthday reward + tiered loyalty DEFERRED |
| Marketing / Coupons | `/admin/marketing` | **LIVE** | Three-engine promotions surface — menu-level deal SKUs + coupons + loyalty rewards (ADR-021, Phase 6 / `v2.1.0`) |
| HR / Workforce | `/admin/hr` | **LIVE** | 48 HR routes — directory + attendance + leave + payroll calc + documents + deactivate (ADR-019, Phase 6 / `v2.1.0`); biometric / POS clock integrations DEFERRED |
| Settings | `/admin/settings` | **LIVE** | Organization + branch + menu + delivery + POS + kitchen settings (ADR-001/002, Phase 0/2 / `v1.9.0`); per-branch pricing + tax engines DEFERRED |
| WhatsApp Order Center | `/admin/whatsapp` | **LIVE** | 11 WhatsApp routes + 24-month PII anonymization (ADR-003/004, Phase 2 / `v1.9.0` + Phase 12 closeout); auto-routing WhatsApp to support agent + sentiment analysis + auto-reply bot DEFERRED (Phase 13 scope) |
| Branch Manager | `/admin/branch-manager` | **LIVE** | `AdminBranchManager.tsx` (689 lines) multi-branch view for `organization_owner` role (Phase 12 / `v2.7.0`); `franchisee` role + franchise agreement + royalty computation DEFERRED |
| AI Team | `/admin/ai-team` | **FOUNDATION** | Mianx.ai Operations Insights = deterministic rule summaries (not generative AI); autonomous AI workforce / background agent runtime DEFERRED to Phase 13 |

---

## Phase 1 — Incomplete tag scan (historical — 2026-07-30)

Searched admin pages/components for `Coming Soon`, `MISSING`, `FOUNDATION`, `Not available`.

| Area | Pre-audit finding | API exists? | Disposition |
| --- | --- | --- | --- |
| Purchasing three-way matching | Was MISSING historically | Yes — invoice create matching | ✅ LIVE — formally accepted via ADR-035 (`v2.5.0`) |
| Inventory Receive / Received today | Coming Soon | Yes — Purchasing GRN + movements | ✅ Wired (Phase 10 / `v2.5.0`) |
| Inventory Log waste / Waste today | Coming Soon | Yes — `movementType=waste` | ✅ Wired (Phase 10 / `v2.5.0`) |
| Inventory Stock value | Coming Soon / unavailable | Partial — `cost_price × qty` | ✅ Wired (DERIVED) — Phase 10 / `v2.5.0` |
| Finance Outstanding payables | Coming Soon | Yes — supplier invoices | ✅ Wired (operational AP) — Phase 11 / `v2.6.0` |
| Finance Cash / AR / Tax / VAT | Coming Soon | Now: Yes — full GL + AR + tax_definitions | ✅ Wired (Phase 11 / `v2.6.0`) |
| Marketing checkout validation | Coming Soon | Now: Yes — three-engine promotions surface | ✅ Wired (Phase 6 / `v2.1.0`) |
| Loyalty rewards catalog | Coming Soon | Now: Yes — loyalty wallet + burn | ✅ Wired (Phase 6 / `v2.1.0`) |
| Menu import/export/bulk/nested tree/modifier edit | Coming Soon | Now: Partial — catalog CRUD + modifier system | 🟡 Partial — bulk + nested tree DEFERRED per ADR-020 |
| Reports Excel/PDF/schedule | Coming Soon | Now: Yes — CSV + Excel + PDF + scheduled | ✅ Wired (Phase 6/11) |
| HR attendance/leave/payroll | FOUNDATION | Now: Yes — 48 HR routes incl. payroll calc | ✅ Wired (Phase 6 / `v2.1.0`) |
| Inventory transfers / recipe BOM | Coming Soon | Now: Partial — recipes + BOM LIVE; transfers table DEFERRED | 🟡 Partial — `inventory_transfers` table DEFERRED per ADR-033 |
| Settings export / payment tax engines | Coming Soon | Partial — env-managed | 🟡 Partial — per-branch pricing + tax engines DEFERRED |

---

## Phase 2 — Fixes applied this audit (historical — 2026-07-30)

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

> **2026-08-16 reconciliation note:** The "Planned for Phase 2" labels applied during the 2026-07-30 audit have been progressively superseded by the Phase 5–12 closeout waves. Many admin UI labels still read "Planned for Phase 2" — these are stale strings and should be updated to reflect actual current state (LIVE / DEFERRED per the relevant ADR). A UI-label refresh pass is queued as a follow-up; for now, the authoritative source of truth is this report + `docs/00-governance/PROJECT_STATUS.md` + `docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`.

---

## Deferred items (formally tracked in ADRs)

The following items are explicitly DEFERRED with documented trigger conditions in the relevant ADRs. They are NOT "Phase 2 backlog" — they are post-V1 enhancements that will be addressed in Phase 13 (AI and Automation), Phase 14 (Full Integration and QA), or future ADRs.

### Native mobile + offline
- Native mobile app (iOS/Android via React Native/Expo)
- Service worker / offline cache / installable PWA banner / push notifications (Web Push + FCM + APNs)
- Order tracking realtime (Supabase Realtime) + offline ordering + one-tap reorder
- Customer-facing live map (Supabase Realtime channels + customer RLS)

### Rider mobile + delivery expansion
- Rider-specific mobile UI + turn-by-turn navigation + in-app call masking + offline-tolerant action queue
- Auto-dispatch engine + rider shift scheduling + `rider_daily_summaries` table + per-rider KPI dashboard
- Live rider map (admin) + reverse geocode at read-time + average distance computation
- Failed-delivery capture + redelivery + single-transaction delivery+order mirror + delivery SLA tracking
- Audible alarms + bump-bar + recall

### Kitchen expansion
- Per-item prep ticks + KOT print format + sequence_number + fiscal printer
- Server-side SLA + late-alert events + priority mutation endpoint + auto-priority
- `kitchen_stations` table + station routing + realtime kitchen updates + AI-driven kitchen prediction

### Staff app + support panel expansion
- Mobile-optimized staff UI + PWA-installable admin + branch-manager mobile checklist + kitchen handheld view
- Offline-tolerant POS continuation
- Customer 360 unified view + ticketing system + refund initiation workflow
- Auto-routing WhatsApp to support agent + sentiment analysis + auto-reply bot + support agent role refinement + multi-role staff UI switcher

### Franchise portal expansion
- `franchisee` role + onboarding + franchise agreement tracking + royalty computation + multi-tenant SaaS isolation

### Inventory expansion
- Dedicated `inventory_transfers` table + low-stock alerts + batch/lot tracking + `inventory_cost_history` + FIFO/WAC costing + units master table + multi-warehouse + stock count workflow + modifier-effect consumption + recipe versioning rollback + recipe yield factor enforcement + recipe import/export

### Finance expansion
- Per-branch pricing + automated GL posting from kitchen/PO/invoice/sales + multi-currency consolidation + inter-branch transfers + fiscal-year close automation + bank reconciliation + fixed-asset depreciation + multi-timezone + seeded jurisdiction tax rates + weighted-average/FIFO costing + `sale` movement type wiring for finished-goods + automated procurement-to-GL automation + automated 3-way match (DB-level trigger) + supplier-side invoice submission + partial-cancel of order line items + dedicated `refunds` table + partial-refund API + `discounts` master table for non-coupon discounts + finance domain event mirror triggers

---

## Verification

| Gate | Result |
| --- | --- |
| `pnpm check` | Required green before merge — ✅ PASS on Phase 12 closeout (PR #239) |
| `pnpm test` | Required green before merge — ✅ PASS (1096 backend tests, 6/6 CI checks) |
| Three-way matching migration | Applied (`20260730280000_three_way_matching.sql`) — superseded by ADR-035 closeout in Phase 10 (`v2.5.0`) |
| Phase 12 verification script | `scripts/phase_12_verify.py` — 278 checks across 10 categories, ALL PASS |

---

## Authority note

This report reflects **repository evidence** after the Phase 12 closeout (`v2.7.0` / `94e5d69` / 2026-08-16). Planning docs do not override implemented capability. Items marked LIVE have exercised API/UI wiring; items marked DEFERRED are formally tracked in the relevant ADRs with explicit trigger conditions and must not be demonstrated as complete to the Owner until their respective ADRs are Accepted.

The authoritative source of truth for repository status is [`docs/00-governance/REPOSITORY_STATUS.md`](../00-governance/REPOSITORY_STATUS.md); for project status, [`docs/00-governance/PROJECT_STATUS.md`](../00-governance/PROJECT_STATUS.md); for release history, [`docs/17-releases/RELEASE_HISTORY.md`](../17-releases/RELEASE_HISTORY.md); for the master roadmap, [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md).
