# ADR-022: Reports & Analytics Framework — Query-Time KPI Registry

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.1.0` (closes Phase 6 — Admin and ERP Core, Reports surface)

---

## Context

Telepizza's reporting and analytics surface was built across two
phases:

1. **Legacy reports** (Sprint "RC3", July 2026) — `backend/api/src/services/reports/sales.ts`
   and `backend/api/src/modules/admin/reports.ts` shipped a daily
   sales CSV report and an orders CSV export. These queries read
   `orders` + `branches` directly at request time.
2. **RC4-11 Analytics & BI foundation** (`20260801120000_rc4_analytics_bi_foundation.sql`
   + `backend/api/src/services/analytics/*`) — added a formal metric
   contract registry (`FORMULA_REGISTRY`), an analytics engine, an
   Exception Center, a Data Quality Check table, and deferred
   scheduled reports.

The two phases coexist. The legacy sales CSV is still used for simple
operational exports; the RC4-11 analytics engine is used for the
Owner Workspace dashboard, module snapshots, drill-downs, and
formatted exports (CSV/Excel/PDF).

This ADR formally accepts the RC4-11 architecture as the canonical
Phase 6 decision: **query-time computation, no materialized views, no
cron jobs, a single authoritative metric contract registry, and
deferred scheduled-report execution**.

## Decision

### 1. Query-time computation — no materialized views, no cron

Every KPI is computed live at request time by
`backend/api/src/services/analytics/engine.ts` (1,572 lines). The
engine reads from authoritative source tables (`orders`,
`order_items`, `payments`, `loyalty_transactions`, `journal_entries`,
`hr_*`, `inventory_*`, `purchasing_*`) and computes the metric using
the formula declared in the registry.

**Verified:** `grep -i "MATERIALIZED VIEW\|pg_cron\|cron.schedule"`
across all migration files returns zero matches. No materialized
views exist in the `public` schema. The `pg_cron` extension is not
installed.

Rationale:

- **Freshness.** A materialized view would be stale between refreshes.
  Telepizza's operators need real-time numbers for the dashboard.
- **Simplicity.** No refresh job to monitor, no refresh failure to
  debug, no refresh-lag to explain.
- **Cost.** Telepizza's data volume (single-tenant, 2 branches,
  ~thousands of orders/month) does not justify the complexity of a
  materialized-view refresh strategy. Query-time computation completes
  in <100ms for all current metrics.

If data volume grows 100×, a future ADR may introduce materialized
views for the heaviest metrics. Until then, query-time is the
canonical pattern.

### 2. Single authoritative metric contract registry

`backend/api/src/services/analytics/registry.ts` (966 lines) exports
`FORMULA_REGISTRY: MetricContract[]`. This is the single source of
truth for what every metric means, how it is computed, and who may
read it.

```typescript
interface MetricContract {
  metricId: string;              // e.g. "sales.daily_revenue"
  module: AnalyticsModuleId;     // "sales" | "finance" | "hr" | "inventory" | "purchasing" | "loyalty"
  name: string;                  // human-readable
  formula: string;               // SQL fragment or formula description
  authoritativeSource: string;   // table(s) queried
  includedStatuses?: string[];   // e.g. ["completed"] for revenue
  excludedStatuses?: string[];   // e.g. ["cancelled"] for active orders
  period?: AnalyticsPeriodQuery; // default aggregation period
  branchScope: "global" | "branch" | "both";
  freshness: "query-time";      // always query-time (see §1)
  permissions: string[];         // required permission codes
  fallback?: MetricValue;        // value returned if computation fails
}
```

`REGISTRY_VERSION = "rc4-2.analytics.v1"` — bump on any breaking
change to the registry shape or to a metric's formula. The version is
exposed via `GET /admin/reports/analytics/registry` so consumers can
detect regressions.

The registry currently covers 6 modules: `sales`, `finance`, `hr`,
`inventory`, `purchasing`, `loyalty`. New modules are added by
appending contracts; existing contracts are never silently modified
(breaking changes require a version bump).

### 3. Engine delegates domain math to domain services

The analytics engine (`AnalyticsService`) does **not** reimplement
finance/HR/loyalty formulas. It delegates:

| Module | Delegates to |
|---|---|
| `finance` | `FinanceService` (uses ADR-011 immutable ledger) |
| `hr` | `HrEmployeesService`, `HrPayrollService` |
| `loyalty` | `LoyaltyService` (uses ADR-021 ledger) |
| `inventory` | `InventoryService` |
| `purchasing` | `PurchasingService` |
| `sales` | Computes directly from `orders` (sales is the analytics engine's home domain) |

This prevents formula drift (the finance team's definition of "revenue"
lives in `FinanceService`, not duplicated in the analytics engine).

### 4. Scheduled reports are DEFERRED by design

`analytics_scheduled_reports` is a definitions table only. The
`execution_status` column defaults to `'deferred'` and the
`deferred_reason` column defaults to `'No analytics worker is deployed;
schedule definitions are stored only.'`.

```sql
-- 20260801120000_rc4_analytics_bi_foundation.sql
CREATE TABLE public.analytics_scheduled_reports (
  ...
  execution_status text NOT NULL DEFAULT 'deferred'
    CHECK (execution_status IN ('deferred', 'queued', 'running', 'succeeded', 'failed')),
  deferred_reason  text NOT NULL DEFAULT 'No analytics worker is deployed; schedule definitions are stored only.',
  ...
);
```

**No analytics worker is deployed.** The table lets operators define
schedules (cadence, format, recipient list) in advance, so when a
worker is eventually deployed the schedules are ready. Until then,
all schedules sit in `deferred` state and produce no output.

This is honest: the platform does not pretend to run scheduled
reports. Operators who need a report use the on-demand
`GET /admin/reports/analytics/export` endpoint.

### 5. Exception Center + Data Quality Checks

Two auxiliary tables support operational analytics hygiene:

| Table | Purpose |
|---|---|
| `analytics_exceptions` | Exception Center — manually or automatically raised entries with `severity ∈ {info, warning, error, critical}`, `status ∈ {open, acknowledged, resolved}`, `module_id`, `metric_id`, `code`, `message`, `detail` (JSONB) |
| `analytics_data_quality_checks` | Snapshot of data quality checks — `check_code`, `module_id`, `status ∈ {pass, warn, fail, unavailable}`, `summary`, `detail` (JSONB), `checked_at` |

These tables are writable via admin endpoints:

```text
GET  /admin/reports/analytics/exceptions
POST /admin/reports/analytics/data-quality
```

They are NOT automatically populated by the engine — there is no
background scanner. Operators or external monitoring tools populate
them. This keeps the analytics framework query-time-only (§1).

### 6. Asia/Karachi timezone invariant

`ANALYTICS_TIMEZONE = "Asia/Karachi"` (in
`backend/api/src/services/analytics/types.ts`). All date-range queries
in the engine interpret `start_date` / `end_date` as Asia/Karachi
midnight boundaries. The database stores timestamps in UTC (Supabase
default); the engine converts at query time.

This is consistent with the rest of the platform: branch operating
hours, coupon expiry, and staff scheduling all use Asia/Karachi.

### 7. Admin API surface

```text
# backend/api/src/modules/admin/reports.ts (mounted under /admin/reports)
GET  /admin/reports/sales                              (legacy daily sales report)
GET  /admin/reports/sales/export                       (CSV)
GET  /admin/reports/orders/export                      (CSV)

GET  /admin/reports/analytics/owner-workspace          (Owner dashboard)
GET  /admin/reports/analytics/modules                  (list FORMULA_REGISTRY modules)
GET  /admin/reports/analytics/registry                 (full metric contract catalog)
GET  /admin/reports/analytics/module-snapshot/:moduleId
GET  /admin/reports/analytics/drill-down/:metricId
GET  /admin/reports/analytics/export                   (csv/excel/pdf)

GET  /admin/reports/analytics/scheduled-reports
POST /admin/reports/analytics/scheduled-reports        (defines a schedule; stays deferred)

GET  /admin/reports/analytics/exceptions
POST /admin/reports/analytics/data-quality

# backend/api/src/modules/admin/dashboard.ts (mounted under /admin/dashboard)
GET  /admin/dashboard/operations                       (requires order.manage)
GET  /admin/dashboard/table-service                    (requires reservation.read)
GET  /admin/dashboard/system-health                    (requires platform.health.read — super-admin only)
GET  /admin/dashboard/opening-readiness                (requires branch.manage | admin.access | reservation.manage)
```

Reads require `reports.read`, `order.manage`, or `admin.access`.

### 8. Export formats

The engine supports three export formats:

| Format | Implementation |
|---|---|
| `csv` | Streaming CSV via `backend/api/src/services/analytics/exports.ts` |
| `excel` | XLSX via SheetJS (in-memory) |
| `pdf` | PDF via `pdfkit` (table layout, simple) |

All exports use the same metric computation as the JSON API — there
is no separate "export path" that could drift from the live numbers.

## Consequences

### Positive

- **Real-time numbers, always.** No stale materialized view to
  explain away. The dashboard shows what the source tables show.
- **Single source of truth for metric formulas.** The registry is
  the catalog; the engine is the executor. Adding a metric means
  adding a contract to the registry and a computation branch to
  the engine — no schema change, no migration.
- **No formula drift across modules.** Finance metrics delegate to
  `FinanceService`; HR metrics delegate to `HrPayrollService`. The
  analytics engine never reimplements a domain formula.
- **Honest about scheduled reports.** The `deferred` status makes
  it clear that no worker exists. Operators are not misled into
  expecting email-delivered reports that never arrive.
- **Versioned registry.** `REGISTRY_VERSION` lets consumers detect
  breaking changes before they cause silent metric regressions.
- **Timezone-safe.** Asia/Karachi is enforced at the engine layer,
  not the database layer — queries are predictable regardless of
  Supabase's timezone settings.

### Negative

- **No historical metric snapshots.** If an operator wants "what
  was the daily revenue on 2026-07-15?" they can recompute it
  (orders are immutable), but there is no pre-computed snapshot
  table for fast historical comparisons. This is acceptable today;
  a future ADR may add a snapshot table if historical comparison
  becomes a UX requirement.
- **Scheduled reports are deferred indefinitely.** Operators who
  need recurring reports must use external tooling (e.g. cron +
  curl) against the export endpoint. A future analytics worker
  would close this gap.
- **Exception Center is manually populated.** There is no automatic
  anomaly detection. Operators must raise exceptions manually or
  wire up an external monitor.
- **No column-level security on exports.** A user with
  `reports.read` can export the full registry dataset. Column-level
  masking (e.g. "support can see order counts but not revenue") is
  not supported.
- **Registry is code, not data.** Adding a metric requires a code
  deploy (edit `registry.ts` + `engine.ts`). A future ADR may move
  the registry to a database table for runtime edits, but the
  current code-first approach is simpler and gives type safety.

## Alternatives Considered

- **Materialized views refreshed by `pg_cron`.** Rejected: adds
  operational complexity (monitoring the refresh job, handling
  failures, explaining refresh lag) without benefit at current data
  volume. Query-time is simpler and always fresh.
- **External OLAP database (e.g. ClickHouse, DuckDB).** Rejected:
  Telepizza's data volume does not justify a separate analytics
  database. The operational Supabase instance handles the load.
- **Event-sourced projections (CQRS).** Rejected: would require
  every write path to emit analytics events, doubling the write
  surface. The current model reads from authoritative tables
  directly, which is simpler and equally correct.
- **Registry as a database table (runtime-editable).** Rejected:
  metric formulas are code (they reference domain services, use
  TypeScript types, and benefit from compile-time checks). Moving
  them to a database table would lose type safety and require a
  formula DSL. The code-first registry is the right abstraction.
- **`delivered` status for scheduled reports.** Rejected: same
  reasoning as marketing campaign delivery (ADR-021 §6) — the
  platform reports only what it can verify. A scheduled report
  that was never executed reports `deferred`, not `delivered`.
- **Pre-computed daily snapshot table.** Rejected for now: orders
  are immutable, so historical revenue can always be recomputed.
  A snapshot table would be a cache, not a source of truth. If
  query latency becomes a problem, a snapshot table can be added
  later without changing the registry contract.

## As-Built Verification (2026-08-16)

`scripts/phase_6_verify.py` confirms Production Supabase has:

- ✅ 3 analytics tables: `analytics_scheduled_reports`,
  `analytics_exceptions`, `analytics_data_quality_checks`
- ✅ `analytics_scheduled_reports.execution_status` defaults to
  `'deferred'` and CHECK constraint accepts only
  `deferred|queued|running|succeeded|failed`
- ✅ All existing scheduled reports have `execution_status = 'deferred'`
  (no worker has run)
- ✅ No `MATERIALIZED VIEW` objects in `public` schema
- ✅ `pg_cron` extension is NOT installed
- ✅ Helpful indexes on `orders(branch_id, created_at, status)` and
  `payments(order_id, status)` exist (added by RC4-11 migration)
- ✅ `reports.read` permission seeded (super-admin, branch-manager)
- ✅ `FORMULA_REGISTRY` version is `rc4-2.analytics.v1`
- ✅ 6 modules registered: `sales`, `finance`, `hr`, `inventory`,
  `purchasing`, `loyalty`
- ✅ `ANALYTICS_TIMEZONE = "Asia/Karachi"` enforced in engine

**Result: see `PHASE6_FINAL_GATE.md` for full verification matrix.**

## References

- [`docs/13-adr/ADR-011-accounting-immutability.md`](./ADR-011-accounting-immutability.md) — accounting ledger (finance module delegates here)
- [`docs/13-adr/ADR-012-domain-event-audit.md`](./ADR-012-domain-event-audit.md) — domain events (analytics exceptions could feed into this in future)
- [`docs/13-adr/ADR-021-deals-coupons-loyalty-engine.md`](./ADR-021-deals-coupons-loyalty-engine.md) — loyalty ledger (loyalty module delegates here)
- [`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`](./ADR-018-order-lifecycle-state-machine.md) — order lifecycle (sales module reads from this)
- [`backend/api/src/services/analytics/engine.ts`](../../backend/api/src/services/analytics/engine.ts) — `AnalyticsService`
- [`backend/api/src/services/analytics/registry.ts`](../../backend/api/src/services/analytics/registry.ts) — `FORMULA_REGISTRY`
- [`backend/api/src/services/analytics/types.ts`](../../backend/api/src/services/analytics/types.ts) — `ANALYTICS_TIMEZONE`
- [`backend/api/src/services/analytics/exports.ts`](../../backend/api/src/services/analytics/exports.ts) — CSV/Excel/PDF exports
- [`backend/api/src/services/reports/sales.ts`](../../backend/api/src/services/reports/sales.ts) — legacy sales CSV
- [`backend/api/src/services/dashboard/summaries.ts`](../../backend/api/src/services/dashboard/summaries.ts) — `DashboardSummariesService`
- [`backend/api/src/modules/admin/reports.ts`](../../backend/api/src/modules/admin/reports.ts) — admin endpoints
- [`backend/api/src/modules/admin/dashboard.ts`](../../backend/api/src/modules/admin/dashboard.ts) — dashboard endpoints
- Migrations: `20260730193000_reports_read_permission.sql`, `20260801120000_rc4_analytics_bi_foundation.sql`
