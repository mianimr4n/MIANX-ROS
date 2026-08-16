# PHASE 9 FINAL GATE — Rider and Delivery App

**Phase:** 9 — Rider and Delivery App
**Status:** ✅ COMPLETE & SHIPPED (v2.4.0)
**Date closed:** 2026-08-16
**Release:** [v2.4.0](https://github.com/mianimr4n/telepizza/releases/tag/v2.4.0)
**Closeout type:** Closeout-only — no new migrations applied. Production DB tip unchanged from Phase 5/6/7/8 closeouts.

---

## Scope

Phase 9 covers the rider and delivery operational surface, comprising eight
sub-areas per the master roadmap:

1. Rider login
2. Assignment
3. Pickup
4. Navigation
5. Out-for-delivery
6. POD (Proof of Delivery)
7. Failed delivery
8. Performance

The phase is largely already implemented in code and Production across three
prior waves: Phase 1 foundation (riders + deliveries tables, rider role),
Phase 2.4 / v1.8.0 (ADR-007 delivery state machine), and Phase 2.4 / v1.9.0
(ADR-008 rider location + ADR-009 POD + ADR-010 COD). Phase 9 closeout
formally elevates the as-built design to three new ADRs (ADR-030, ADR-031,
ADR-032) — no new migrations and no new code are required.

---

## Formal ADRs Accepted in This Closeout

| ADR | Title | Status | Implemented in |
|---|---|---|---|
| ADR-030 | Rider Identity, Dispatch & Assignment Contract | Accepted v1.0 | v2.4.0 (Phase 9 closeout) |
| ADR-031 | Delivery Lifecycle, Pickup & POD Surface | Accepted v1.0 | v2.4.0 (Phase 9 closeout) |
| ADR-032 | Rider Location, Navigation & Performance Contract | Accepted v1.0 | v2.4.0 (Phase 9 closeout) |

**All 32 ADRs (ADR-001..ADR-032) Accepted v1.0 with standalone files under `docs/13-adr/`.**

---

## Gate Criteria (all PASS)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | ADR-030 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-030-rider-identity-dispatch-assignment-contract.md` |
| 2 | ADR-031 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-031-delivery-lifecycle-pickup-pod-surface.md` |
| 3 | ADR-032 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-032-rider-location-navigation-performance-contract.md` |
| 4 | ADR_INDEX.md updated with ADR-030/031/032 rows + Note | ✅ PASS | `docs/00-governance/ADR_INDEX.md` lines 70-72, 103-116 |
| 5 | Phase 9 verify script exists with 70+ checks | ✅ PASS | `scripts/phase_9_verify.py` (10 categories, 70+ checks) |
| 6 | Master roadmap Phase 9 row marked Complete | ✅ PASS | `docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md` Phase 9 section |
| 7 | REPOSITORY_STATUS.md updated to Phase 9 COMPLETE | ✅ PASS | `docs/00-governance/REPOSITORY_STATUS.md` |
| 8 | CHANGELOG.md has v2.4.0 entry | ✅ PASS | `CHANGELOG.md` |
| 9 | Release notes v2.4.0 authored | ✅ PASS | `docs/releases/v2.4.0_RELEASE_NOTES.md` |
| 10 | PR opened, CI green, merged to main | ✅ PASS | PR #236 (squash merge) |
| 11 | Annotated tag v2.4.0 created + pushed | ✅ PASS | tag object on origin |
| 12 | GitHub Release v2.4.0 published | ✅ PASS | https://github.com/mianimr4n/telepizza/releases/tag/v2.4.0 |
| 13 | Production DB tip unchanged (closeout-only) | ✅ PASS | `20260821000000_adr_016_017_otp.sql` (Phase 3 OTP, same as Phase 5/6/7/8) |
| 14 | No new migrations required | ✅ PASS | All rider/delivery migrations already in Production (foundation + ADR-007 + ADR-008/009/010) |
| 15 | No new code required | ✅ PASS | All rider/delivery code already shipped in v1.8.0/v1.9.0/v2.0.0/v2.1.0 |
| 16 | Worklog updated with phase-9-audit + phase-9-shipped entries | ✅ PASS | `worklog.md` |

---

## Production Verification

### Database state (Production Supabase `pyeowxvacgypohrbvgee`)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `riders` | table | ✅ in Production | `20260713190000_foundation_schema.sql` |
| `deliveries` | table | ✅ in Production | `20260713190000_foundation_schema.sql` |
| `delivery_state_transitions` | table (append-only audit) | ✅ in Production | `20260814180000_adr_007_delivery_state_machine.sql` |
| `rider_locations` | table (ephemeral GPS) | ✅ in Production | `20260817000000_adr_008_009_010_delivery_rider.sql` |
| `delivery_pod` | table (POD) | ✅ in Production | `20260817000000_adr_008_009_010_delivery_rider.sql` |
| `cod_collections` | table (COD reconciliation) | ✅ in Production | `20260817000000_adr_008_009_010_delivery_rider.sql` |
| `delivery_valid_next_states(text)` | IMMUTABLE function | ✅ in Production | ADR-007 migration |
| `purge_expired_rider_locations(integer)` | SECURITY DEFINER function | ✅ in Production | ADR-008/009/010 migration |
| `enforce_delivery_transition_append_only()` | trigger function | ✅ in Production | ADR-007 migration |
| `trg_validate_delivery_state_transition` | BEFORE UPDATE trigger | ✅ in Production | ADR-007 migration (extended for POD-mandatory in ADR-009 migration) |
| `trg_delivery_transition_no_update` | trigger | ✅ in Production | ADR-007 migration |
| `trg_delivery_transition_no_delete` | trigger | ✅ in Production | ADR-007 migration |
| RLS enabled on riders, deliveries, delivery_state_transitions, rider_locations, delivery_pod, cod_collections | RLS | ✅ in Production | Foundation + ADR-007 + ADR-008/009/010 migrations |

**Production DB tip:** `20260821000000_adr_016_017_otp.sql` (Phase 3 OTP — unchanged since Phase 5 closeout).

### Backend API surface (as-built)

| Method | Path | Permission | Purpose | ADR |
|---|---|---|---|---|
| `GET` | `/api/v1/riders/assignments` | `delivery.read` | List deliveries (rider sees own; BM/SA sees branch) | ADR-030 §2, ADR-031 §10 |
| `GET` | `/api/v1/riders/roster` | `delivery.assign` | List riders in branch | ADR-030 §3 |
| `POST` | `/api/v1/riders/deliveries/:id/assign` | `delivery.assign` | Assign rider (BM/SA only) | ADR-030 §3 |
| `POST` | `/api/v1/riders/deliveries/:id/status` | `delivery.update` OR `delivery.assign` | Transition (assigned/picked-up/delivered) | ADR-031 §3 |
| `POST` | `/api/v1/admin/rider-locations` | `delivery.access` | Ingest GPS ping | ADR-032 §5 |
| `GET` | `/api/v1/admin/rider-locations/delivery/:id` | `delivery.access` | List pings for delivery | ADR-032 §5 |
| `GET` | `/api/v1/admin/rider-locations/rider/:id/latest` | `delivery.access` | Latest ping for rider | ADR-032 §5 |
| `POST` | `/api/v1/admin/delivery-pod` | `delivery.access` | Capture POD | ADR-031 §5, ADR-009 |
| `GET` | `/api/v1/admin/delivery-pod/:deliveryId` | `delivery.access` | Fetch POD | ADR-031 §5, ADR-009 |
| `POST` | `/api/v1/admin/cod/collections` | `delivery.access` | Record COD collection | ADR-010 |
| `GET` | `/api/v1/admin/cod/collections` | `delivery.access` | List COD collections | ADR-010 |
| `GET` | `/api/v1/admin/cod/collections/:id` | `delivery.access` | Single COD detail | ADR-010 |
| `POST` | `/api/v1/admin/cod/collections/:id/reconcile` | `admin.access` OR `finance.manage` | Reconcile with handed-in amount | ADR-010 |
| `POST` | `/api/v1/admin/cod/collections/:id/resolve` | `admin.access` OR `finance.manage` | Resolve shortage/overage → reconciled | ADR-010 |

### Frontend surface (as-built)

| Route | Component | Lines | Role | Purpose |
|---|---|---|---|---|
| `/admin/delivery` | `AdminDelivery.tsx` | 550 | BM/SA/CS | Owner ERP dispatch + assignment surface (8s polling) |
| `/admin/home/delivery` | `AdminDeliveryHome.tsx` | 160 | BM/SA/CS | Home tile summary |
| `/track/:orderNumber` | `TrackOrder.tsx` | 316 | Customer | Customer-facing tracking (status pills only, NO live map) |
| `/ops/dispatch` | `OpsDispatch.tsx` | 162 | BM/SA/CS | Ops dispatch board |

Components (8 files, 1187 lines total): `DeliveryCards`, `DeliveryDrawer`, `DeliveryFilters`, `DeliveryInsights`, `DeliveryKPIs`, `DeliverySidePanels` (includes `DeliveryMapFoundation` placeholder + `DeliveryPerformance`), `DeliveryTimeline`, `DispatchQueue`.

Helper libs: `lib/admin-delivery.ts` (139 lines — `DELIVERY_LATE_MINUTES`, `averageDeliveryMinutes`), `lib/ops-api.ts` (235 lines — typed fetchers).

Access helpers: `lib/admin-access.ts` (647 lines — `canAccessAdminDelivery`, `canAssignDeliveries`, `canUpdateDeliveries`).

### Test coverage

| Category | Files | Lines | Notes |
|---|---|---|---|
| Backend unit/service | 7 | 2313 | cod-service (688), delivery-pod-service (419), delivery-state-machine (238), phase2-delivery-settings (169), rider-location-service (500), riders-auth (31), riders-delivery.authz (268) |
| Website static | 1 | 66 | admin-delivery-management-v1 |
| Database | (touched in 5+ existing tests) | — | foundation-migrations, sprint3-slice2d-order-rls, db-r6-pos-bill-foundation, identity-01-tenant-owner-onboarding, db-r5-kitchen-tickets |
| E2E Playwright | (9 specs touch delivery as smoke) | — | d3/dashboard-smoke, d4/role-matrix, dashboard-ux/task-based-acceptance, opening/opening-scope-full, polish-qa/certification, polish-qa/multi-role, rc4/loyalty-marketing-depth, rc5/owner-critical-smoke, rc5/owner-smoke-readonly.guard |
| Playwright configs | 21 | — | NONE rider/delivery-specific |

---

## Gap Analysis vs Phase 9 Scope

| # | Sub-area | Status | Explanation |
|---|---|---|---|
| 1 | Rider login | ✅ DONE | `rider` role + `/staff/login` + ADR-019 RBAC. `isRiderOnly` scope check. No dedicated `/api/v1/rider/*` surface (uses `/api/v1/riders/*`). |
| 2 | Assignment | ✅ DONE | `POST /api/v1/riders/deliveries/:id/assign` with `delivery.assign` (BM/SA only). 8 invariants enforced. Manual only — auto-dispatch DEFERRED (ADR-030 §5). |
| 3 | Pickup | ✅ DONE | `POST /api/v1/riders/deliveries/:id/status` body `{status:'picked-up'}` with `delivery.update`. Sets `picked_up_at`. Mirrors `orders.status='dispatched'`. |
| 4 | Navigation | ⚠️ PARTIAL | `rider_locations` table accepts GPS. Ingest endpoint exists. NO map UI in AdminDelivery (placeholder only). NO turn-by-turn. Customer `TrackOrder.tsx` has NO live map. DEFERRED to Phase 12 (ADR-032 §10, §11). |
| 5 | Out-for-delivery | ✅ DONE (by-design) | `picked-up` IS the "out for delivery" state. ADR-018 §4 explicitly rejected separate `out_for_delivery` status. Order label "Dispatched" = delivery label "picked-up". |
| 6 | POD | ✅ DONE | ADR-009 fully implemented. Mandatory for `delivered` (trigger + service + UI). DEFERRED: customer-facing POD view, POD OCR, video POD (ADR-031 §8). |
| 7 | Failed delivery | ⚠️ PARTIAL | `failed` terminal state in state machine. NO dedicated failed-delivery capture endpoint. Riders cannot trigger `failed` (schema rejects). NO `failure_reason`/`failure_category`/`return_to_branch` fields. DEFERRED (ADR-031 §6, §7). |
| 8 | Performance | ⚠️ PARTIAL | Aggregate KPIs in `DeliveryKPIs` + `DeliveryInsights` + `DeliveryPerformance` (delivery count, avg minutes, late count). NO per-rider KPIs. NO `rider_daily_summaries` table. DEFERRED to Phase 12 (ADR-032 §8, §9). |

**Summary:** 4 DONE (rider login, assignment, pickup, POD), 4 PARTIAL (navigation, out-for-delivery by-design, failed delivery, performance), 0 NOT STARTED. All PARTIAL gaps are explicitly labeled as deferred in the as-built UI or ADRs.

---

## Deferred Items (with explicit triggers)

| Item | Deferred in | Trigger to revisit |
|---|---|---|
| Auto-dispatch engine (rider scoring, auto-assign on confirmed) | ADR-030 §5 | Branch volume > 50 deliveries/day OR owner sign-off that dispatch latency is hurting SLA |
| Rider self-assign queue (FIFO pull) | ADR-030 §6 | Owner sign-off that BM dispatch latency is hurting SLA |
| Rider shift scheduling integration (sync riders.status with hr_shift_scheduling) | ADR-030 §6 | Phase 12 (Customer and Staff Apps) — rider mobile app |
| Rider capacity cap (`max_active_deliveries` column) | ADR-030 §6 | When auto-dispatch is added |
| Multi-branch riders (franchise floater) | ADR-030 §6 | Franchise expansion (Phase 15+) |
| Rider vehicle + license tracking | ADR-030 §6 | Regulatory requirement or insurance underwriting |
| Failed-delivery capture (`delivery_failures` table + rider endpoint) | ADR-031 §6 | First unresolvable failed-delivery dispute OR >5% failure rate |
| Redelivery flow (`original_delivery_id` FK + RPC) | ADR-031 §7 | Same as failed-delivery capture |
| Customer-facing POD view (`/api/v1/orders/:id/pod`) | ADR-031 §8 | Phase 12 customer mobile app |
| Live rider map (Realtime channels + map rendering + customer RLS) | ADR-031 §9 | Phase 12 customer mobile app |
| Single-transaction delivery+order mirror (eliminate compensating rollback) | ADR-031 §10 | When `DELIVERY_ORDER_INCONSISTENT` appears in prod logs >1/quarter |
| Delivery SLA tracking (`sla_target_minutes` + late-alert events) | ADR-031 §10 | Phase 11 (Finance and Reporting) — when BMs request SLA dashboards |
| `rider_daily_summaries` table (pre-aggregated per-rider per-day stats) | ADR-032 §8, §9 | Owner request for rider performance reviews OR >20 active riders per branch |
| Per-rider KPI dashboard | ADR-032 §8 | Same as above |
| Rider mobile app (turn-by-turn, in-app call, offline-tolerant) | ADR-032 §10 | Phase 12 (Customer and Staff Apps) |
| Customer-facing live map (Realtime + map + customer RLS) | ADR-032 §11 | Phase 12 customer mobile app |
| Audible alarms + push notifications | ADR-032 §12 | Phase 12 (rider mobile app context required) |
| TTL job failsafe (auto-enable if env var unset >48h) | ADR-032 §12 | First incident of unbounded `rider_locations` growth in Production |
| Reverse geocoding at read-time | ADR-032 §12 | When dispatchers request address labels on the live map |

---

## Pending Operator Follow-ups (no code blockers)

These are operational configuration tasks inherited from prior phases. None
block Phase 9 closeout — they are listed for completeness.

1. **FU-3** (Phase 2.2): Set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1` on Render.
2. **FU-7** (Phase 3, P2): Set `OTP_HMAC_SECRET` on Render (32+ byte random string).
3. **FU-4** (Phase 2.5): Configure `chart_of_accounts` rows per branch (CASH + ACCOUNTS_RECEIVABLE).
4. **FU-5** (Phase 2.4): Configure Supabase Storage bucket `delivery-pod` — required for POD photo/signature uploads. Without this bucket, riders cannot capture POD, which blocks the `delivered` transition.
5. **FU-8** (Phase 3): Provision dedicated "Telepizza Login" WhatsApp number (never `0304-1110495` for OTP).
6. **FU-11** (Phase 7): Configure `finance_account_mappings` rows per branch for POS purposes (`cash_on_hand`, `cash_over_short`, `sales_revenue`, `sales_discounts`, `output_tax`). Without these, cash reconciliation cannot post to the GL.
7. **FU-13** (Phase 8): Seed `menu_item_inventory_components` rows per branch for kitchen atomic stock consume.
8. **FU-15** (NEW, Phase 9): Set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render — without this env var, the hourly `purge_expired_rider_locations` job does not run, and `rider_locations` rows accumulate indefinitely (per ADR-008 §3 + ADR-032 §3). Operational discipline task; no code change required.

---

## Phase 10 Unlock

Phase 10 (Inventory and Procurement) is now UNLOCKED. Dependencies satisfied:

- ✅ Phase 5 (Order Lifecycle, ADR-018) — closed v2.0.0
- ✅ Phase 6 (Admin & ERP Core, ADR-019/020/021/022) — closed v2.1.0
- ✅ Phase 7 (POS, ADR-023/024/025/026) — closed v2.2.0
- ✅ Phase 8 (Kitchen Dashboard, ADR-027/028/029) — closed v2.3.0
- ✅ Phase 9 (Rider and Delivery App, ADR-030/031/032) — closed v2.4.0

The Phase 8 kitchen atomic stock consume (`kitchen_ticket_set_preparing_atomic`
RPC, ADR-028) already deducts from `inventory_items` — Phase 10 will build
the full procurement loop (POs, GRN, suppliers, wastage, transfers, costing)
on top of the existing inventory backend shipped in RC3.

---

## Conclusion

Phase 9 (Rider and Delivery App) is **COMPLETE & SHIPPED** as v2.4.0. The
closeout formally elevates the as-built rider/delivery surface — which has
been live in Production since v1.8.0 (ADR-007) and v1.9.0 (ADR-008/009/010) —
to three new ADRs (ADR-030, ADR-031, ADR-032). No new migrations and no new
code were required. All 32 ADRs are now Accepted v1.0 with standalone files
under `docs/13-adr/`.

The remaining PARTIAL gaps (navigation, failed-delivery capture, per-rider
KPIs, rider mobile app, customer live map) are explicitly deferred to Phase
12 (Customer and Staff Apps) with documented trigger conditions. The backend
contract is stable and will not change when the rider mobile app is built.

**Next major workstream:** Phase 10 (Inventory and Procurement) — UNLOCKED.
