# Changelog

All notable changes to **Telepizza ROS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For full release notes see [`docs/releases/`](./docs/releases/) and
[`docs/00-governance/REPOSITORY_STATUS.md`](./docs/00-governance/REPOSITORY_STATUS.md).

---

## [2.2.0] — 2026-08-16 — Phase 7 Complete (POS System)

**Phase 7 — POS System — is FEATURE-COMPLETE and Production-verified.**

This release ships **4 ADRs**: ADR-023 (POS Cashier Workflow & Order Source
Contract), ADR-024 (Dine-in Bill Settlement & Multi-tender Payments), ADR-025
(POS Shifts, Z-Report & Cash Reconciliation), and ADR-026 (Branch Sync &
Offline-Safe POS Contract). All 26 ADRs (ADR-001 through ADR-026) are now
Accepted v1.0 with standalone ADR markdown files under `docs/13-adr/`.

Phase 7 is a **closeout phase**: the underlying code has been in Production
since Sprint 4 (DB-R3..R6, July 2026), D3 corrective pass (July 2026), and
RC3 Finance PR1-PR2 (July 2026). This phase formally accepts the as-built POS
architecture via the 4 new ADRs and provides a POS-focused verification script
(`scripts/phase_7_verify.py`) with 105+ checks across 10 categories.
**No new database migrations** — Phase 7 is documentation + verification only.
The Production DB tip remains `20260821000000` (same as Phase 5/6 closeouts).

Backend tests: **1096 passing** (unchanged from v2.1.0 — no new code, only
ADRs and verification script). Phase 8 (Kitchen Dashboard) is now UNLOCKED.

### ADR-023 — POS Cashier Workflow & Order Source Contract

- Formally accepts the as-built POS cashier surface: `orders.order_source =
  'pos'` stamp, `delivery|pickup|dine-in` order type matrix, branch
  operational gate (`assertBranchOperational`), and Idempotency-Key requirement
  on every POS write.
- Documents the cashier permission contract: cashier HAS `order.create` +
  `payment.settle` but LACKS `order.manage` + `payment.void` +
  `payment.override_close` — enforcing segregation of duties between
  cashiers (place + settle) and branch-managers (transition + void + override).
- Records the cash-only payment contract at place-order: `paymentMethod:
  z.literal("cash")` enforced in the request schema; non-cash methods return
  `400 INVALID_PAYMENT_METHOD`. Card / bank / complimentary are only available
  through the bill settlement RPC (`settle_bill_payment_atomic`).
- Documents the API surface: `POST /api/v1/admin/pos/orders` (cashier
  place-order), `GET/POST /api/v1/admin/pos/z-report` (shift-close audit).
- Explicitly defers receipts (UI preview only), online card gateway, and
  `pos_sessions` table to future ADRs with trigger conditions.

### ADR-024 — Dine-in Bill Settlement & Multi-tender Payments

- Formally accepts the as-built dine-in bill settlement architecture: the
  `restaurant_bills` lifecycle (`open → billed → paid|voided`), the
  `bill_orders` UNIQUE on `order_id` (one bill per order), and the
  Option B auto-link (dine-in order → confirmed → bill).
- Documents the `settle_bill_payment_atomic` RPC as the sole entry point for
  bill payment settlement: single-transaction with `SELECT FOR UPDATE` bill
  lock, idempotency replay, method-specific validation (cash change computed
  server-side, complimentary must match remaining exactly, card/bank reject
  overpay), payment INSERT, audit INSERT, bill status update.
- Records the 4 allowed payment methods: `cash`, `card_terminal`,
  `bank_manual`, `complimentary` — no online card gateway integration
  (documented honestly in the `payments` table comment).
- Documents the 4 deterministic bill split strategies: `equal` (cent-precise
  rounding via `splitEqual` helper), `by_item`, `by_quantity`, `by_amount`
  — all with `allocation_sum = original_total` CHECK constraint.
- Records the deposit → bill application flow: `reservation_deposits` can be
  applied to a bill at most once (UNIQUE partial index).
- Documents the RLS hard gate: `current_user_can_access_restaurant_bills()`
  helper restricts access to cashier + branch-manager + super-admin only.

### ADR-025 — POS Shifts, Z-Report & Cash Reconciliation

- Formally accepts the two-tier shift model: `pos_z_report_events` (append-only
  shift-close audit, cashier's claim) vs `cash_reconciliations` (draft →
  submitted → approved → posted state machine, manager's verification).
  This separation enforces segregation of duties between cashier (prepares)
  and branch-manager (reviews) and finance (posts).
- Documents the `compute_cash_reconciliation_totals` RPC as IMMUTABLE +
  SECURITY DEFINER — the server is the source of truth for `expected_cash`
  and `variance`. The client never computes these.
- Records the cash reconciliation formula: `expected_cash = opening_float +
  cash_sales - cash_refunds - cash_drops - paid_out_expenses + other_inflows
  - other_outflows`; `variance = counted_cash - expected_cash`.
- Documents the GL posting flow on approval: creates `journal_entries` +
  `journal_lines` (debit `cash_on_hand`, credit `sales_revenue` or
  `cash_over_short` for variance), updates `cash_reconciliations.posting_status
  = 'posted'`. Idempotent via `finance_postings` UNIQUE on
  `(source_module, source_id)`.
- Records the Asia/Karachi timezone invariant: `branches.timezone` NOT NULL
  with default `Asia/Karachi`; `pos_z_report_events.timezone` default
  `Asia/Karachi`. Multi-timezone support deferred to future ADR.
- Explicitly defers `pos_sessions` table (opening float at shift-open) —
  single-register branches capture opening float at cash reconciliation time.

### ADR-026 — Branch Sync & Offline-Safe POS Contract

- Formally accepts the as-built V1 contract: "branch sync" = centralized DB +
  `branch_id` scoping + RLS (NOT multi-DB sync); "offline-safe" = Idempotency-
  Key on all POS writes + optimistic UI (NOT offline-first PWA).
- Documents the conflict resolution strategy: last-write-wins for non-idempotent
  writes (status transitions — ADR-018 §8 idempotent transitions), replay for
  idempotent writes (settlement RPC returns original payment row with
  `idempotentReplay: true`).
- Records the RLS hard gate: `current_user_has_branch_access(branch_id)` on
  every POS table — even buggy application code cannot leak cross-branch data.
- Documents the network drop handling UX: cashier can retry safely (same
  Idempotency-Key returns original response), refresh loses cart (no local
  persistence — known V1 limitation), orders list confirms successful creation.
- Explicitly defers offline PWA with local cart persistence, real-time
  subscriptions (Supabase Realtime), multi-region DB, and `pos_sessions` table
  — each with an explicit trigger condition for revisiting.

### Phase 7 Production Verification

`scripts/phase_7_verify.py` — 105+ checks across 10 categories:

| Area | Count | Status |
|---|---|---|
| POS tables | 13 | restaurant_bills, bill_orders, bill_splits, bill_split_allocations, reservation_deposits, payments, pos_z_report_events, cash_reconciliations, cash_reconciliation_events, finance_postings, finance_account_mappings, expense_claims, expense_claim_events |
| POS-related tables | 20 | orders, order_items, order_status_logs, dine_in_sessions, restaurant_tables, dining_session_tables, dining_session_servers, kitchen_tickets, kitchen_ticket_items, table_service_audit, deliveries, branches, users, roles, permissions, role_permissions, user_roles, chart_of_accounts, journal_entries, journal_lines |
| CHECK constraints | 8 | restaurant_bills.status (4 values), payments.method (4 methods), payments.status (8 values), bill_splits.strategy (4 strategies), cash_reconciliations.status (6 states), cash_reconciliations.posting_status (5 states), orders.order_source (3 sources), orders.order_type (3 types) |
| Triggers | 4 | restaurant_bills branch match + immutability, bill_orders open check, set_updated_at |
| RPCs + helpers | 17 | settle_bill_payment_atomic, compute_cash_reconciliation_totals, next_restaurant_bill_number, enforce_restaurant_bill_branch_match, enforce_restaurant_bill_immutability, enforce_bill_orders_bill_open, branch_local_date, branch_wall_to_utc, current_user_can_access_restaurant_bills, current_user_has_branch_access, current_user_is_super_admin, current_user_is_active, current_app_user_id, current_user_branch_ids, create_order_atomic, reverse_journal_entry_atomic, record_supplier_payment_atomic |
| RLS-enabled tables | 17 | All POS + order/dine-in tables |
| POS permissions | 11 | order.create/manage/read, payment.settle/void/override_close, deposit.manage, dinein.manage, floor.manage, reservation.read/manage |
| Cashier authz | 5 | cashier HAS create+settle; LACKS manage+void+override_close (segregation of duties) |
| Idempotency UNIQUE indexes | 7 | payments, cash_reconciliations, reservation_deposits, orders, finance_postings + bill_orders.order_id UNIQUE + restaurant_bills one-open-per-session + cash_reconciliations active-per-day-per-register |
| Finance + timezone | 4 | chart_of_accounts non-empty, journal_entries exists, branches.timezone default Asia/Karachi, branches.timezone NOT NULL |

**Phase 7 verification approach:** Phase 7 is closeout-only — no new migrations
applied. Production DB tip remains `20260821000000` (same as Phase 5/6). All
POS-related schema was already verified during Phase 6's 95/95 PASS run. The
Phase 7 verify script is provided as an artifact for future re-verification
(e.g., after database restore, infrastructure migration, or Phase 14 gate
checks). Run with `SUPABASE_PAT=<token> python3 scripts/phase_7_verify.py`.

### Deferred Items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| Online card gateway (Stripe / Braintree) | Card payments >30% of revenue |
| Offline PWA with local cart persistence | Branch reports >5 network drops/week |
| Real-time orders list auto-refresh | Branch exceeds 200 orders/day |
| `pos_sessions` table (shift open lifecycle) | Multi-register branches |
| Receipts format spec + fiscal printer | Regulatory requirement or printer procurement |
| Multi-timezone support | International expansion |
| Multi-region DB (read replicas) | Latency >200ms for any branch |
| Refunds (`payments.refunded_at` lifecycle) | Refund volume >5% of payments |

### Pending Operator Actions (no code blockers)

| ID | Severity | Action |
|---|---|---|
| FU-3 | P3 | Set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1` on Render |
| FU-4 | P3 | Configure `chart_of_accounts` rows per branch (CASH + ACCOUNTS_RECEIVABLE) |
| FU-5 | P3 | Configure Supabase Storage bucket `delivery-pod` |
| FU-7 | **P2** | Set `OTP_HMAC_SECRET` env var on Render (32+ byte random string) |
| FU-8 | P3 | Provision dedicated "Telepizza Login" WhatsApp number |
| FU-11 | P3 | **NEW** — Configure `finance_account_mappings` rows per branch for POS purposes (`cash_on_hand`, `cash_over_short`, `sales_revenue`, `sales_discounts`, `output_tax`). Without these, cash reconciliation cannot post to the GL. |

---

## [2.1.0] — 2026-08-16 — Phase 6 Complete (Admin and ERP Core)

**Phase 6 — Admin and ERP Core — is FEATURE-COMPLETE and Production-verified (95/95 PASS).**

This release ships **4 ADRs**: ADR-019 (RBAC Authorization Principal & Permission
Model), ADR-020 (Canonical Single-Price Menu Catalog & Atomic Price Audit),
ADR-021 (Deals, Coupons & Loyalty Promotion Engine), and ADR-022 (Reports &
Analytics Framework — Query-Time KPI Registry). All 22 ADRs (ADR-001 through
ADR-022) are now Accepted v1.0 with standalone ADR markdown files under
`docs/13-adr/`.

Phase 6 is a **closeout phase**: the underlying code has been in Production since
Sprint 3 / RC3 / RC4-11 (July–August 2026). This phase formally accepts the
as-built architecture via the 4 new ADRs and verifies Production readiness
end-to-end with 95 checks across 10 categories (RBAC tables, role catalog,
permission catalog, RBAC invariants, menu catalog, promo tables, loyalty RPCs
+ tiers, analytics tables + invariants, settings + branches, audit re-verify).
**No new database migrations** — Phase 6 is documentation + verification only.

Backend tests: **1096 passing** (unchanged from v2.0.0 — no new code, only ADRs
and verification). All 6 CI checks green. Phase 7 (POS System) is now UNLOCKED.

### ADR-019 — RBAC Authorization Principal & Permission Model

- Formally accepts the as-built authorization surface: `users → user_roles →
  roles → role_permissions → permissions` 5-table graph, branch-scoped via
  `user_role_branches`.
- Documents the dual role namespace (legacy kebab-case `super-admin` /
  `branch-manager` / `customer-support` + canonical underscored
  `platform_super_admin` / `organization_owner` / `branch_manager` etc.) — both
  resolve to the same permission set via the IDENTITY-01 mirror grants.
- Records the `isSuperAdmin` short-circuit (`platform_super_admin` and
  `super-admin` both bypass per-permission lookup).
- Records the `CUSTOMER_FORBIDDEN_PERMISSIONS` allowlist
  (`backend/api/src/services/auth/principal.ts:51-66`) as defense-in-depth
  against customer privilege escalation, alongside the
  `enforce_customer_role_zero_permissions` trigger.
- Documents the middleware pipeline: `createRequireAuth` (JWT) →
  `createRequireAuthenticatedUser` (DB principal + active status) →
  `requirePermission(code)` (role_permissions check) → service-layer branch
  scoping (`assertBranchMembership` / `resolveScopedBranchIds`).
- Records the staff assignment constraints: `ASSIGNABLE_STAFF_ROLES`
  (`branch-manager, cashier, kitchen, rider, customer-support, host, waiter`)
  and `FORBIDDEN_ROLE_CODES` (`super-admin, owner, founder, admin, customer`).

### ADR-020 — Canonical Single-Price Menu Catalog & Atomic Price Audit

- Formally accepts the Sprint 4 Phase B frozen architecture: every sellable
  SKU is one `menu_items` row with exactly one `price` (NOT NULL, `CHECK >= 0`).
- Documents the deprecation of `menu_item_variants` (retained read-only for
  historical `order_items.variant_id` readability) and the
  `menu_variant_sku_mappings` 1:1 mapping table.
- Records the `trg_prevent_menu_item_variant_writes` trigger (hard block on
  any INSERT/UPDATE/DELETE to `menu_item_variants` unless
  `telepizza.allow_variant_writes='on'`).
- Documents the `update_menu_item_price_atomic` RPC: single-transaction price
  update + audit row insert; idempotent via `(resource_id, action,
  correlation_id)` unique index; optimistic concurrency via
  `p_expected_old_price`.
- Records the `menu_audit_events` append-only audit table (before_data /
  after_data JSONB snapshots, correlation_id, actor_user_id).
- Documents the inactive `branch_menu_item_overrides` reservation (founder
  approval required before any code reads it; per-branch promotions flow
  through coupons / loyalty rewards instead).
- Records the orthogonal modifier system (`modifier_groups`,
  `modifier_options`, `item_modifier_groups`, `order_item_modifiers`).

### ADR-021 — Deals, Coupons & Loyalty Promotion Engine

- Formally accepts the three-engine promotions surface as the canonical
  architecture: **Coupons** (single-use discount codes) + **Marketing
  campaigns & consent** (bulk WhatsApp/SMS/email/push) + **Loyalty program**
  (points ledger + tier definitions + reward catalogue). Three independent
  engines, no shared table.
- Documents the `coupon_validate_discount` read-only validation RPC (quote
  path validates without writing; create path writes `coupon_redemptions` in
  the same transaction as the order).
- Records the loyalty ledger's double-entry-shaped model: 5 atomic RPCs
  (`loyalty_earn_for_order_atomic`, `loyalty_burn_atomic`,
  `loyalty_adjust_atomic`, `loyalty_expire_atomic`, `loyalty_reverse_atomic`),
  each with `FOR UPDATE` lock on `loyalty_accounts`, balance non-negativity
  check, and idempotency key support.
- Documents the 3 idempotency indexes on `loyalty_transactions`:
  `loyalty_transactions_earn_order_uidx` (one earn per order),
  `uq_loyalty_txn_idempotency` (burn/adjust/expire/reverse replay is no-op),
  `uq_loyalty_txn_reverse_once` (one reverse per original transaction).
- Records the loyalty reward approval workflow: `draft → awaiting_approval →
  approved` (or `rejected`); only `approved AND is_active` rewards are
  redeemable.
- Documents the 4 loyalty tier definitions (member / silver / gold / platinum
  with thresholds 0 / 500 / 2000 / 5000 lifetime earned points and multipliers
  ×1.0 / ×1.1 / ×1.25 / ×1.5).
- Records the **honest provider states only** invariant for marketing
  campaigns: `queued | suppressed | submitted | provider_accepted |
  provider_rejected | failed` — **no `delivered` status** (WhatsApp/SMS
  providers cannot reliably report per-message delivery).
- Documents the 10 deterministic marketing segments (new_customers,
  returning_customers, inactive_customers, loyalty_members, tier_members,
  high_frequency, high_spend, coupon_users, lapsed_customers,
  consented_audiences) with documented `formula`, `authoritative_source`,
  `time_window`, `exclusions`.
- Records the explicit-attribution-only invariant (`marketing_attribution_links`
  records coupon/campaign/reward/provider ref; no timing-based inference).

### ADR-022 — Reports & Analytics Framework — Query-Time KPI Registry

- Formally accepts the RC4-11 analytics architecture: **query-time
  computation, no materialized views, no cron jobs**. Verified: zero
  `MATERIALIZED VIEW` objects in `public` schema; `pg_cron` extension NOT
  installed.
- Documents the `FORMULA_REGISTRY` (`backend/api/src/services/analytics/registry.ts`)
  as the single authoritative metric contract catalog (`REGISTRY_VERSION =
  "rc4-2.analytics.v1"`). 6 modules: `sales`, `finance`, `hr`, `inventory`,
  `purchasing`, `loyalty`.
- Records the engine's delegation pattern: finance metrics delegate to
  `FinanceService` (ADR-011 immutable ledger), HR to `HrPayrollService`,
  loyalty to `LoyaltyService` (ADR-021 ledger) — no formula duplication.
- Documents the **deferred scheduled-report execution** model:
  `analytics_scheduled_reports.execution_status` defaults to `'deferred'`,
  `deferred_reason` defaults to `'No analytics worker is deployed; schedule
  definitions are stored only.'`. Honest about the absence of a worker.
- Records the Exception Center (`analytics_exceptions`) + Data Quality Check
  (`analytics_data_quality_checks`) auxiliary tables — manually populated,
  no automatic anomaly detection.
- Documents the `ANALYTICS_TIMEZONE = "Asia/Karachi"` invariant (engine
  interprets date ranges as Asia/Karachi midnight boundaries; database stores
  UTC, conversion at query time).

### Production verification (95/95 PASS)

`scripts/phase_6_verify.py` — 10 categories, 95 checks, all PASS:

| Category | Checks | Result |
|---|---|---|
| 1. RBAC tables (ADR-019) | 11 | ✅ 11/11 |
| 2. RBAC role catalog | 2 | ✅ 2/2 |
| 3. RBAC permission catalog | 2 | ✅ 2/2 |
| 4. RBAC invariants | 5 | ✅ 5/5 |
| 5. Menu catalog (ADR-020) | 19 | ✅ 19/19 |
| 6. Coupons + Marketing + Loyalty tables (ADR-021) | 19 | ✅ 19/19 |
| 7. Loyalty atomic RPCs + tiers | 10 | ✅ 10/10 |
| 8. Analytics tables + invariants (ADR-022) | 9 | ✅ 9/9 |
| 9. Settings + Branches (ADR-001 / ADR-002) | 7 | ✅ 7/7 |
| 10. Audit (ADR-012 — re-verify) | 8 | ✅ 8/8 |
| **TOTAL** | **95** | **✅ 95/95** |

### Deferred items (out of scope for Phase 6)

- Materialized views for heavy analytics metrics (not needed at current data
  volume; query-time < 100ms).
- Scheduled-report execution worker (`execution_status='deferred'` is honest).
- Column-level security on analytics exports.
- Unified promotions search (coupons + loyalty + campaigns in one view).
- Mirror `loyalty_marketing_audit_events` into `domain_events`.
- Modifier group/option audit trail.
- Retroactive tier demotion.
- Per-branch menu pricing (activate `branch_menu_item_overrides`).
- Customer-facing loyalty redemption UI (backend complete; frontend wiring is
  a separate workstream).

### Pending operator actions (no code blockers)

| # | Action | Priority | Source |
|---|---|---|---|
| 1 | Set `TELEPIZZA_WHATSAPP_MODE=mock` on Render | P1 | FU-3 (v1.9.0) |
| 2 | Set `TELEPIZZA_WHATSAPP_WORKER=1` on Render | P1 | FU-3 (v1.9.0) |
| 3 | Set `OTP_HMAC_SECRET` on Render (32+ byte random) | P2 | FU-7 (v1.10.0) |
| 4 | Configure `chart_of_accounts` rows per branch (CASH + ACCOUNTS_RECEIVABLE) | P2 | FU-4 (v1.9.0) |
| 5 | Configure Supabase Storage bucket `delivery-pod` | P3 | FU-5 (v1.9.0) |
| 6 | Provision dedicated "Telepizza Login" WhatsApp number for OTP | P3 | FU-8 (v1.10.0) |
| 7 | (Optional) Set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render | P3 | v1.9.0 |
| 8 | (Optional) Set `TELEPIZZA_WHATSAPP_PII_JOB=1` on Render | P3 | v1.9.0 |

---

## [2.0.0] — 2026-08-16 — Phase 5 Complete (Order Lifecycle) + Phase 3 OTP

**Phase 5 — Order Lifecycle — is FEATURE-COMPLETE and Production-verified (63/63 PASS).**
**Phase 3 — Customer Phone / WhatsApp OTP — is FEATURE-COMPLETE** (merged earlier as PR #231, tagged together in v2.0.0).

This release ships **3 ADRs**: ADR-016 (OTP Verification Architecture),
ADR-017 (Phone-First Auth & Session Handoff), and ADR-018 (Order Lifecycle
State Machine & Staff Transition API). All 18 ADRs (ADR-001 through ADR-018)
are now Accepted v1.0 with standalone ADR markdown files under `docs/13-adr/`.

Backend tests: **1096 passing** (was 1004 at v1.9.0; +92 from Phase 3 OTP).
All 6 CI checks green. Phase 6 (Admin & ERP Core) is now UNLOCKED.

### Phase 5 — Order Lifecycle (ADR-018)

- **ADR-018 — Order Lifecycle State Machine & Staff Transition API**
  (`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`).
  Formally accepts the Sprint 4.4 frozen architecture
  (`docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`) as the
  canonical Phase 5 decision. Records the as-built implementation against the
  as-designed matrix:
  - Frozen `orders.status` enum: `pending → confirmed → preparing → ready →
    dispatched → completed`, with `cancelled` as a side-state reachable from
    `pending` / `confirmed` / `preparing` / `ready`. Text + CHECK constraint
    (not enum type) for migration safety.
  - Cancellation matrix: 15-minute guest self-cancel window on `pending`
    only; staff cancel with mandatory `reason_code` (`customer_cancelled`,
    `rejected_by_branch`, `staff_cancelled`, `duplicate`, `test`); BM/SA-only
    for `preparing`/`ready` cancels; no cancel on `dispatched`/`completed`.
  - `order_status_logs` append-only audit table; every transition recorded
    with `actor_type`, `actor_user_id`, `reason_code`, `note`; mirrored
    into `domain_events` (ADR-012) as `order.transitioned` for cross-domain
    correlation via `correlation_id`.
  - Delivery lane (ADR-007) mirrors to `orders.status`: `picked-up →
    dispatched`, `delivered → completed`, in a single transaction.
  - Slice 2D RLS enabled on `orders`, `order_items`, `order_status_logs`,
    `deliveries` with branch-scoped staff SELECT, customer-self-scoped
    customer SELECT, and service-role write only. 5 SECURITY DEFINER
    helpers (`current_app_user_id`, `current_user_is_active`,
    `current_user_is_super_admin`, `current_user_branch_ids`,
    `current_user_has_branch_access`) with pinned `search_path = public`.
  - API surface: 9 staff lifecycle endpoints under
    `/api/v1/admin/orders/:id/{confirm,reject,preparing,ready,dispatch,complete,cancel}`,
    kitchen queue read under `/api/v1/staff/kitchen/tickets`, rider
    delivery endpoints under `/api/v1/riders/deliveries/:id/{assign,transition}`.
    All require Bearer → `AuthPrincipal` → `requirePermission('order.manage'
    | 'delivery.assign' | 'delivery.update')` + `requireBranchAccess`.
    Idempotent repeats return `200` without appending a new audit row.
  - Implemented incrementally across Sprint 4.5 (PR #53 — staff transition
    APIs), Sprint 4.5 production close (PR #55), Sprint 4.5A customer
    onboarding (PR #57), Sprint 4.6 restaurant ops foundation (PR #85),
    Sprint 4.6 review blockers remediation (commit `b345b42`), and Slice 2D
    RLS (migration `20260716140000_sprint3_slice2d_order_branch_rls.sql`).
  - **Production verification: 63/63 checks PASS** via
    `scripts/phase_5_verify.py` — 6 tables, 10 `orders` columns, 6
    `deliveries` columns, 7 `orders.status` CHECK values, 6 `deliveries.status`
    CHECK values, 9 functions, 4 RLS-enabled tables with 8 policies, 4
    permissions, 9 `order_status_logs` columns.

- **Phase 5 Final Gate** (`docs/testing/acceptance-evidence/phase5-closeout/PHASE5_FINAL_GATE.md`).
  Records the full close: scope, gate criteria (all PASS), production
  verification breakdown, API surface (as-built), cancellation matrix,
  out-of-scope deferrals, pending operator actions, and Phase 6 unlock.

### Phase 3 — Customer Phone / WhatsApp OTP (ADR-016 + ADR-017)

- **ADR-016 — OTP Verification Architecture**
  (`docs/13-adr/ADR-016-otp-verification-architecture.md`).
  HMAC-SHA256 OTP hashing (constant-time verification), per-phone + per-IP
  rate limits, 90-day PII retention, D11 hard rule (ordering number
  `0304-1110495` is NEVER used for OTP), append-only `otp_attempts` audit,
  domain event mirror (`customer.otp_verified`).

- **ADR-017 — Phone-First Auth & Session Handoff**
  (`docs/13-adr/ADR-017-phone-first-auth-session-handoff.md`).
  `auth_refresh_tokens` table with rotation, `customers.last_login_at`,
  7 new auth endpoints (`/auth/otp/request`, `/auth/otp/verify`,
  `/auth/phone-login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`,
  `/auth/sessions`), stateless HS256 JWT access tokens, customer
  provisioning flow (resolve via ADR-005 → create provisional → create
  `auth.users` with placeholder email).

- Migration applied: `supabase/migrations/20260821000000_adr_016_017_otp.sql`
  (additive, ~740 lines). 4 new tables, 8 new functions, 2 new permissions
  (`otp.manage`, `otp.read`), `customers.last_login_at` column, append-only
  trigger on `otp_attempts`, conditional domain event mirror triggers
  (`customer.otp_verified`, `auth.session_revoked` — ADR-012), RLS on all
  4 tables (service_role write; authenticated owner SELECT+UPDATE on
  `auth_refresh_tokens` for self-service logout), 6 CHECK constraints
  enforcing state-machine invariants on `otp_requests`.

- PR #231 (squash `2967a1c`) — all 6 CI checks green (CodeQL, Analyze,
  Dependency Scan, Typecheck and test, Owner Playwright, Vercel Preview
  Comments). +92 new tests (40 in `otp-service.test.ts`, 53 in
  `otp-migration.test.ts`). Production migration applied + verified
  2026-08-15.

### Pending operator actions (no code blockers)

- **FU-3** — Set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1`
  on Render dashboard (carried from v1.9.0).
- **FU-7** — Set `OTP_HMAC_SECRET` env var on Render (32+ byte random
  string). **REQUIRED** for Phase 3 OTP to function.
- **FU-4** — Configure `chart_of_accounts` rows per branch (`CASH` +
  `ACCOUNTS_RECEIVABLE`) for COD reconciliation (carried from v1.9.0).
- **FU-5** — Configure Supabase Storage bucket `delivery-pod` for ADR-009
  POD uploads (carried from v1.9.0).
- **FU-8** — Provision a dedicated "Telepizza Login" WhatsApp number for
  OTP delivery; never use `0304-1110495` for OTP (D11).

### Deferred to later phases

- **Payment gateway** — Phase 11 (Finance & Reporting).
- **POS / Kitchen / Rider UIs** — Phases 6–9 build on the Phase 5 API surface.
- **SMS provider (Twilio Verify)** for OTP fallback — future PR.
- **Frontend wiring** for customer phone-login UI — future PR.
- **`/staff/login` endpoint alias** (ADR-017 §3) — future PR.

---

## [1.9.0] — 2026-08-15 — Phase 2 Complete (ADR-001 through ADR-015)

**Phase 2 — Customer Support, CRM, Delivery & Rider, Accounting Audit, AI Governance — is FEATURE-COMPLETE.**

This release ships **15 ADRs** (ADR-001 through ADR-015), all marked Accepted v1.0
with standalone ADR markdown files under `docs/13-adr/`. All 10 Phase 2 migrations
have been applied to Production Supabase (project `pyeowxvacgypohrbvgee`). Test
count grew from 824 (start of Phase 2.2) to **1004 backend tests** (+180 new tests).
All 6 CI checks are green on the tip commit (`9fc446f`).

### Phase 2.1 — Branch Configuration & Settings Versioning (ADR-001 + ADR-002)

- **ADR-001 — Branch Configuration Inheritance & Overrides** (`docs/13-adr/ADR-001-branch-configuration-inheritance.md`).
  Establishes the inheritance chain: tenant defaults → brand defaults → branch
  overrides. A branch-level override only needs to set the keys it wishes to
  override; all other keys fall through to the parent scope. Already shipped as
  migrations `20260805190000_phase2_01_configuration_schema_versions.sql`
  (creates `configuration_schemas`, `configuration_versions`, `configuration_change_log`)
  and `20260805200000_phase2_01_configuration_audit_hardening.sql` (RLS + append-only
  trigger on `configuration_change_log`). This release only authors the standalone
  ADR markdown file and marks ADR-001 Accepted v1.0 in `ADR_INDEX.md`.

- **ADR-002 — Settings Versioning, Activation & Rollback Model** (`docs/13-adr/ADR-002-settings-versioning-rollback.md`).
  Each settings change creates a new row in `configuration_versions` with status
  `draft` → `active` → `archived`, with exactly one `active` version per
  `(schema_id, scope_id)` enforced by a partial unique index. Rollback is a
  state transition (not a DELETE), preserving the full audit trail. Already
  shipped via migrations `20260806150140_phase2_02_settings_persistence_foundation.sql`
  and `20260806170223_phase2_03_versioning_activation_rollback.sql`. This release
  authors the standalone ADR markdown file and marks ADR-002 Accepted v1.0.

### Phase 2.2 — WhatsApp Foundation (ADR-003 + ADR-004)

- **ADR-003 — Provider-Secret Boundary Architecture** (`docs/13-adr/ADR-003-provider-secret-boundary.md`).
  Cross-cutting security ADR governing how ALL provider credentials (WhatsApp,
  future LLM, future maps) are stored. Secrets live ONLY in server-side env
  vars; the DB stores reference keys (`config_ref`) that the backend resolves
  to env-var names at runtime.

- **ADR-004 — WhatsApp Conversation Ownership & Routing** (`docs/13-adr/ADR-004-whatsapp-conversation-ownership.md`).
  WhatsApp-specific ADR covering: branch ownership of conversations, agent RLS
  scoping with super-admin cross-branch visibility, provisional customer
  identity for unknown phone numbers, conversation state machine
  (open → in_progress → resolved/escalated → closed), message immutability
  (mirror ADR-007/011 patterns), 24-month PII retention with anonymization,
  idempotent webhook upsert via `wamid` UNIQUE.

- **Migrations applied to Production**:
  - `20260816000000_adr_003_provider_secret_boundary.sql` — `whatsapp_provider_configs` table (non-secret metadata only).
  - `20260816000100_adr_004_whatsapp_conversation_ownership.sql` — 5 tables: `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_conversation_events`, `whatsapp_message_templates`, `whatsapp_inbound_events`. Extends `customers.status` with `'provisional'`.
  - `20260816000200_fix_whatsapp_message_immutability_content_column.sql` — FU-1: immutability trigger references `content` column (not legacy `body`).
  - `20260816000250_add_whatsapp_messages_next_attempt_at.sql` — FU-2: `provider_next_attempt_at` column + partial index for outbox worker.
  - `20260816000300_add_whatsapp_anonymize_pii_rpc.sql` — FU-3: `whatsapp_anonymize_pii()` SECURITY DEFINER RPC.

- **Backend modules**:
  - `services/whatsapp/mock-client.ts` — mock adapter for `TELEPIZZA_WHATSAPP_MODE=mock`.
  - `services/whatsapp/cloud-api-client.ts` — Meta Cloud API adapter with HMAC-SHA256 signature verification (`timingSafeEqual`).
  - `services/whatsapp/adapter-factory.ts` — `resolveWhatsAppAdapter(envStatus)` picks adapter by mode.
  - `services/whatsapp/inbound-worker.ts` — drains `whatsapp_inbound_events` → `whatsapp_messages` with idempotent upsert on `provider_message_id` (wamid), creates provisional customers for unknown phone numbers, triggers conversation state-machine transitions.
  - `services/whatsapp/outbox-worker.ts` — drains outbound `whatsapp_messages`, calls adapter.sendMessage, exponential backoff with `provider_next_attempt_at`, permanently_failed on MAX_RETRIES, inserts `message_sent`/`message_failed` audit events.
  - `services/whatsapp/admin-service.ts` — service layer for conversations/messages/events/templates/send/assign/transition. Branch-scoped with super-admin bypass.
  - `services/whatsapp/pii-anonymization.ts` — `runWhatsAppPiiAnonymization()` + `startWhatsAppPiiAnonymizationJob()` lifecycle wrapper. Calls `whatsapp_anonymize_pii()` RPC with batched IDs (25 per call).
  - `modules/webhooks/whatsapp.ts` — GET handshake + POST signature-verified inbound queue.
  - `modules/admin/whatsapp.ts` — 11 admin endpoints (conversations + templates), all rate-limited.
  - `app.ts` — `express.json({ verify })` raw body capture for HMAC.

- **Frontend wiring** (PR #221): flipped honest-gap language in `WhatsAppIntegrationBanner` ("WhatsApp inbox is live"), `ConversationWorkspace` (live conversation list + message thread + composer), `MessageComposer` (working form with 4096-char limit), `WhatsAppKPIs` (LIVE badge when `conversationStats` provided). Added 11 typed functions to `apps/website/client/src/lib/admin-api.ts`.

- **5 PRs merged**: #218 (foundation), #219 (inbound worker), #220 (outbox + admin routes), #221 (frontend + PII job), #222 (FU-2 hotfix — partial index cannot use `now()`).

### Phase 2.3 — CRM (ADR-005 + ADR-006)

- **ADR-005 — Canonical Customer Identity Strategy** (`docs/13-adr/ADR-005-canonical-customer-identity.md`).
  `customers.id` is the canonical identifier. `customer_identities` table maps
  multiple identity types (phone, email, whatsapp) to a single customer.
  `normalize_phone_e164()` function ensures Pakistani numbers (`+92XXXXXXXXXX`)
  are stored consistently. `resolve_customer_by_identity()` RPC provides
  idempotent lookup. `auto_create_customer_identities()` INSERT trigger
  backfills the identities table from existing `customers.phone` / `email` columns.

- **ADR-006 — Customer Account Merge & Reversal Process** (`docs/13-adr/ADR-006-customer-account-merge.md`).
  `merge_customers_atomic()` RPC transfers all FKs from source → target
  customer in a single transaction, marks source `status = 'merged'` with
  `merged_into_id` pointer, and logs to `customer_merge_log` (append-only).
  `reverse_customer_merge()` RPC allows reversal within a 30-day window;
  after the window expires, the merge is permanent.

- **Migration applied to Production**: `20260818000000_adr_005_006_crm.sql`.
  - 3 new tables: `customer_identities`, `customer_merge_log`, `customer_identity_backfill_conflicts`.
  - 6 new functions: `normalize_phone_e164`, `resolve_customer_by_identity`, `auto_create_customer_identities`, `merge_customers_atomic`, `reverse_customer_merge`, `enforce_merge_log_append_only`.
  - Extended `customers.status` CHECK with `'merged'` value; added `customers.merged_into_id` column.
  - Backfill DO block with conflict logging (Production: 0 conflicts, 0 identities inserted — no customers in production yet).

- **Backend modules**:
  - `services/customers/identity-service.ts` — `resolveCustomer`, `normalizePhone`, `getCustomer`, `listIdentities`, `addIdentity`, `searchCustomers`.
  - `services/customers/merge-service.ts` — `mergeCustomers`, `reverseMerge`, `listMergeLog`, `getMergeLogEntry`.
  - `modules/admin/customers.ts` — 8 endpoints (search, get, identities, resolve, merge, reverse, merge-log). All rate-limited; merge + reverse super-admin only.

- **Tests**: `customer-identity-merge-service.test.ts` (36 cases). PR #225 merged as `59bf158`.

### Phase 2.4 — Delivery & Rider Completion (ADR-008 + ADR-009 + ADR-010)

- **ADR-008 — Rider Location Retention & Privacy Policy** (`docs/13-adr/ADR-008-rider-location-retention.md`).
  `rider_locations` table stores GPS pings with 24-hour retention. `purge_expired_rider_locations()`
  TTL function deletes rows older than 24 hours (idempotent, runs as a lifecycle job).
  RLS: rider self + branch staff + super-admin.

- **ADR-009 — Proof of Delivery (POD) Data Format & Storage** (`docs/13-adr/ADR-009-proof-of-delivery.md`).
  `delivery_pod` table (UNIQUE on `delivery_id`) stores POD data: signature
  (base64 PNG), photo URL (Supabase Storage bucket `delivery-pod`), recipient
  name, GPS coordinates, timestamp. Immutability trigger blocks UPDATE/DELETE
  after `delivered` status. Extended ADR-007 transition validator to require
  POD before transitioning to `delivered`.

- **ADR-010 — Cash on Delivery (COD) Financial Ownership** (`docs/13-adr/ADR-010-cod-financial-ownership.md`).
  `cod_collections` table (UNIQUE on `delivery_id`) records COD amount collected
  by rider. Reconciliation state machine: `pending` → `reconciled` / `shortage`
  / `overage`. `post_cod_collection_journal()` trigger fires
  `create_journal_entry_atomic` + `finance_postings` link (idempotent) —
  automatically posts the COD collection to the branch's GL when marked
  `reconciled`.

- **Migration applied to Production**: `20260817000000_adr_008_009_010_delivery_rider.sql`.
  - 3 new tables: `rider_locations`, `delivery_pod`, `cod_collections`.
  - 5 new functions: `purge_expired_rider_locations`, `enforce_delivery_pod_immutability`, `post_cod_collection_journal`, `set_cod_updated_at`, `validate_delivery_state_transition` (extended).
  - Permission `delivery.access` seeded (granted to super-admin, branch-manager, customer-support, cashier, rider, kitchen).

- **Backend modules**:
  - `services/deliveries/rider-location-service.ts` — `ingest`, `listForDelivery`, `getLatestForRider`.
  - `services/deliveries/rider-location-ttl.ts` — `runOnce` + `startRiderLocationTtlJob` lifecycle wrapper.
  - `services/deliveries/pod-service.ts` — `capturePod`, `getPod`, `podExistsForDelivery`.
  - `services/deliveries/cod-service.ts` — `recordCollection`, `getCollection`, `listCollections`, `reconcile`, `resolveShortageOrOverage`.
  - `modules/admin/delivery-rider.ts` — 10 endpoints (rider-locations, delivery-pod, cod collections + reconcile + resolve). All rate-limited.

- **Tests**: 51 new tests across 3 files (`rider-location-service.test.ts` 16 cases, `delivery-pod-service.test.ts` 14 cases, `cod-service.test.ts` 21 cases). PR #224 merged as `2eaaa9b`.

### Phase 2.5 — Domain Event Audit (ADR-012)

- **ADR-012 — Domain Event & Shared Audit Architecture** (`docs/13-adr/ADR-012-domain-event-audit.md`).
  Centralized append-only `domain_events` table for cross-domain query
  projection. Each event has `event_type` (regex-validated format
  `<domain>.<verb>`), `domain` enum, `entity_id`, `branch_id`, `actor_user_id`,
  `actor_role`, `metadata` JSONB, `correlation_id` (for tracing across
  domains), `occurred_at`. `emit_domain_event()` helper RPC validates the
  event_type format. AFTER INSERT triggers on existing audit tables mirror
  events into `domain_events`:
  - `delivery_state_transitions` → `delivery.transitioned`
  - `customer_merge_log` → `customer.merged` (and `customer.merge_reversed` on UPDATE of `reversed_at`)
  - `whatsapp_conversation_events` → `whatsapp.<event_type>` (conditional)
  - `order_status_logs` → `order.transitioned` (conditional)

- **Migration applied to Production**: `20260819000000_adr_012_domain_event_audit.sql`.
  - 1 new table: `domain_events`.
  - 6 indexes (domain+entity, event_type, branch, actor, correlation, occurred_at) + GIN on `metadata`.
  - RLS: branch-scoped read (branch staff see their branch + null branch events); service_role write.
  - 6 new functions: `emit_domain_event`, `enforce_domain_events_append_only`, 4 mirror triggers.
  - Permission `audit.read` seeded (granted to super-admin, branch-manager, customer-support).

- **Backend modules**:
  - `services/audit/domain-event-service.ts` — `emitEvent`, `listEvents`, `getEvent`, `listEventsForEntity`, `listEventsByCorrelation`.
  - `modules/admin/audit.ts` — 4 endpoints (list, get, by-entity, by-correlation). All rate-limited.

- **FU-1 hotfix during CI**: nested `$$` blocks cause syntax error — PostgreSQL parses inner `$$` as the end of the outer `do $$` block. Fixed by using distinct delimiters: outer `do $_$ ... $_$` and inner `as $func$ ... $func$`.

- **Tests**: 17 new tests in `domain-event-service.test.ts`. PR #226 merged as `9af1d31`.

### Phase 2.6 — AI Governance (ADR-013 + ADR-014 + ADR-015)

- **ADR-013 — AI Provider Boundary & Data Governance** (`docs/13-adr/ADR-013-ai-provider-boundary.md`).
  `ai_provider_configs` table stores non-secret metadata (provider name, model,
  base URL); API keys live in env vars per ADR-003. `ai_call_logs` table records
  per-call audit: actor, provider, model, `prompt_sha256` (hash only — raw
  prompts NEVER stored), tokens, latency, cost, success. PII redaction utility
  `services/ai/pii-redaction.ts` redacts E.164 phones, Pakistani mobiles,
  emails, credit cards, CNICs before hashing.

- **ADR-014 — AI Human-Approval Gate Architecture** (`docs/13-adr/ADR-014-ai-approval-gate.md`).
  `ai_action_approvals` table (renamed from `ai_approvals` in FU-1 to avoid
  conflict with existing Phase 4 foundation table). State machine:
  `pending` → `approved` → `executed`; `pending` → `rejected`; `pending` →
  `expired` after 7 days. CHECK constraint on `action_type` (allowlist of 9
  permitted action types). Permission `ai.approve` granted to super-admin +
  branch-manager only.

- **ADR-015 — AI Prompt & Data Retention Policy** (`docs/13-adr/ADR-015-ai-prompt-retention.md`).
  `ai_prompt_logs` table stores hashed metadata only; UNIQUE on
  `prompt_sha256`; `occurrence_count`, `avg_latency_ms`, `avg_cost_usd` for
  trend analytics. `upsert_ai_prompt_log()` RPC increments count + rolling
  averages. Raw prompts NEVER stored in database (only SHA-256 hash of
  redacted prompt).

- **Migration applied to Production**: `20260820000000_adr_013_014_015_ai.sql`.
  - 4 new tables: `ai_provider_configs`, `ai_call_logs`, `ai_action_approvals`, `ai_prompt_logs`.
  - 1 new function: `upsert_ai_prompt_log`.
  - 2 new permissions: `ai.use` (granted to super-admin, branch-manager, customer-support), `ai.approve` (granted to super-admin, branch-manager only).

- **Backend modules**:
  - `services/ai/pii-redaction.ts` — redacts E.164 phones, Pakistani mobiles, emails, credit cards, CNICs; `detectPromptLanguage` heuristic for en/ur.
  - `services/ai/approval-service.ts` — `createApproval`, `approve`, `reject`, `markExecuted`, `markFailed`, `listApprovals`.
  - `services/ai/prompt-log-service.ts` — `hashPrompt`, `logCall`, `listCallLogs`, `listPromptLogs`.
  - `modules/admin/ai-governance.ts` — 7 endpoints (approvals CRUD + call-logs + prompt-logs). All rate-limited.

- **FU-1 hotfix during CI**: existing migration `20260730120000_ai_platform_foundation.sql` already creates `public.ai_approvals` (Phase 4 foundation, simpler schema with `task_id` FK). The new ADR-014 migration used `CREATE TABLE IF NOT EXISTS` which was a no-op, then index creation failed with `column "requested_at" does not exist`. Fix: rename the new ADR-014 table to `ai_action_approvals`.

- **Tests**: 33 new tests in `ai-services.test.ts` (PII redaction, prompt log, approval services). PR #227 merged as `a710def`.

### Phase 2.1 — ADR Documentation Completion (ADR-001 + ADR-002)

- PR #228 authored the standalone ADR markdown files for ADR-001 (Branch
  Configuration Inheritance & Overrides) and ADR-002 (Settings Versioning,
  Activation & Rollback Model). Both ADRs were already implemented via
  earlier migrations; this PR only adds documentation and marks ADR-001/002
  as Accepted v1.0 in `ADR_INDEX.md`. With this PR, all 15 Phase 2 ADRs
  (ADR-001 through ADR-015) have standalone ADR files under `docs/13-adr/`.

### Production Deployment Status

| Phase | Migration | Status |
| --- | --- | --- |
| 2.1 (ADR-001/002) | `20260805190000` + `20260805200000` + `20260806150140` + `20260806170223` | ✅ Applied (v1.6.0) |
| 2.2 (ADR-003/004) | `20260816000000` + `20260816000100` + 3 FU migrations | ✅ Applied |
| 2.3 (ADR-005/006) | `20260818000000` | ✅ Applied |
| 2.4 (ADR-008/009/010) | `20260817000000` | ✅ Applied |
| 2.5 (ADR-012) | `20260819000000` | ✅ Applied |
| 2.6 (ADR-013/014/015) | `20260820000000` | ✅ Applied |

### Operational notes

- **Default `TELEPIZZA_WHATSAPP_MODE=disabled`** — no behavior change for existing deployments. Operators can opt in by setting `TELEPIZZA_WHATSAPP_MODE=mock|sandbox|live` + the 5 `WHATSAPP_*` env vars.
- **Workers are opt-in** in Production: set `TELEPIZZA_WHATSAPP_WORKER=1` to enable inbound + outbound WhatsApp workers; set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` to enable the hourly rider-location TTL purge; set `TELEPIZZA_WHATSAPP_PII_JOB=1` to enable the 24-month PII anonymization job.
- **COD reconciliation requires GL setup**: each branch needs `chart_of_accounts` rows with `account_code='CASH'` (ASSET) and `account_code='ACCOUNTS_RECEIVABLE'` (ASSET) for `post_cod_collection_journal()` to produce GL postings.
- **POD storage bucket**: configure Supabase Storage bucket `delivery-pod` (write for authenticated riders; read for branch staff + the order's customer).

### Test summary

- **Backend tests**: 824 (start of Phase 2.2) → **1004** (+180 new tests).
- **Test files**: 98 test files, all passing.
- **CI**: all 6 checks green on the v1.9.0 tip commit (`9fc446f`): Typecheck and test, Analyze (javascript-typescript), Dependency Scan (pnpm audit), Owner Playwright.

---

## [1.8.1] — 2026-08-15

### Fixed

- **FU-1 (Issue #215, P2)** — `enforce_journal_entry_immutability()` bypass
  branch returned `new` (NULL for BEFORE DELETE) which silently cancelled
  DELETE operations when `app.bypass_immutability = 'on'` was set. The
  sibling function `enforce_journal_entry_line_immutability()` already had
  the correct pattern (returns `old` for DELETE-with-bypass); the entry-level
  function was inconsistent.
  - **Migration `20260815000000_adr_011_fix_bypass_delete.sql`** — redefines
    `enforce_journal_entry_immutability()` with the correct bypass-DELETE
    pattern: `if (TG_OP = 'DELETE') then return old; end if; return new;`
    inside the bypass branch. Idempotent (`create or replace function`),
    transactional (`begin/commit`), does NOT touch the line-level function
    (already correct) or any triggers.
  - **+15 regression tests** in `backend/api/tests/accounting-immutability.test.ts`
    (new describe block `ADR-011 FU-1 fix — bypass_immutability DELETE bug
    (Issue #215)`). Tests cover: the actual fix pattern (returns OLD for
    DELETE), absence of the old buggy pattern (bare `return new` after
    bypass check), preserved immutability guarantees (without bypass),
    idempotency, transactional safety, and non-interference with sibling
    function/triggers.
  - **Production verification**: 6 functional tests passed on Production
    Supabase (DELETE/UPDATE × bypass on/off). All existing data untouched.
  - **Backward compatibility**:
    | Scenario | Before fix | After fix |
    | --- | --- | --- |
    | bypass OFF + UPDATE posted entry | rejected | rejected (unchanged) |
    | bypass OFF + DELETE posted entry | rejected | rejected (unchanged) |
    | bypass ON + UPDATE posted entry | allowed | allowed (unchanged) |
    | bypass ON + DELETE posted entry | silently cancelled (BUG) | allowed (FIXED) |

---

## [Unreleased]

### Planned
- Phase 2.2 — Customer Support and WhatsApp Foundation
- Phase 2.3 — CRM and Authoritative Customer Master
- Phase 2.4 — Delivery and Rider Completion (POD, COD, GPS — ADR-008 through ADR-010)
- Phase 2.5 — Accounting and Profitability Depth (periods, CoGS, payroll posting)
- Phase 2.6 — AI Command Center (forecasts, drafts, approval inbox)
- Opening Operations Milestone 2 — Payments, Notifications, Device Verification
- Northern Bypass branch activation

---

## [1.8.0] — 2026-08-14

### Phase 2 foundations — Delivery State Machine + Accounting Immutability

This release introduces **database-enforced immutability** for two critical
lifecycles: deliveries (ADR-007) and journal entries (ADR-011). Both
implementations are additive — no existing flow changes — and ship with full
test coverage (82 new test cases).

### Added — ADR-007 Delivery State Machine (Phase 2.4 foundation)

- **Migration `20260814180000_adr_007_delivery_state_machine.sql`**
  - New `delivery_state_transitions` table (append-only audit log; UPDATE/DELETE
    rejected by trigger)
  - `trg_validate_delivery_state_transition` trigger on `deliveries` —
    enforces valid transitions per ADR-007:
    `pending → assigned | cancelled`
    `assigned → picked-up | cancelled | failed`
    `picked-up → delivered | failed`
    `delivered / failed / cancelled → (terminal)`
  - `delivery_valid_next_states(current_state)` SQL helper function
  - Lifecycle timestamps (`assigned_at`, `picked_up_at`, `delivered_at`)
    auto-populated by trigger
  - RLS policy for branch-scoped reads
- **TypeScript validator** `backend/api/src/services/deliveries/state-machine.ts`
  - `validNextDeliveryStates`, `isValidDeliveryTransition`,
    `assertValidDeliveryTransition`, `isTerminalDeliveryStatus`,
    `deliveryTimestampColumnForStatus`
  - Mirrors SQL rules exactly — produces 422 ApiError BEFORE DB rejects
- **Tests** `backend/api/tests/delivery-state-machine.test.ts` (82 cases,
  exhaustive transition matrix coverage)
- **ADR-007** status updated from PROPOSED → ACCEPTED
  (`docs/13-adr/ADR-007-delivery-state-machine.md`)

### Added — ADR-011 Accounting Immutability (Phase 2.5 foundation)

- **Migration `20260814180100_adr_011_accounting_immutability.sql`**
  - `trg_journal_entry_immutability` on `journal_entries` — blocks UPDATE/DELETE
    on posted entries except for the documented reversal flow:
    - `status: posted → voided` ✅ (used by `reverse_journal_entry_atomic`)
    - Setting `reversed_by_journal_id` / `reverses_journal_id` ✅ (linkage)
    - All other field changes ❌ (rejected with clear error)
  - `trg_journal_entry_line_immutability` on `journal_entry_lines` — blocks
    UPDATE/DELETE on lines of posted OR voided entries
  - Bypass hook `app.bypass_immutability = 'on'` for trusted future maintenance
    procedures (not used by application today)
- **Existing reversal RPC preserved** — `reverse_journal_entry_atomic()`
  continues to work unchanged (its operations are explicitly permitted)
- **Tests** `backend/api/tests/accounting-immutability.test.ts` — validates
  migration structure, confirms no conflict with existing RPC, verifies
  existing column reuse (no duplicates)
- **ADR-011** status updated from PROPOSED → ACCEPTED
  (`docs/13-adr/ADR-011-accounting-immutability.md`)

### Documentation

- New ADR artifacts: `docs/13-adr/ADR-007-*.md`, `docs/13-adr/ADR-011-*.md`
- `docs/00-governance/ADR_INDEX.md` updated with ADR-007, ADR-011 entries
- `docs/00-governance/REPOSITORY_STATUS.md` updated to reflect
  Phase 2.4 / 2.5 foundation merges

### Fixed (pre-merge hotfix in PR #212)

- ADR-007 RLS policy `delivery_transitions_branch_read` referenced
  `user_roles.status` which does not exist on that table. Changed to
  `user_roles.assignment_status = 'ACTIVE'` (the actual column, added in
  migration `20260728180000_opening_m1_people_floor_booking.sql`). Without
  this fix the migration failed at statement 16 during local Supabase seed
  with `SQLSTATE 42703: column ur.status does not exist`, which was the
  root cause of the initial Owner Playwright CI failure on the PR.

### Verification

- 742 backend tests pass (84 → 86 files, 660 → 742 tests; +82 new)
- 1065 db/static tests pass (unchanged)
- 0 type errors
- 0 vulnerabilities
- CI: Typecheck and test — PASS
- CI: Owner Playwright — PASS (after hotfix)
- CI: CodeQL Analyze + Dependency Scan — PASS
- Vercel Preview — Ready
- No breaking API changes
- No frontend behavior changes
- Additive migrations only — backward compatible

---

## [1.6.0] — 2026-08-14

### Phase 2 Configuration Control Plane + Identity Foundation

This release introduces the **Phase 2 configuration control plane** and the
**identity onboarding foundation**, replacing ad-hoc flat settings with a
governed, versioned, inheritance-aware configuration system, and establishing
tenant / owner / staff onboarding flows.

### Added — Phase 2.1 Configuration Schema & Effective-Value Contracts (PR #205)

- **`configuration_schemas`** table — canonical definition of configuration keys
  (scope_type `system` | `organization` | `branch`, data_type, default_value,
  is_secret, is_required, validation_rules JSONB)
- **`configuration_versions`** table — versioned configuration values with
  lifecycle (`draft` | `pending_approval` | `active` | `superseded` | `rolled_back`)
- **`configuration_change_log`** table — append-only audit trail (UPDATE/DELETE
  blocked by triggers)
- Effective-value resolution API: `Branch Override → Organization Default →
  System Fallback`
- Secrets boundary: `is_secret = true` values are masked in API responses
- Branch ownership enforcement — non-super-admin can only read/write their own
  branch configuration
- Audit hardening migration: `configuration_change_log` UPDATE/DELETE blocked
  via trigger; `configuration_versions` DELETE blocked via trigger
- API endpoints:
  - `GET /api/v1/admin/configuration/schemas`
  - `GET /api/v1/admin/configuration/effective`
  - `GET /api/v1/admin/configuration/versions`
  - `POST /api/v1/admin/configuration/drafts`
- Acceptance authority: Founder (ADR-001 + ADR-002 accepted 2026-08-06)
- Migration: `20260805190000_phase2_01_configuration_schema_versions.sql`
- Migration: `20260805200000_phase2_01_configuration_audit_hardening.sql`
- Tests: `backend/api/tests/admin-configuration.test.ts` (5 tests passing)

### Added — Phase 2.2 Settings Persistence Foundation (PR #206)

- Configuration persistence layer with versioned drafts
- Draft → activation → rollback lifecycle
- Settings UI foundation (admin)
- Migration: `20260806150140_phase2_02_settings_persistence_foundation.sql`
- Tests: `tests/database/phase2-settings-persistence-foundation.test.mjs`

### Added — Phase 2.3 Versioning, Activation & Rollback (PR #207)

- Settings versioning with full audit trail
- Activation workflow (super-admin only)
- Rollback to previous version (preserves version history)
- Migration: `20260806170223_phase2_03_versioning_activation_rollback.sql`
- Tests: `tests/database/phase2-configuration-versioning-activation-rollback.test.mjs`

### Added — IDENTITY-01 Tenant Owner & Staff Onboarding (PR #208)

- Tenant onboarding foundation (organization → owner → staff hierarchy)
- Owner onboarding flow with super-admin authorization
- Staff invitation and onboarding workflow
- Branch assignment during onboarding
- Audit trail for all onboarding events
- Migration: `20260807100000_identity_01_tenant_owner_onboarding.sql`
- Tests:
  - `tests/database/identity-01-tenant-owner-onboarding.test.mjs`
  - `tests/website/identity-01-onboarding-ui.test.mjs`
- Playwright: `playwright.identity-01.config.ts`
- Fixture: `scripts/identity-01/fixture-local.mjs`

### Added — Phase 2.4 Branch Readiness Control Plane (PR #209)

- Per-branch readiness gate (all required settings configured → ready)
- Branch readiness dashboard (admin)
- Readiness state machine: `pending → in_progress → ready → not_ready`
- Branch readiness API: `GET /api/v1/admin/branches/:id/readiness`
- Migration: included in Phase 2.1-2.3 schema
- Tests: `tests/database/phase2-04-branch-readiness-control-plane.test.mjs`
- Playwright: `playwright.phase2-04.config.ts`
- Fixture: `scripts/phase2-04/fixture-local.mjs`

### Added — Repository Polish

- `LICENSE` — MIT license with Mianx.ai + Telepizza brand carve-outs
- `CHANGELOG.md` — Keep a Changelog format (this file)
- `SECURITY.md` — vulnerability reporting policy
- `CONTRIBUTING.md` — contributor onboarding guide
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `.editorconfig` — cross-editor consistency rules
- `.nvmrc` — Node 22 LTS pin
- `.github/CODEOWNERS` — auto-request reviewers by path
- `.github/ISSUE_TEMPLATE/bug_report.md` — structured bug reports
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature requests
- `.github/PULL_REQUEST_TEMPLATE.md` — comprehensive PR checklist

### Removed

- `.vercel/` directories removed from git tracking (project IDs were leaked)
  - Now gitignored via `**/.vercel/` pattern
- Duplicate `supabase/.branches/` entry in `.gitignore` consolidated

### Security

- `configuration_change_log` is now append-only (UPDATE/DELETE blocked by trigger)
- `configuration_versions` rows cannot be deleted (trigger enforced)
- Branch ownership enforced server-side — cross-branch writes rejected
- Secrets masked in all API responses (`is_secret = true` schemas)
- Caller-supplied organization identity not trusted (resolved server-side)

### Acceptance

- ADR-001 (Branch Configuration Inheritance & Overrides) — **ACCEPTED** by Founder, 2026-08-06
- ADR-002 (Settings Versioning, Activation & Rollback Model) — **ACCEPTED** by Founder, 2026-08-06
- ADR-003 through ADR-015 remain **PROPOSED**

---

## [1.5.1] — 2026-08-04

### Phase 1.1 Professional Readiness

- POLISH-QA: certify Phase 1.1 professional readiness
- POLISH-07: harden website performance, network and privacy
- POLISH-06: harden Admin accessibility and responsive behavior
- POLISH-05: standardize Admin design system and data states
- POLISH-04: align business administration capability truth
- POLISH-03: professionalize restaurant operations workspaces
- POLISH-02: professionalize Owner Command Center hierarchy
- POLISH-01: admin shell navigation polish
- Production website smoke verified on `830dbc8…`
- Annotated tag `v1.5.1` created at `bfe60cc6a3074e08e61f85b458b19e724325eba4`

---

## [1.5.0] — 2026-08-03

### RC6 Phase 1 Final Closeout

- DASH-08: What Changed timeline
- DASH-07: EOD pack foundation
- DASH-06: Profitability truth
- DASH-05: Branch health score
- DASH-04: Approval inbox
- DASH-03: Daily command modes
- DASH-02: Actionable KPI drilldowns
- DASH-01: Owner dashboard depth
- UI-01: Admin label honesty

**Released with PASS WITH LIMITATIONS** — see `rc6-phase1-closeout/`

---

## [1.4.0] — 2026-08-02

### RC5 Final Closeout

- RC5-QA-01: CI Owner Playwright smoke
- RC5-OBS-01: Operator log alerting
- RC5-DOC-01: Living status honesty
- RC5-A11Y-01: Public home accessibility
- RC5-PERF-01: Entry bundle optimization
- RC5-TEST-01: Analytics schema guards
- RC5-OPS-01: Agents truth

---

## [1.3.0] — 2026-08-02

### RC4 Release Closeout

- RC4-FINAL: Final certification + security closeout
- RC4-PERFORMANCE: Performance polish
- RC4-PAYROLL: Payroll
- RC4-LOYALTY-MARKETING-DEPTH: Loyalty marketing depth
- RC4-INVENTORY-RECIPES: Inventory recipes
- RC4-FINANCE-PHASE2: Finance phase 2
- RC4-DOCUMENTS: Documents
- RC4-ANALYTICS-BI: Analytics BI
- RC4-OBSERVABILITY: Observability

---

## [1.2.0] — 2026-07-15

### Telepizza Brand Phase 1

- Initial brand-aligned website foundation
- Customer-facing menu, cart, checkout
- Admin ERP foundation (orders, products, customers, branches)
- Supabase/Postgres database foundation

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.6.0 | 2026-08-14 | Phase 2 configuration control plane + identity onboarding |
| 1.5.1 | 2026-08-04 | Phase 1.1 professional readiness polish |
| 1.5.0 | 2026-08-03 | RC6 Phase 1 final closeout |
| 1.4.0 | 2026-08-02 | RC5 final closeout |
| 1.3.0 | 2026-08-02 | RC4 release closeout |
| 1.2.0 | 2026-07-15 | Telepizza brand phase 1 |

---

[Unreleased]: https://github.com/mianimr4n/telepizza/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.6.0
[1.5.1]: https://github.com/mianimr4n/telepizza/releases/tag/v1.5.1
[1.5.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.5.0
[1.4.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.4.0
[1.3.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.3.0
[1.2.0]: https://github.com/mianimr4n/telepizza/releases/tag/v1.2.0
