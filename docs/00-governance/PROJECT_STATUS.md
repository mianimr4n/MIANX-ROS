# Project Status

**Status:** ACTIVE Owner summary
**Last reconciled:** 2026-08-16 — **Phase 12 COMPLETE (`v2.7.0`)** — Customer and Staff Apps formally closed via ADR-039/040/041. All 12 phases (0 through 12) PASS AND CLOSED. All 41 ADRs (ADR-001 through ADR-041) Accepted v1.0. Phase 13 (AI and Automation) UNLOCKED.

## Purpose
Owner-facing operating documentation for Telepizza ROS — current implementation state, capability honesty, and next major workstream.

---

## Current verified state

Verified against repository main `94e5d69` (Phase 12 closeout — PR #239 squash merge) and the formal release tag `v2.7.0` on the same SHA. Production DB migration tip remains `20260821000000` (Phase 3 OTP baseline, unchanged through Phase 5/6/7/8/9/10/11/12 closeouts — all closeout-only). Last reconciled date: **2026-08-16**.

### Phase release history (verified)

| Phase | Tag | PR | Head SHA | ADRs | Status |
| --- | --- | --- | --- | --- | --- |
| Phase 5 — Order Lifecycle | `v2.0.0` | #232 | `6aaccc6` | ADR-018 | ✅ COMPLETE |
| Phase 6 — Admin and ERP Core | `v2.1.0` | #233 | `a30436d` | ADR-019/020/021/022 | ✅ COMPLETE |
| Phase 7 — POS System | `v2.2.0` | #234 | `367fc94` | ADR-023/024/025/026 | ✅ COMPLETE |
| Phase 8 — Kitchen Dashboard | `v2.3.0` | #235 | `2139910` | ADR-027/028/029 | ✅ COMPLETE |
| Phase 9 — Rider and Delivery App | `v2.4.0` | #236 | `b596cf6` | ADR-030/031/032 | ✅ COMPLETE |
| Phase 10 — Inventory and Procurement | `v2.5.0` | #237 | `8369cbf` | ADR-033/034/035 | ✅ COMPLETE |
| Phase 11 — Finance and Reporting | `v2.6.0` | #238 | `4c97b6c` | ADR-036/037/038 | ✅ COMPLETE |
| Phase 12 — Customer and Staff Apps | `v2.7.0` | #239 | `94e5d69` | ADR-039/040/041 | ✅ COMPLETE |

All releases are **closeout-only**: no new migrations applied since Phase 3 OTP (`20260821000000`). The Production DB tip is unchanged across Phases 5–12. Each release is shipped as an annotated tag + GitHub Release with full release notes under `docs/releases/v{X.Y.Z}_RELEASE_NOTES.md`.

---

## What is LIVE

### Customer Platform
- Website on Vercel (`telepizza-website`) — React + Vite SPA with 25+ customer pages (Home / Menu / Cart / Checkout / TrackOrder / MyTelepizza / Loyalty / Orders / Favorites / Branches / Account / etc.)
- PWA manifest (`site.webmanifest`) — installable on mobile web
- Phone-first auth (ADR-017) via `/auth/otp/send` + `/auth/otp/verify` + `/auth/session` + `/auth/me`
- Order placement + tracking + receipts + guest read/cancel (ADR-018)
- Loyalty wallet + rewards + tier progression (ADR-021)
- Branch-scoped menu with canonical single-price catalog (ADR-020)
- Cart with pizza customizer + deals + coupons + delivery zone validation

### Admin and ERP Core
- API on Render (`telepizza-api`) — Express + Supabase/Postgres
- 32 admin router modules totaling **350+ routes** (HR 48 + Finance 35 + Opening-Governance 33 + Opening-Operations 25 + Marketing 23 + Purchasing 22 + Loyalty 19 + Reservations 14 + Reports 13 + WhatsApp 11 + Delivery-Rider 10 + Payments 9 + Customers 8 + Inventory 8 + Inventory-Recipes 8 + POS 7 + Orders 7 + AI-Governance 6 + Tables 6 + Table-Sessions 6 + Staff-Assignments 5 + Audit 5 + Branch-Profile 5 + Dashboard 5 + Delivery-Settings 5 + Floor 5 + Settings 5 + Bills 4 + Configuration 4 + Booking-Policy 3 + Organization-Settings 3 + Opening-Dry-Run 3) + 4 rider-facing routes + 2 kitchen routes
- PostgreSQL + Auth on Supabase; Production migrations through `20260821000000`
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, organization-owner, branch-manager, kitchen-manager, cashier, rider, support, host, waiter (ADR-019 RBAC + `AuthPrincipal`)
- GitHub Actions CI (typecheck + 1096 backend tests + CodeQL + Vercel Preview + Dependency Scan + Analyze + Owner Playwright) on every PR and push to `main`
- 37 admin pages under `apps/website/client/src/pages/admin/` + 5 ops pages (`OpsShell` / `Dashboard` / `Dispatch` / `Kitchen` / `Orders`)
- 24-month WhatsApp PII anonymization job (ADR-003/004)
- Audit log (ADR-012) — `audit_log` table + `AdminAuditLog` page + 5 routes

### POS System (Phase 7 — v2.2.0)
- Dine-in / takeaway / delivery order placement (3 order types via `orders.order_type`)
- Cashier workflow (`POST /api/v1/admin/pos/orders` with cash-only payment contract — ADR-023)
- Payments: 4 methods (cash, card_terminal, bank_manual, complimentary) — no online gateway
- POS shifts + Z-Report (`pos_z_report_events` append-only Asia/Karachi audit — ADR-025)
- Cash reconciliation (`cash_reconciliations` 6-state machine with server-side variance — ADR-025)
- Dine-in bill settlement + multi-tender bill_splits + reservation_deposits (ADR-024)
- Branch sync + offline-safe contract (RLS via `branch_id` — ADR-026)

### Kitchen Dashboard (Phase 8 — v2.3.0)
- 4-column KDS board on `AdminKitchenDashboard.tsx` with 8s polling
- 6-state kitchen ticket lifecycle: `queued → accepted → preparing → ready → completed | cancelled` (ADR-027)
- KOT snapshot model with atomic stock consume via `kitchen_ticket_set_preparing_atomic` RPC (ADR-028)
- Kitchen timers + priority + display contract (PREP_WARN=20m / PREP_TARGET=15m client constants — ADR-029)
- Branch isolation (RLS enabled on `kitchen_tickets` + `kitchen_ticket_items`)

### Rider and Delivery (Phase 9 — v2.4.0)
- Rider identity (1:1 user_id + 1:1 branch_id — ADR-030) + manual dispatch contract
- Delivery lifecycle (6-state machine elevation + order mirror via `mirrorOrderStatus` + compensating rollback — ADR-031)
- POD mandatory for `delivered` via trigger + service + UI (ADR-009 fully implemented)
- `rider_locations` GPS ingest endpoint with 24h TTL purge (ADR-008)
- `cod_collections` 4-state reconciliation with auto-GL posting trigger (ADR-010)
- 4 rider-facing routes under `/api/v1/riders/*` + 10 admin delivery routes

### Inventory and Procurement (Phase 10 — v2.5.0)
- `inventory_items` branch-scoped stock master with 3-state status + cost_price (ADR-033)
- Versioned recipes + BOM with `inventory_recipes` + `inventory_recipe_lines` + waste_factor (ADR-034)
- Immutable stock movement ledger (8 movement types) + `adjust_inventory_stock_atomic` RPC
- 8-state PO machine + 3-state GRN machine + 3-way match foundation (ADR-035)
- Suppliers + supplier portal users + 20-route supplier portal
- COGS via `inventory_cogs_events` with `last_known` cost_source

### Finance and Reporting (Phase 11 — v2.6.0)
- Branch GL + chart_of_accounts + 3-state journal_entries + balanced journal_entry_lines (ADR-036)
- `create_journal_entry_atomic` + `reverse_journal_entry_atomic` SECURITY DEFINER RPCs
- Financial-statement RPCs: `finance_trial_balance` / `finance_profit_loss` / `finance_balance_sheet` / `finance_cash_flow_indirect`
- `finance_periods` 3-state period control + `finance_account_mappings` (20 purposes)
- `finance_postings` idempotency UNIQUE per source_module+source_id
- ADR-011 immutability triggers on `journal_entries` + `journal_entry_lines`
- Z-report append-only audit + `cash_reconciliations` 6-state with `compute_cash_reconciliation_totals` IMMUTABLE RPC (ADR-037)
- COD 4-state reconciliation with ADR-010 post_cod_collection_journal trigger
- Tax definitions (configurable rates, exclusive/inclusive basis, input/output classification — ADR-038)
- AR surface (customer_invoices 7-state + customer_receipts + allocations + customer_credit_notes 3-state)
- AP surface (supplier_invoices 3-way match + supplier_payments + `record_supplier_payment_atomic`)
- 12 reports routes + 25-module analytics registry incl. finance/sales/executive/branch_comparison
- CSV / Excel / PDF export + `getOwnerWorkspace` 25-module aggregation

### Customer and Staff Apps (Phase 12 — v2.7.0)
- Customer mobile surface: web-first PWA via `apps/website` + ADR-017 phone-first auth + ADR-021 loyalty wallet + ADR-022 owner workspace 25-module dashboard
- Franchise portal: `organization_owner` role + `AdminBranchManager.tsx` 689 lines multi-branch view + `branch_comparison` analytics module
- Rider mobile + delivery dashboard: `AdminDelivery.tsx` 550 lines + 8 sub-components ~3,500 lines + 10 admin delivery routes + 4 rider-facing routes + aggregate KPIs
- Staff app: `AdminShell.tsx` + 37 admin pages + 5 ops pages + 32 admin router modules (350+ routes)
- Support panel: `AdminCrm.tsx` 306 lines + 8 CRM routes + `AdminWhatsApp.tsx` + 11 WhatsApp routes as de facto support panel
- ADR-012 audit log + `support` role seeded (canonical, supersedes legacy `customer-support`)

### Foundation governance
- Organization profile and Branch profile settings — real read/write APIs
- Notification channels: Customer orders, Rider dispatch, Escalation — configured and ACTIVE (Kitchen alerts still pending)

---

## What is DERIVED
- Executive Dashboard KPIs derived from live order/kitchen/delivery/finance/inventory APIs
- 25-module owner workspace analytics aggregation (sales, finance, executive, branch_comparison, etc.)
- Mianx.ai Operations Insights = deterministic rule summaries (not generative AI — Phase 13 will introduce generative AI agents)
- Opening Readiness panel — reads live probe status; never shows fake COMPLETE for unverified items

---

## What is FOUNDATION (APIs exist, deferred for future activation)
- Native mobile app (iOS/Android via React Native/Expo) — web-first PWA serves mobile web for V1
- Service worker / offline cache / push notifications (Web Push + FCM + APNs)
- Online card payment gateway — Phase 7 ships cash-only + card_terminal/bank_manual/complimentary
- Realtime updates via Supabase Realtime channels (admin delivery board, KDS, customer order tracking)
- `pos_sessions` table + multi-tender `payment_splits` + bank deposit slip generation
- Multi-timezone support (POS Z-report uses Asia/Karachi only for V1)
- Per-branch pricing (canonical single-price catalog for V1 — ADR-020)
- `rider_daily_summaries` table + per-rider KPI dashboard + live rider map
- Failed-delivery capture (`delivery_failures` table) + redelivery flow
- Auto-dispatch engine (rider scoring by proximity/load, auto-assign on confirmed)
- `franchisee` role + franchise agreement tracking + royalty computation + multi-tenant SaaS isolation
- Customer 360 unified view + ticketing system + refund initiation workflow
- Mobile-optimized staff UI + PWA-installable admin + branch-manager mobile checklist + kitchen handheld view
- Kitchen: per-item prep ticks, KOT print format + sequence_number + fiscal printer, server-side SLA + late-alert events, priority mutation endpoint + auto-priority, `kitchen_stations` table + station routing, realtime kitchen updates
- Inventory: dedicated `inventory_transfers` table, low-stock alert notification, batch/lot tracking, weighted-average/FIFO costing, `inventory_cost_history`
- Finance: per-branch pricing, automated GL posting from kitchen/PO/invoice/sales, multi-currency consolidation, inter-branch transfers, fiscal-year close automation, bank reconciliation, fixed-asset depreciation, seeded jurisdiction tax rates, dedicated `refunds` table, partial-refund API, `discounts` master table for non-coupon discounts

Each FOUNDATION item above has an explicit trigger condition in the relevant ADR's "Deferred to future ADRs" section.

---

## What is UNAVAILABLE
- Private credentials, service-role keys, and private absolute evidence paths in Production UI
- Owner/Founder database roles (display labels only; authorization remains `super-admin` with `branch_id = null` — `organization_owner` is the canonical Owner role since Phase 12)
- Kubernetes, microservices, Prisma, native mobile apps, event bus (legacy archive claims — not Production)
- Autonomous AI workforce / background agent runtime (Phase 13 scope)

---

## Known blockers
- Devices (POS/KDS/printer/rider/internet/UPS) not yet verified onsite at Royal Orchard
- Online payment provider not yet enabled in Production (cash-only + card_terminal/bank_manual/complimentary are live)
- Kitchen alerts notification channel not yet configured
- SOPs (5), staff training (7 roles), and role rehearsals (6 + end-to-end) not yet scheduled/approved
- Founder go/no-go decision not yet recorded
- Protected test order `TP-260727-000001` stays `pending` (Behari Roll) with no kitchen ticket until confirmation

---

## Operator Follow-ups (no code blockers)

The following 6 Operator Follow-ups remain open from prior phases. None block engineering — they are operational configuration items that the owner/operator must complete in Production:

| FU | Phase | Description |
| --- | --- | --- |
| FU-3 | Phase 2 | Configure WhatsApp WABA template approval + production mode |
| FU-4 | Phase 2 | Configure FBR tax registration + `chart_of_accounts` rows per branch |
| FU-5 | Phase 2 | Configure transactional email provider + delivery-pod storage bucket |
| FU-7 | Phase 3 | Configure `OTP_HMAC_SECRET` for OTP signing + final production phone numbers (Phase 15) |
| FU-8 | Phase 9 | Configure Mapbox/Google Maps API key for turn-by-turn rider navigation |
| FU-11 | Phase 11 | Configure `finance_account_mappings` rows for the 20 mapping purposes per branch |

---

## Owner decision required

Confirm opening-day payments, devices, SOPs, training, and rehearsal readiness for Royal Orchard before final launch (Phase 15), then record the Founder go/no-go decision. Use `/admin/branch` Owner Decision Queue.

For Phase 13 (AI and Automation) kickoff: owner sign-off on AI provider boundary (ADR-013) + AI approval gate (ADR-014) + AI prompt retention (ADR-015) — all three Phase 2.6 ADRs are already Accepted v1.0 and provide the governance framework for Phase 13 AI agents.

---

## Next implementation action

**Phase 13 (AI and Automation) is UNLOCKED.** Dependencies satisfied: Phase 5 (ADR-018), Phase 6 (ADR-019/020/021/022), Phase 7 (ADR-023/024/025/026), Phase 8 (ADR-027/028/029), Phase 9 (ADR-030/031/032), Phase 10 (ADR-033/034/035), Phase 11 (ADR-036/037/038), Phase 12 (ADR-039/040/041). ADR-013/014/015 AI governance (shipped v1.9.0 Phase 2.6) + Phase 6 analytics registry + Phase 9 rider_locations + Phase 11 finance GL + Phase 12 customer/staff/rider/franchise/support/delivery surface provide the data + UI foundation for Phase 13's demand forecasting, inventory prediction, delivery optimization, support AI, marketing automation, fraud signals, and operational AI teams.

Engineering side is stable. Phase 13 audit + ADR drafting is the next major workstream.

---

## Source of truth
Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence outside Git. The authoritative repository status is [`REPOSITORY_STATUS.md`](./REPOSITORY_STATUS.md); the authoritative release history is [`docs/17-releases/RELEASE_HISTORY.md`](../17-releases/RELEASE_HISTORY.md); the authoritative roadmap is [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md).

---

## Last verified date
2026-08-16

---

## Related routes/files/services
- Website: `apps/website`
- API: `backend/api`
- Admin: `/admin/*`
- Owner Workspace: `/admin` (Executive Dashboard) + `/admin/branch` (Owner Decision Queue) + `/admin/ai-team` (Team Center)
- ADR index: [`docs/00-governance/ADR_INDEX.md`](./ADR_INDEX.md)
- Master roadmap: [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md)
- Release notes: [`docs/releases/`](../releases/)

---

## Acceptance criteria
- Documentation states LIVE/DERIVED/FOUNDATION/UNAVAILABLE honestly
- No claim of unverified Kubernetes/microservices/Prisma/mobile/event-bus in Production
- Northern Bypass remains `coming-soon`
- All 41 ADRs listed as Accepted v1.0 with standalone files under `docs/13-adr/`
- Phase 13 explicitly marked UNLOCKED with dependencies satisfied

---

## Opening mission
Royal Orchard targets official launch at **Phase 15 — Final Production Launch**. Northern Bypass remains **coming-soon** and must not inherit Royal Orchard launch state. Phase 13 (AI and Automation) and Phase 14 (Full Integration and QA) gate the final Phase 15 production cutover.

---

## Data-state vocabulary
LOADING · LIVE · DERIVED · EMPTY · STALE · OFFLINE · ERROR · FOUNDATION · UNAVAILABLE
