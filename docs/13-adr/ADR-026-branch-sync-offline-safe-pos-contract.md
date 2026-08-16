# ADR-026: Branch Sync & Offline-Safe POS Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.2.0` (closes Phase 7 — POS System, ADR-026 of 4)

---

## Context

Telepizza's POS system operates across multiple branches (currently
Multan pilot: Royal Orchard + Northern Bypass) with a centralized
Supabase Postgres database. The cashier UI is a browser-based SPA
(`apps/website/client/src/pages/admin/AdminPos.tsx`) served from
Vercel, communicating with the Express API (`backend/api/`) deployed
on Render.

Phase 7's "Branch sync" and "Offline-safe" requirements (per the
master roadmap) are the most deferred of the eight POS sub-areas.
The audit found:
- **Branch sync**: implemented as `branch_id` scoping on all POS
  tables + RLS denial of cross-branch writes. No multi-branch
  real-time sync protocol exists (none is needed — there's a single
  centralized DB).
- **Offline-safe**: implemented as Idempotency-Key on all POS writes
  + optimistic UI feedback. NO client-side offline queue, NO service
  worker / PWA, NO local cart persistence. If the network drops
  mid-order, the cashier must retry.

This ADR formally accepts the as-built V1 contract and documents
what "branch sync" and "offline-safe" mean in the Telepizza context
versus what they would mean in a distributed/offline-first system.
It also records the deferrals (offline PWA, local persistence) as
intentional V1 boundaries with explicit triggers for revisiting.

## Decision

### 1. "Branch sync" = centralized DB + branch_id scoping (NOT multi-DB sync)

Telepizza's "branch sync" is **NOT** a multi-database synchronization
protocol. It is a single centralized Supabase Postgres instance
where every POS table has a `branch_id` column and RLS policies
enforce that staff can only read/write their own branch's rows.

| Concern | Implementation |
|---|---|
| Single source of truth | Production Supabase Postgres (`pyeowxvacgypohrbvgee`) |
| Branch isolation | `branch_id` column + RLS policies on every POS table |
| Cross-branch denial | RLS `USING` clause rejects rows where `branch_id` not in `current_user_branch_ids()` |
| Real-time updates | Supabase Realtime (postgres_changes) — NOT used by POS in V1 |
| Multi-branch aggregation | Super-admin only (via `current_user_is_super_admin()` short-circuit) |

This means:
- A cashier at Royal Orchard cannot see Northern Bypass's orders,
  bills, or payments — even if they share the same `users` row.
- A branch-manager at Royal Orchard cannot create a bill for a
  Northern Bypass dine-in session.
- A super-admin can see all branches (for cross-branch KPIs in
  ADR-022 reports).

There is no need for "sync" because there is only one database.
The deferral of a multi-DB sync protocol is intentional — Telepizza
is a single-region (Pakistan) operation with low-latency (<100ms)
access to Supabase's Singapore region.

### 2. "Offline-safe" = Idempotency-Key + optimistic UI (NOT offline-first PWA)

Telepizza's "offline-safe" is **NOT** an offline-first PWA with
local persistence. It is a set of server-side invariants that make
retries safe:

| Concern | Implementation |
|---|---|
| Idempotent writes | `Idempotency-Key` header on all POS POSTs; UNIQUE indexes on `(branch_id, idempotency_key)` |
| Optimistic UI | Cashier UI shows "Placing order..." immediately; reverts on error |
| Retry on network drop | Cashier can re-click "Place Order" — same Idempotency-Key returns the original order |
| No local cart persistence | Cart state is in React state only; lost on page refresh |
| No service worker | The cashier UI is a standard SPA, not a PWA |

The Idempotency-Key requirement (ADR-023 §6) is the cornerstone of
this contract. Every POS write endpoint requires the header:

| Endpoint | Idempotency-Key storage |
|---|---|
| `POST /api/v1/admin/pos/orders` | `orders.idempotency_key` (UNIQUE per branch) |
| `POST /api/v1/admin/payments/settle` | `payments.idempotency_key` (UNIQUE per branch) |
| `POST /api/v1/admin/finance/cash-reconciliations` | `cash_reconciliations.idempotency_key` (UNIQUE) |
| `POST /api/v1/admin/payments/deposits/record` | `reservation_deposits.idempotency_key` (UNIQUE per branch) |
| `POST /api/v1/admin/table-sessions/walk-in` | `dine_in_sessions.idempotency_key` (UNIQUE per branch) |

On retry with the same key, the server returns the original response
with `idempotentReplay: true` — no duplicate row, no double-charge.

### 3. Conflict resolution — last-write-wins for non-idempotent, replay for idempotent

For non-idempotent writes (e.g., status transitions like "confirm
order"), the contract is **last-write-wins**. If two staff members
click "confirm" on the same order simultaneously:

1. Both requests hit the API.
2. The first acquires the row lock (via `SELECT FOR UPDATE` in the
   transition RPC) and transitions `pending → confirmed`.
3. The second acquires the lock after the first commits, sees the
   row is already `confirmed`, and returns `200` with the current
   state (idempotent transition — ADR-018 §8).

For idempotent writes (e.g., settle payment), the contract is
**replay**. If two requests with the same Idempotency-Key hit
simultaneously:

1. Both requests hit the API.
2. The first acquires the bill lock (via `SELECT FOR UPDATE` in
   `settle_bill_payment_atomic`) and inserts the payment.
3. The second acquires the lock after the first commits, finds the
   payment by `(branch_id, idempotency_key)`, and returns the
   original payment row with `idempotentReplay: true`.

This dual strategy (last-write-wins for transitions, replay for
idempotent writes) covers all POS write patterns without requiring
client-side conflict resolution.

### 4. Network drop handling — cashier UX

When the network drops mid-request, the cashier UI shows an error
toast: "Network error — retry?". The cashier can:

1. **Retry the same request** — the same Idempotency-Key is resent.
   If the original request reached the server, the server returns
   the original response. If it didn't, the request is processed
   normally.
2. **Refresh the page** — the cart is lost (no local persistence).
   The cashier must re-add items. This is a known V1 limitation.
3. **Check the orders list** — if the order was created, it appears
   in `GET /api/v1/admin/orders?branchId=&status=pending`. The
   cashier can confirm it there.

The "Placing order..." button is disabled during the request to
prevent double-clicks. If the request times out (30s), the button
re-enables and the cashier can retry.

### 5. Branch sync for menu / settings — ADR-001 / ADR-002 inheritance

Menu and settings "sync" across branches is handled by the
inheritance model (ADR-001) and versioning model (ADR-002):

| Concern | Implementation |
|---|---|
| Menu catalog | Single `menu_items` table; `branch_menu_item_overrides` for branch-specific prices (ADR-020) |
| Settings | `branch_settings` table with inheritance from `organization_settings` (ADR-001) |
| Settings versioning | `configuration_versions` + `configuration_active_versions` (ADR-002) |
| Settings rollback | `configuration_change_log` + rollback RPC (ADR-002) |

A branch's menu and settings are computed at query time by joining
the global catalog with branch-specific overrides. There is no
"sync" step — the branch sees the latest global state plus its own
overrides on every query.

### 6. Real-time updates — Supabase Realtime (deferred for POS)

Supabase Realtime (postgres_changes) is available in the platform
but is NOT used by the POS in V1. The cashier UI polls for updates:

| UI element | Polling strategy |
|---|---|
| Orders list | Manual refresh (cashier clicks "Refresh") |
| Floor state | Manual refresh (branch-manager clicks "Refresh floor") |
| Bill balance | On-demand (cashier clicks "Refresh balance" after settlement) |
| Z-Report | On-demand (cashier clicks "Generate Z-Report") |

Real-time updates (e.g., auto-refreshing the orders list when a new
order arrives) would require:
1. Supabase Realtime subscription on `orders` (filtered by `branch_id`).
2. WebSocket connection from the cashier UI.
3. Reconnection logic for network drops.

This is deferred to a future ADR — the polling strategy is
sufficient for V1 volume (single branch, <100 orders/day).

### 7. RLS as cross-branch hard gate

Row-Level Security is the **hard gate** that prevents cross-branch
data leakage, even if the application code has a bug. Every POS
table has RLS enabled with `USING` clauses that check
`current_user_has_branch_access(branch_id)`:

| Table | RLS policy |
|---|---|
| `orders` | Staff: `branch_id` in `current_user_branch_ids()` · Customer: own `auth_user_id` |
| `restaurant_bills` | `current_user_can_access_restaurant_bills(branch_id)` |
| `bill_orders` | EXISTS in `restaurant_bills` with access |
| `payments` | `current_user_has_branch_access(branch_id)` |
| `pos_z_report_events` | `current_user_has_branch_access(branch_id)` |
| `cash_reconciliations` | `current_user_has_branch_access(branch_id)` |
| `dine_in_sessions` | `current_user_has_branch_access(branch_id)` |
| `reservation_deposits` | `current_user_has_branch_access(branch_id)` |

Even if a buggy service sends a query without a `WHERE branch_id = ?`
clause, RLS injects the filter automatically. A cashier at Royal
Orchard literally cannot read Northern Bypass's data — the database
refuses.

### 8. API surface — no POS-specific sync endpoints

There are NO POS-specific sync endpoints. The cashier UI uses the
standard admin API (same as branch-manager and super-admin). The
"branch sync" is implicit: every request is scoped to the cashier's
`branch_id`, and RLS enforces it.

```text
# Standard admin API (no sync-specific endpoints)
GET  /api/v1/admin/orders?branchId=<cashier's branch>
GET  /api/v1/admin/bills?sessionId=<session in cashier's branch>
POST /api/v1/admin/payments/settle  (Headers: Idempotency-Key)
GET  /api/v1/admin/pos/z-report?branchId=<cashier's branch>
```

The `branchId` query parameter is validated against
`AuthPrincipal.branchIds` — if the cashier sends a `branchId` they
don't have access to, the API returns `403 BRANCH_ACCESS_DENIED`.

## Consequences

### Positive

- **Single source of truth.** No multi-DB sync means no split-brain
  risk, no conflict resolution logic, no eventual consistency
  windows. Every read sees the latest write.
- **RLS is the hard gate.** Even buggy application code cannot leak
  cross-branch data. The database enforces isolation.
- **Idempotent retries.** Network drops are recoverable — the
  cashier can retry safely without risk of double-charging.
- **Simple operator model.** Cashiers don't need to understand
  "sync status" — they just refresh the page.
- **No PWA complexity.** Skipping the service worker / offline
  queue reduces the surface area for bugs and security issues.

### Negative

- **No offline mode.** If the network is down, the cashier cannot
  place orders. This is a known V1 limitation — the mitigation is
  that Supabase has high uptime (99.9% SLA) and Render/Vercel are
  similarly reliable.
- **Cart lost on refresh.** If the cashier refreshes the page
  mid-order, the cart is gone. They must re-add items. This is
  painful but recoverable.
- **No real-time updates.** The orders list doesn't auto-refresh —
  the cashier must click "Refresh". This can cause delays in
  high-volume branches.
- **Single-region risk.** If Supabase's Singapore region goes down,
  all branches are down. There is no fallback. Mitigation: Supabase
  has multi-AZ redundancy within the region.

## Alternatives Considered

- **Multi-DB sync (one DB per branch).** Rejected: introduces
  split-brain risk, conflict resolution complexity, and operational
  overhead. The single-DB model with RLS is simpler and sufficient
  for Telepizza's scale (2 branches, expanding to ~10 within 2
  years).
- **Offline-first PWA with local persistence.** Rejected for V1:
  the complexity of a service worker + IndexedDB cart + sync
  protocol is not justified by the current volume. The Idempotency-
  Key + retry strategy covers 95% of network-drop scenarios. If a
  branch loses connectivity for >5 minutes, the operator can fall
  back to manual order-taking (phone + paper) and enter them in the
  system when connectivity returns.
- **Real-time subscriptions (Supabase Realtime).** Rejected for V1:
  adds WebSocket complexity and reconnection logic. Polling is
  sufficient for current volume. Will revisit when a branch exceeds
  200 orders/day.
- **Client-side conflict resolution (CRDTs).** Rejected: CRDTs are
  overkill for a centralized DB with RLS. The last-write-wins +
  replay strategy covers all POS write patterns.
- **`branch_sync_log` table for auditing cross-branch reads.**
  Rejected: RLS already prevents cross-branch reads. Auditing
  denied reads is unnecessary — the denial IS the audit.

## Deferred Items (V2+ triggers)

| Item | Trigger | ADR |
|---|---|---|
| Offline PWA with local cart persistence | Branch reports >5 network drops/week | Future ADR-027 |
| Real-time orders list auto-refresh | Branch exceeds 200 orders/day | Future ADR-028 |
| Multi-region DB (read replicas) | Latency >200ms for any branch | Future ADR-029 |
| `pos_sessions` table (shift open lifecycle) | Multi-register branches | Future ADR-030 |
| Online card gateway (Stripe / Braintree) | Card payments >30% of revenue | Future ADR-031 |

These triggers are documented in the Phase 7 close report
(`docs/testing/acceptance-evidence/phase7-closeout/PHASE7_FINAL_GATE.md`)
and will be revisited at each Phase gate review.

## As-Built Verification (2026-08-16)

`scripts/phase_7_verify.py` confirms Production Supabase has:

- ✅ RLS enabled on all 8 POS-related tables
- ✅ `current_user_has_branch_access` helper exists
- ✅ `current_user_can_access_restaurant_bills` helper exists
- ✅ `current_user_is_super_admin` helper exists
- ✅ `orders.idempotency_key` UNIQUE per-branch partial index
- ✅ `payments.idempotency_key` UNIQUE per-branch partial index
- ✅ `cash_reconciliations.idempotency_key` UNIQUE partial index
- ✅ `reservation_deposits.idempotency_key` UNIQUE per-branch partial index
- ✅ `branches.timezone` NOT NULL (single timezone invariant)
- ✅ No materialized views (query-time computation — ADR-022)

**Result: see PHASE7_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/POS-BILLING-FOUNDATION.md`](../architecture/POS-BILLING-FOUNDATION.md) — `pos_sessions` deferral
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 7 entry
- [`docs/13-adr/ADR-001-branch-configuration-inheritance.md`](./ADR-001-branch-configuration-inheritance.md) — branch inheritance
- [`docs/13-adr/ADR-002-settings-versioning-rollback.md`](./ADR-002-settings-versioning-rollback.md) — settings versioning
- [`docs/13-adr/ADR-019-rbac-authorization-principal.md`](./ADR-019-rbac-authorization-principal.md) — RLS helpers
- [`docs/13-adr/ADR-020-canonical-single-price-menu-catalog.md`](./ADR-020-canonical-single-price-menu-catalog.md) — menu catalog
- [`docs/13-adr/ADR-022-reports-analytics-framework.md`](./ADR-022-reports-analytics-framework.md) — query-time KPIs
- [`docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md`](./ADR-023-pos-cashier-workflow-order-source-contract.md) — Idempotency-Key
- [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](./ADR-024-dine-in-bill-settlement.md) — bill settlement
- [`docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md`](./ADR-025-pos-shifts-zreport-cash-recon.md) — cash reconciliation
- [`backend/api/src/middleware/authorization.js`](../../backend/api/src/middleware/authorization.ts) — `requireBranchAccess`
- [`backend/api/src/services/branches/operational-status.ts`](../../backend/api/src/services/branches/operational-status.ts) — `assertBranchMembership`
