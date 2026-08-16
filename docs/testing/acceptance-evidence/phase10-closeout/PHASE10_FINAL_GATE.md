# PHASE 10 FINAL GATE — Inventory and Procurement

**Phase:** 10 — Inventory and Procurement
**Status:** ✅ COMPLETE & SHIPPED (v2.5.0)
**Date closed:** 2026-08-16
**Release:** [v2.5.0](https://github.com/mianimr4n/telepizza/releases/tag/v2.5.0)
**Closeout type:** Closeout-only — no new migrations applied. Production DB tip unchanged from Phase 5/6/7/8/9 closeouts.

---

## Scope

Phase 10 covers the inventory and procurement operational surface,
comprising ten sub-areas per the master roadmap:

1. Ingredients (inventory stock master)
2. Recipe/BOM (Bill of Materials)
3. Stock (on-hand quantities + adjustments)
4. Branch inventory (RLS-scoped per branch)
5. POs (Purchase Orders)
6. Suppliers (supplier master + portal)
7. Wastage (waste movement type)
8. Transfers (inter-branch stock moves)
9. Alerts (low-stock / reorder notifications)
10. Costing (COGS — cost of goods sold)

The phase is largely already implemented in code and Production across
three prior waves: RC3 (inventory + purchasing + GRN + supplier invoices
+ supplier portal — migrations `20260730160000` through
`20260731130000`), RC3-extended (atomic GRN stock posting +
`adjust_inventory_stock_atomic` — `20260730220000`), and RC4 (versioned
recipes + COGS events + consumption events — `20260731180000`). Phase 10
closeout formally elevates the as-built design to three new ADRs
(ADR-033, ADR-034, ADR-035) — no new migrations and no new code are
required.

---

## Formal ADRs Accepted in This Closeout

| ADR | Title | Status | Implemented in |
|---|---|---|---|
| ADR-033 | Inventory Stock Master, Movement Ledger & Atomic Adjustment Contract | Accepted v1.0 | v2.5.0 (Phase 10 closeout) |
| ADR-034 | Recipe/BOM & COGS Costing Contract | Accepted v1.0 | v2.5.0 (Phase 10 closeout) |
| ADR-035 | Procurement, Suppliers & GRN Contract | Accepted v1.0 | v2.5.0 (Phase 10 closeout) |

**All 35 ADRs (ADR-001..ADR-035) Accepted v1.0 with standalone files under `docs/13-adr/`.**

---

## Gate Criteria (all PASS)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | ADR-033 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-033-inventory-stock-master-movement-ledger-contract.md` |
| 2 | ADR-034 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-034-recipe-bom-cogs-costing-contract.md` |
| 3 | ADR-035 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-035-procurement-suppliers-grn-contract.md` |
| 4 | ADR_INDEX.md updated with ADR-033/034/035 rows + Note | ✅ PASS | `docs/00-governance/ADR_INDEX.md` lines 73-75, 120-139 |
| 5 | Phase 10 verify script exists with 70+ checks | ✅ PASS | `scripts/phase_10_verify.py` (10 categories, 70+ checks) |
| 6 | Master roadmap Phase 10 row marked Complete | ✅ PASS | `docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md` Phase 10 section |
| 7 | REPOSITORY_STATUS.md updated to Phase 10 COMPLETE | ✅ PASS | `docs/00-governance/REPOSITORY_STATUS.md` |
| 8 | CHANGELOG.md has v2.5.0 entry | ✅ PASS | `CHANGELOG.md` |
| 9 | Release notes v2.5.0 authored | ✅ PASS | `docs/releases/v2.5.0_RELEASE_NOTES.md` |
| 10 | PR opened, CI green, merged to main | ✅ PASS | PR #237 (squash merge) |
| 11 | Annotated tag v2.5.0 created + pushed | ✅ PASS | tag object on origin |
| 12 | GitHub Release v2.5.0 published | ✅ PASS | https://github.com/mianimr4n/telepizza/releases/tag/v2.5.0 |
| 13 | Production DB tip unchanged (closeout-only) | ✅ PASS | `20260821000000_adr_016_017_otp.sql` (Phase 3 OTP, same as Phase 5/6/7/8/9) |
| 14 | No new migrations required | ✅ PASS | All inventory/procurement migrations already in Production (RC3 + RC4) |
| 15 | No new code required | ✅ PASS | All inventory/procurement code already shipped in v1.8.0/v1.9.0/v2.0.0/v2.1.0 |
| 16 | Worklog updated with phase-10-audit + phase-10-shipped entries | ✅ PASS | `worklog.md` |

---

## Production Verification

### Database state (Production Supabase `pyeowxvacgypohrbvgee`)

#### Inventory tables (ADR-033)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `inventory_items` | table (branch-scoped stock master) | ✅ in Production | `20260730160000_inventory_backend.sql` |
| `stock_movements` | table (immutable ledger) | ✅ in Production | `20260730160000_inventory_backend.sql` |
| `adjust_inventory_stock_atomic` | SECURITY DEFINER RPC | ✅ in Production | `20260730220000_atomic_inventory_and_grn_stock.sql` |
| RLS on `inventory_items` + `stock_movements` | RLS | ✅ in Production | `20260730160000` migration |
| CHECK constraint on `movement_type` (8 values) | constraint | ✅ in Production | `20260730220000` migration (extended from 6 to 8 values) |
| `inventory.manage` permission seeded | permission | ✅ in Production | `20260730160000` migration |

#### Recipe/COGS tables (ADR-034)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `inventory_recipes` | table (versioned, one-active-per-menu_item) | ✅ in Production | `20260731180000_rc4_inventory_recipes_cogs.sql` |
| `inventory_recipe_lines` | table (BOM lines) | ✅ in Production | `20260731180000` |
| `inventory_recipe_modifier_effects` | table (modifier deltas — DEFERRED for consume) | ✅ in Production | `20260731180000` |
| `inventory_consumption_events` | table (idempotent + reversible) | ✅ in Production | `20260731180000` |
| `inventory_consumption_event_lines` | table (per-ingredient breakdown) | ✅ in Production | `20260731180000` |
| `inventory_stock_exceptions` | table (variance tracking) | ✅ in Production | `20260731180000` |
| `inventory_recipe_audit_events` | table (recipe lifecycle audit) | ✅ in Production | `20260731180000` |
| `inventory_cogs_events` | table (COGS tracking, last_known cost_source) | ✅ in Production | `20260731180000` |
| `menu_item_inventory_components` | table (denormalized active-recipe cache) | ✅ in Production | `20260730230000_kitchen_recipe_stock_consume.sql` |
| `kitchen_ticket_set_preparing_atomic` | SECURITY DEFINER RPC (consume + reverse) | ✅ in Production | `20260731180000` (REPLACE'd from `20260730230000`) |
| `inventory_reverse_kitchen_consumption_atomic` | SECURITY DEFINER RPC (reversal) | ✅ in Production | `20260731180000` |
| RLS on all 8 recipe/COGS tables | RLS | ✅ in Production | `20260731180000` |
| `uq_inventory_recipes_one_active` UNIQUE partial index | index | ✅ in Production | `20260731180000` |

#### Procurement tables (ADR-035)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `suppliers` | table (branch-scoped supplier master) | ✅ in Production | `20260730170000_purchasing_backend.sql` + `20260731120000` (extended) |
| `purchase_orders` | table (8-state machine) | ✅ in Production | `20260730170000` + `20260730180000` (idempotent re-create) |
| `purchase_requisitions` | table (6-state machine) | ✅ in Production | `20260730180000_fix_purchasing_missing_tables.sql` |
| `goods_receiving` | table (3-state machine) | ✅ in Production | `20260730180000` |
| `goods_receiving_lines` | table (per-line received quantities) | ✅ in Production | `20260730220000_atomic_inventory_and_grn_stock.sql` |
| `create_goods_receiving_with_stock_atomic` | SECURITY DEFINER RPC | ✅ in Production | `20260730220000` |
| `supplier_invoices` | table (3-way match foundation) | ✅ in Production | `20260730270000_supplier_invoices_payments.sql` |
| `supplier_payments` | table (payment recording) | ✅ in Production | `20260730270000` |
| `record_supplier_payment_atomic` | SECURITY DEFINER RPC (GL posting) | ✅ in Production | `20260730270000` |
| `supplier_portal_users` | table (supplier auth linkage) | ✅ in Production | `20260731120000_supplier_portal_foundation.sql` |
| `purchase_order_lines` | table | ✅ in Production | `20260731120000` |
| `purchase_order_responses` | table (idempotent supplier responses) | ✅ in Production | `20260731120000` + `20260731130000` (hardened) |
| `purchase_order_delivery_refs` | table | ✅ in Production | `20260731120000` |
| `supplier_documents` | table | ✅ in Production | `20260731120000` + `20260731130000` (hardened) |
| `supplier_portal_events` | table (append-only audit) | ✅ in Production | `20260731120000` |
| `supplier_response_staff_decisions` | table | ✅ in Production | `20260731130000_supplier_portal_hardening.sql` |
| `current_user_supplier_ids()` | SQL function (RLS helper) | ✅ in Production | `20260731120000` |
| RLS on all 11 procurement tables | RLS | ✅ in Production | multiple migrations |
| `purchasing.manage` permission seeded | permission | ✅ in Production | `20260730170000` + `20260730180000` |
| `supplier.portal` permission seeded | permission | ✅ in Production | `20260731120000` |
| `supplier` role seeded | role | ✅ in Production | `20260731120000` |

**Production DB tip:** `20260821000000_adr_016_017_otp.sql` (Phase 3 OTP — unchanged since Phase 5 closeout).

### Backend API surface (as-built)

#### Inventory admin routes (5 routes — ADR-033)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/inventory/items` | `inventory.manage` OR `admin.access` | List items |
| `POST` | `/api/v1/admin/inventory/items` | `inventory.manage` OR `admin.access` | Create item (with opening stock) |
| `PATCH` | `/api/v1/admin/inventory/items/:id` | `inventory.manage` OR `admin.access` | Update item metadata |
| `POST` | `/api/v1/admin/inventory/adjustments` | `inventory.manage` OR `admin.access` | Atomic adjustment |
| `GET` | `/api/v1/admin/inventory/movements` | `inventory.manage` OR `admin.access` | List movements |

#### Recipe admin routes (8 routes — ADR-034)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/inventory/recipes` | `inventory.manage` OR `admin.access` | List recipes |
| `GET` | `/api/v1/admin/inventory/recipes/missing` | `inventory.manage` OR `admin.access` | List menu items with no active recipe |
| `GET` | `/api/v1/admin/inventory/recipes/:id` | `inventory.manage` OR `admin.access` | Get recipe |
| `POST` | `/api/v1/admin/inventory/recipes` | `inventory.manage` OR `admin.access` | Create recipe (draft) |
| `PATCH` | `/api/v1/admin/inventory/recipes/:id` | `inventory.manage` OR `admin.access` | Update recipe |
| `POST` | `/api/v1/admin/inventory/recipes/:id/activate` | `inventory.manage` OR `admin.access` | Activate recipe |
| `POST` | `/api/v1/admin/inventory/recipes/:id/deactivate` | `inventory.manage` OR `admin.access` | Deactivate recipe |
| `POST` | `/api/v1/admin/inventory/recipes/:id/duplicate` | `inventory.manage` OR `admin.access` | Duplicate recipe |

#### Purchasing admin routes (21 routes — ADR-035)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/purchasing/suppliers` | `purchasing.manage` OR `admin.access` | List suppliers |
| `POST` | `/api/v1/admin/purchasing/suppliers` | `purchasing.manage` OR `admin.access` | Create supplier |
| `PATCH` | `/api/v1/admin/purchasing/suppliers/:id` | `purchasing.manage` OR `admin.access` | Update supplier |
| `GET` | `/api/v1/admin/purchasing/orders` | `purchasing.manage` OR `admin.access` | List POs |
| `POST` | `/api/v1/admin/purchasing/orders` | `purchasing.manage` OR `admin.access` | Create PO |
| `POST` | `/api/v1/admin/purchasing/orders/:id/approve` | `purchasing.manage` OR `admin.access` | Approve/reject PO |
| `GET` | `/api/v1/admin/purchasing/requisitions` | `purchasing.manage` OR `admin.access` | List requisitions |
| `POST` | `/api/v1/admin/purchasing/requisitions` | `purchasing.manage` OR `admin.access` | Create requisition |
| `GET` | `/api/v1/admin/purchasing/receiving` | `purchasing.manage` OR `admin.access` | List GRNs |
| `POST` | `/api/v1/admin/purchasing/receiving` | `purchasing.manage` OR `admin.access` | Create GRN (atomic stock post) |
| `GET` | `/api/v1/admin/purchasing/invoices` | `purchasing.manage` OR `admin.access` | List invoices |
| `POST` | `/api/v1/admin/purchasing/invoices` | `purchasing.manage` OR `admin.access` | Create invoice |
| `POST` | `/api/v1/admin/purchasing/invoices/:id/approve-exception` | `purchasing.manage` OR `admin.access` | Approve invoice variance exception |
| `GET` | `/api/v1/admin/purchasing/payments` | `purchasing.manage` OR `admin.access` | List payments |
| `POST` | `/api/v1/admin/purchasing/payments` | `purchasing.manage` OR `admin.access` | Record payment (atomic GL post) |
| `GET` | `/api/v1/admin/purchasing/suppliers/:id/portal-users` | `purchasing.manage` OR `admin.access` | List supplier portal users |
| `POST` | `/api/v1/admin/purchasing/suppliers/:id/portal-users` | `purchasing.manage` OR `admin.access` | Create supplier portal user |
| `GET` | `/api/v1/admin/purchasing/orders/:id/lines` | `purchasing.manage` OR `admin.access` | List PO lines |
| `GET` | `/api/v1/admin/purchasing/supplier-attention` | `purchasing.manage` OR `admin.access` | List POs needing supplier attention |
| `GET` | `/api/v1/admin/purchasing/supplier-response-queue` | `purchasing.manage` OR `admin.access` | List supplier responses pending decision |
| `POST` | `/api/v1/admin/purchasing/supplier-responses/:responseId/decide` | `purchasing.manage` OR `admin.access` | Decide on supplier response |
| `PATCH` | `/api/v1/admin/purchasing/portal-users/:id/status` | `purchasing.manage` OR `admin.access` | Update portal user status |

#### Supplier portal routes (20 routes — ADR-035)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/supplier-portal/me` | `supplier.portal` | Supplier profile |
| `GET` | `/api/v1/supplier-portal/dashboard` | `supplier.portal` | KPI dashboard |
| `GET` | `/api/v1/supplier-portal/orders` | `supplier.portal` | List POs |
| `GET` | `/api/v1/supplier-portal/orders/:id` | `supplier.portal` | PO detail |
| `POST` | `/api/v1/supplier-portal/orders/:id/acknowledge` | `supplier.portal` | Acknowledge PO |
| `POST` | `/api/v1/supplier-portal/orders/:id/accept` | `supplier.portal` | Accept PO |
| `POST` | `/api/v1/supplier-portal/orders/:id/reject` | `supplier.portal` | Reject PO |
| `POST` | `/api/v1/supplier-portal/orders/:id/request-amendment` | `supplier.portal` | Request amendment |
| `POST` | `/api/v1/supplier-portal/orders/:id/propose-delivery-date` | `supplier.portal` | Propose delivery date |
| `POST` | `/api/v1/supplier-portal/orders/:id/confirm-delivery-date` | `supplier.portal` | Confirm delivery date |
| `POST` | `/api/v1/supplier-portal/orders/:id/respond` | `supplier.portal` | Generic response |
| `POST` | `/api/v1/supplier-portal/orders/:id/delivery-ref` | `supplier.portal` | Submit delivery reference |
| `GET` | `/api/v1/supplier-portal/documents` | `supplier.portal` | List documents |
| `POST` | `/api/v1/supplier-portal/documents` | `supplier.portal` | Create document (URL) |
| `POST` | `/api/v1/supplier-portal/documents/upload` | `supplier.portal` | Upload document (base64) |
| `POST` | `/api/v1/supplier-portal/documents/:id/download-url` | `supplier.portal` | Get download URL |
| `POST` | `/api/v1/supplier-portal/documents/:id/archive` | `supplier.portal` | Archive document |
| `GET` | `/api/v1/supplier-portal/performance` | `supplier.portal` | Performance KPIs |
| `GET` | `/api/v1/supplier-portal/profile` | `supplier.portal` | Profile (editable) |
| `POST` | `/api/v1/supplier-portal/orders/:id/approve` | `supplier.portal` | (DEFERRED — stub returns 501) |

### Frontend surface (as-built)

| Route | Component | Lines | Role | Purpose |
|---|---|---|---|---|
| `/admin/inventory` | `AdminInventory.tsx` | 310 | BM/SA | Inventory dashboard (items + adjustments + movements + recipes tab) |
| `/admin/purchasing` | `AdminPurchasing.tsx` | 517 | BM/SA | Procurement dashboard (suppliers + POs + GRN + invoices + payments) |
| `/admin/suppliers` | `AdminSupplierOperations.tsx` | 114 | BM/SA | Supplier operations summary |
| `/supplier` | `SupplierShell.tsx` | 65 | Supplier | Portal shell + layout |
| `/supplier/login` | `SupplierLogin.tsx` | 82 | Supplier | Supplier login |
| `/supplier/dashboard` | `SupplierDashboard.tsx` | 96 | Supplier | Supplier KPI dashboard |
| `/supplier/orders` | `SupplierPurchaseOrders.tsx` | 107 | Supplier | PO list |
| `/supplier/orders/:id` | `SupplierPurchaseOrderDetail.tsx` | 134 | Supplier | PO detail + ack/accept/reject/respond actions |
| `/supplier/documents` | `SupplierDocuments.tsx` | 191 | Supplier | Document list + upload |
| `/supplier/profile` | `SupplierProfilePage.tsx` | 70 | Supplier | Profile editor |

Components: 14 files in `components/admin/inventory/` + `components/admin/purchasing/` (~1500 lines).

### Test coverage

| Category | Files | Lines | Notes |
|---|---|---|---|
| Backend unit/service | 7 | 1365 | inventory (238), inventory-adjust-atomic (185), inventory-recipes (246), inventory-units (37), purchasing (391), grn-stock-posting-atomic (168), rc3-supplier-portal (100) |
| Website static | (touched in 3+ existing tests) | — | admin-inventory-management, admin-purchasing, supplier-portal |
| Database | (touched in 5+ existing tests) | — | foundation-migrations, sprint3-slice2d-order-rls, db-r5-kitchen-tickets, db-r6-pos-bill-foundation, identity-01-tenant-owner-onboarding |
| E2E Playwright | (touched in 4+ specs) | — | dashboard-smoke, role-matrix, polish-qa, opening-scope |

---

## Gap Analysis vs Phase 10 Scope

| # | Sub-area | Status | Explanation |
|---|---|---|---|
| 1 | Ingredients | ✅ DONE | `inventory_items` table with branch scope, 3-state status, cost_price. ADR-033 §1. |
| 2 | Recipe/BOM | ✅ DONE | `inventory_recipes` versioned + one-active-per-menu_item + `inventory_recipe_lines` with waste_factor. Modifier-effect consume DEFERRED (ADR-034 §3, §10). ADR-034. |
| 3 | Stock | ✅ DONE | `current_stock` + `stock_movements` immutable ledger + `adjust_inventory_stock_atomic` RPC. ADR-033 §2-4. |
| 4 | Branch inventory | ✅ DONE | RLS via `current_user_has_branch_access(branch_id)`. Super-admin bypass. ADR-033 §5. |
| 5 | POs | ✅ DONE | `purchase_orders` 8-state machine + approval gate + UNIQUE `(branch_id, po_number)`. ADR-035 §2. |
| 6 | Suppliers | ✅ DONE | `suppliers` branch-scoped + status/approval_status split + supplier portal (20 routes). ADR-035 §1, §8. |
| 7 | Wastage | ✅ DONE | `waste` movement type via `adjust_inventory_stock_atomic` RPC. ADR-033 §3. |
| 8 | Transfers | ⚠️ PARTIAL | `transfer_in` / `transfer_out` movement types EXIST in CHECK constraint. NO dedicated `inventory_transfers` table or transfer endpoint. Currently requires two manual adjustments. DEFERRED (ADR-033 §8). |
| 9 | Alerts | ⚠️ PARTIAL | `minimum_stock` + `reorder_level` columns EXIST. NO automated low-stock alert notification. Display-only in InventoryKPIs. DEFERRED (ADR-033 §8). |
| 10 | Costing | ✅ DONE | `inventory_cogs_events` with `last_known` cost_source. `weighted_average`/`fifo` methods forward-compatible (CHECK constraint allows). DEFERRED to Phase 11 (ADR-034 §5, §10). |

**Summary:** 8 DONE (ingredients, recipe/BOM, stock, branch inventory, POs, suppliers, wastage, costing), 2 PARTIAL (transfers, alerts), 0 NOT STARTED. All PARTIAL gaps are explicitly labeled as deferred in the as-built UI or ADRs.

---

## Deferred Items (with explicit triggers)

| Item | Deferred in | Trigger to revisit |
|---|---|---|
| Low-stock / reorder alerts (automated notification) | ADR-033 §8 | Owner request OR >3 stock-out incidents per branch per month |
| Dedicated `inventory_transfers` table + transfer endpoint | ADR-033 §8 | Second branch opening OR inter-branch stock moves become operational routine |
| Batch / lot tracking | ADR-033 §8 | Regulatory requirement OR >2% waste rate attributable to expiry |
| Cost history (`inventory_cost_history` table) | ADR-033 §8, ADR-034 §10 | Phase 11 — when BMs request historical COGS dashboards |
| DB-level immutability trigger on `stock_movements` | ADR-033 §8 | First audit finding flagging API-only enforcement as insufficient |
| Units master table | ADR-033 §8 | >5 distinct units per branch causing recipe conversion errors |
| Multi-warehouse per branch | ADR-033 §8 | Branch square footage exceeds single-warehouse capacity |
| `sale` movement type wiring (POS-driven finished-goods deduction) | ADR-033 §8 | Phase 11 — when pre-made items require finished-goods inventory tracking |
| Stock count / physical inventory adjustment workflow | ADR-033 §8 | Owner request for quarterly stock count OR shrinkage >2% |
| Modifier-effect consumption (read `inventory_recipe_modifier_effects` in kitchen RPC) | ADR-034 §3, §10 | Owner sign-off that base-recipe-only consume is causing >2% stock variance on modifier-heavy orders |
| COGS GL posting (post `inventory_cogs_events` to GL) | ADR-034 §10 | Phase 11 — when BMs request COGS dashboards in the GL |
| Weighted-average / FIFO costing methods | ADR-034 §10 | Phase 11 — when last-known cost causes COGS distortion >5% |
| Recipe versioning rollback (1-click revert) | ADR-034 §10 | First incident of bad recipe activation causing customer complaints |
| Soft-fail mode for non-critical ingredients | ADR-034 §10 | First incident of kitchen ticket blocking on a single missing ingredient |
| Recipe yield factor enforcement (consume does NOT multiply by yield_factor today) | ADR-034 §10 | Owner request for yield-adjusted recipes OR >3 incidents of over/under-consumption |
| Recipe import/export (bulk CSV) | ADR-034 §10 | Second branch opening |
| Automated 3-way match (system computes variance + sets match_status) | ADR-035 §9 | Owner request OR >3 incidents of invoice over-billing per quarter |
| DB-level PO state-machine trigger | ADR-035 §9 | First incident of invalid transition caused by direct DB write |
| Negative-quantity GRN lines (returns to supplier) | ADR-035 §9 | First incident of supplier return requiring stock reversal |
| Multi-branch PO consolidation | ADR-035 §9 | Franchise expansion OR >5 branches |
| Supplier SSO (SAML / OIDC) | ADR-035 §9 | First enterprise supplier with SSO requirement |
| Supplier-side invoice submission | ADR-035 §9 | >10 active suppliers OR owner request to offload invoice entry |
| Procurement-to-GL automation | ADR-035 §9 | Phase 11 — when BMs request procurement P&L dashboards |
| Supplier performance scoring | ADR-035 §9 | Phase 11 — when procurement KPIs are requested |
| Multi-level PO approval workflow | ADR-035 §9 | First PO > 500,000 PKR |
| RFQ (Request for Quotation) flow | ADR-035 §9 | Owner request for competitive bidding |
| Supplier-side PO ack SLA enforcement | ADR-035 §9 | >2 incidents of unacknowledged urgent POs |
| Contract management (supplier contracts) | ADR-035 §9 | First supplier with negotiated annual pricing |
| Inventory reservation | ADR-035 §9 | First incident of stock-out during PO delivery delay |

---

## Pending Operator Follow-ups (no code blockers)

These are operational configuration tasks inherited from prior phases. None
block Phase 10 closeout — they are listed for completeness.

1. **FU-3** (Phase 2.2): Set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1` on Render.
2. **FU-7** (Phase 3, P2): Set `OTP_HMAC_SECRET` on Render (32+ byte random string).
3. **FU-4** (Phase 2.5): Configure `chart_of_accounts` rows per branch.
4. **FU-5** (Phase 2.4): Configure Supabase Storage bucket `delivery-pod`.
5. **FU-8** (Phase 3): Provision dedicated "Telepizza Login" WhatsApp number.
6. **FU-11** (Phase 7): Configure `finance_account_mappings` rows per branch for POS purposes.
7. **FU-13** (Phase 8): Seed `menu_item_inventory_components` rows per branch for kitchen atomic stock consume.
8. **FU-15** (Phase 9): Set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render.
9. **FU-16** (NEW, Phase 10): Seed `inventory_items` rows per branch for active menu SKUs (dough, cheese, sauce, toppings, packaging). Without this, the kitchen atomic stock consume RPC (ADR-028 §3) cannot deduct stock — orders will post `sale_consumption` movements with zero inventory impact. Operational data setup task; no code change required.
10. **FU-17** (NEW, Phase 10): Seed `inventory_recipes` + `inventory_recipe_lines` rows per branch for each menu item, then call `POST /api/v1/admin/inventory/recipes/:id/activate` to promote to `active` status. Without active recipes, the kitchen atomic stock consume RPC falls back to no-op (logs `missing_recipe` exception in `inventory_stock_exceptions`). Operational data setup task; no code change required.
11. **FU-18** (NEW, Phase 10): Configure Supabase Storage bucket `supplier-documents` — required for supplier document uploads via `POST /api/v1/supplier-portal/documents/upload`. Without this bucket, supplier document uploads return HTTP 503. Operational storage setup task; no code change required.

---

## Phase 11 Unlock

Phase 11 (Finance and Reporting) is now UNLOCKED. Dependencies satisfied:

- ✅ Phase 5 (Order Lifecycle, ADR-018) — closed v2.0.0
- ✅ Phase 6 (Admin & ERP Core, ADR-019/020/021/022) — closed v2.1.0
- ✅ Phase 7 (POS, ADR-023/024/025/026) — closed v2.2.0
- ✅ Phase 8 (Kitchen Dashboard, ADR-027/028/029) — closed v2.3.0
- ✅ Phase 9 (Rider and Delivery App, ADR-030/031/032) — closed v2.4.0
- ✅ Phase 10 (Inventory and Procurement, ADR-033/034/035) — closed v2.5.0

The Phase 10 inventory COGS events (`inventory_cogs_events`, ADR-034 §5)
+ the Phase 7 POS cash reconciliation (`cash_reconciliations`, ADR-025)
+ the Phase 2.5 accounting events (`domain_events`, ADR-012) + the
Phase 9 COD reconciliation (`cod_collections`, ADR-010) provide the
data foundation for Phase 11's revenue / expense / P&L / tax / refund
reports. Phase 11 will elevate these to formal ADRs (likely ADR-036
through ADR-038) and add the finance-facing dashboards.

---

## Conclusion

Phase 10 (Inventory and Procurement) is **COMPLETE & SHIPPED** as
v2.5.0. The closeout formally elevates the as-built inventory +
procurement surface — which has been live in Production since v1.8.0
(purchasing + GRN), v1.9.0 (atomic stock adjustments), and v2.0.0
(versioned recipes + COGS) — to three new ADRs (ADR-033, ADR-034,
ADR-035). No new migrations and no new code were required. All 35 ADRs
are now Accepted v1.0 with standalone files under `docs/13-adr/`.

The remaining PARTIAL gaps (transfers, alerts, modifier-effect consume,
COGS GL posting) are explicitly deferred with documented trigger
conditions. The backend contract is stable and will not change when
these gaps are filled in future phases.

**Next major workstream:** Phase 11 (Finance and Reporting) — UNLOCKED.
