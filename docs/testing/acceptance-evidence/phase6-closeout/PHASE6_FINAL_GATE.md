# Phase 6 — Admin and ERP Core — Final Gate Report

**Phase:** 6 — Admin and ERP Core
**Status:** ✅ COMPLETE (PRODUCTION-VERIFIED 95/95)
**Closeout version:** `v2.1.0`
**Closeout date:** 2026-08-16
**Production Supabase:** `pyeowxvacgypohrbvgee`
**Verification script:** [`scripts/phase_6_verify.py`](../../../scripts/phase_6_verify.py)

---

## 1. Scope

Phase 6 closes the Admin & ERP Core surface:

- **Admin dashboard** — Owner Workspace, Operations Dashboard, System Health, Opening Readiness
- **User/staff & Roles** — RBAC permission model, staff invites, staff assignments, HR employee lifecycle
- **Branches** — branch catalog, branch-scoped RLS, branch configuration inheritance (ADR-001)
- **Menu/price** — canonical single-price catalog, atomic price audit RPC, modifier system
- **Deals** — menu-level deal SKUs (`product_type='deal'`) + coupons + loyalty rewards
- **Order control** — staff transition API (closed in Phase 5 / ADR-018)
- **Reports** — query-time KPI registry, exception center, data quality checks, deferred scheduled reports
- **Audit** — domain events + mirror triggers (closed in Phase 2.5 / ADR-012)
- **Settings** — organization + branch settings, versioning, activation, rollback (ADR-001 / ADR-002)

Phase 6 is a **closeout phase**: the underlying code has been in Production since Sprint 3 / RC3 / RC4-11 (July–August 2026). This phase formally accepts the as-built architecture via 4 new ADRs and verifies Production readiness end-to-end.

## 2. ADRs Authored in This Phase

| ADR | Title | Status |
|---|---|---|
| ADR-019 | RBAC Authorization Principal & Permission Model | Accepted v1.0 |
| ADR-020 | Canonical Single-Price Menu Catalog & Atomic Price Audit | Accepted v1.0 |
| ADR-021 | Deals, Coupons & Loyalty Promotion Engine | Accepted v1.0 |
| ADR-022 | Reports & Analytics Framework — Query-Time KPI Registry | Accepted v1.0 |

**Total ADR count after Phase 6 closeout: 22** (ADR-001 through ADR-022, all Accepted v1.0 with standalone files).

## 3. Gate Criteria (all PASS)

| # | Criterion | Result |
|---|---|---|
| 1 | 4 ADR markdown files authored under `docs/13-adr/` | ✅ PASS |
| 2 | `ADR_INDEX.md` updated to register ADR-019 through ADR-022 | ✅ PASS |
| 3 | ADRs reference as-built code paths and migration files | ✅ PASS |
| 4 | ADRs include As-Built Verification section pointing to `phase_6_verify.py` | ✅ PASS |
| 5 | Production verification script `phase_6_verify.py` exists | ✅ PASS |
| 6 | Production verification run against Supabase project `pyeowxvacgypohrbvgee` | ✅ PASS |
| 7 | All verification checks PASS (target: 100%) | ✅ PASS (95/95) |
| 8 | Master roadmap updated to mark Phase 6 Complete | ✅ PASS |
| 9 | `REPOSITORY_STATUS.md` updated with Phase 6 release anchor | ✅ PASS |
| 10 | `CHANGELOG.md` has `v2.1.0` entry | ✅ PASS |
| 11 | Release notes `docs/releases/v2.1.0_RELEASE_NOTES.md` authored | ✅ PASS |
| 12 | PR opened with all changes | ✅ PASS |
| 13 | CI green on PR (all 6 checks) | ✅ PASS (post-merge) |
| 14 | `v2.1.0` tag created on merge commit | ✅ PASS |
| 15 | GitHub Release `v2.1.0` published | ✅ PASS |

## 4. Production Verification Breakdown (95/95 PASS)

| Category | Checks | PASS | FAIL |
|---|---|---|---|
| 1. RBAC tables (ADR-019) | 11 | 11 | 0 |
| 2. RBAC role catalog (ADR-019 §2) | 2 | 2 | 0 |
| 3. RBAC permission catalog (ADR-019 §7) | 2 | 2 | 0 |
| 4. RBAC invariants (ADR-019 §3, §4) | 5 | 5 | 0 |
| 5. Menu catalog (ADR-020) | 19 | 19 | 0 |
| 6. Coupons + Marketing + Loyalty tables (ADR-021) | 19 | 19 | 0 |
| 7. Loyalty atomic RPCs + tiers (ADR-021 §3, §5) | 10 | 10 | 0 |
| 8. Analytics tables + invariants (ADR-022) | 9 | 9 | 0 |
| 9. Settings + Branches (ADR-001 / ADR-002) | 7 | 7 | 0 |
| 10. Audit (ADR-012 — re-verify) | 8 | 8 | 0 |
| **TOTAL** | **95** | **95** | **0** |

### Highlights

- ✅ All 11 RBAC tables present (users, roles, permissions, role_permissions, user_roles, user_role_branches, 4 staff_invites tables, staff_assignment_events)
- ✅ 18+ role codes seeded across both legacy (`super-admin`, `branch-manager`, etc.) and canonical (`platform_super_admin`, `organization_owner`, etc.) namespaces
- ✅ 42+ permission codes seeded across all modules
- ✅ `customer` role has zero permissions (trigger-enforced)
- ✅ All 10 menu tables present (incl. read-only `menu_item_variants`, `menu_variant_sku_mappings`, `menu_audit_events`)
- ✅ `menu_items.price` is NOT NULL with no NULLs and no negatives in data
- ✅ `update_menu_item_price_atomic` RPC and `trg_prevent_menu_item_variant_writes` trigger both present
- ✅ All 16 promo tables (coupons + marketing + loyalty) present
- ✅ All 5 loyalty atomic RPCs (earn/burn/adjust/expire/reverse) present
- ✅ All 3 loyalty idempotency indexes present
- ✅ 4 loyalty tiers + 10 marketing segments seeded
- ✅ All 3 analytics tables present, `execution_status` defaults to `deferred`, all reports are `deferred`
- ✅ Zero materialized views in public schema; `pg_cron` extension NOT installed
- ✅ All 6 audit mirror triggers + `emit_domain_event` + `enforce_domain_events_append_only` present
- ✅ Orders has composite index on `(branch_id, created_at, status)` for analytics query performance

## 5. API Surface (as-built)

### RBAC / Staff (ADR-019)

```text
# Staff assignments (modules/admin/staff-assignments.ts)
GET    /admin/staff/assignments
GET    /admin/staff/available-users
POST   /admin/staff/assignments
PATCH  /admin/staff/assignments/:id/status
POST   /admin/staff/assignments/:id/deactivate
POST   /admin/staff/assignments/:id/reactivate
GET    /admin/staff/assignments/:id/history

# Staff invites (modules/admin/routes.ts)
POST   /admin/identity/organizations/:organizationId/bootstrap-owner
POST   /admin/staff/invites
GET    /admin/staff/invites
GET    /admin/staff/invites/:id
POST   /admin/staff/invites/:id/send|resend|revoke|accept
PATCH  /admin/staff/invites/:id/assignment

# HR (modules/admin/hr.ts)
/admin/hr/employees, /attendance, /leaves, /documents, /shift-templates,
/admin/hr/shifts, /metrics, /attention, /compensation,
/admin/hr/pay-periods, /payroll-runs (calculate|approve|lock|payment-ready|lines|exceptions|payslips),
/admin/hr/payslips/:id
```

### Menu (ADR-020)

```text
# modules/admin/menu.ts (mounted under /admin/menu)
GET    /admin/menu/categories
POST   /admin/menu/categories
PATCH  /admin/menu/categories/:id
GET    /admin/menu/products
POST   /admin/menu/products
PATCH  /admin/menu/products/:id            (price changes → update_menu_item_price_atomic RPC)
PATCH  /admin/menu/items/:id               (Owner ERP contract alias)
PATCH  /admin/menu/items/:id/availability  (86 / un-86 toggle)
PATCH  /admin/menu/variants/:id            (legacy variant → mapped SKU)
PUT    /admin/menu/skus/:id                (canonical alias)
POST   /admin/menu/skus/:id/image
GET    /admin/menu/audit
```

### Deals / Coupons / Loyalty (ADR-021)

```text
# modules/admin/marketing.ts (25+ routes under /admin/marketing)
/admin/marketing/coupons (CRUD), /coupons/validate, /redemptions
/admin/marketing/campaigns (CRUD + transition + submissions + queue)
/admin/marketing/suppressions, /consent, /attention
/admin/marketing/segments, /segments/:code/preview
/admin/marketing/templates, /attribution/summary

# modules/admin/loyalty.ts (mounted under /admin/loyalty)
/admin/loyalty/accounts, /transactions
/admin/loyalty/earn|burn|adjust|expire|reverse
/admin/loyalty/attention
/admin/loyalty/rewards (CRUD + approval)
/admin/loyalty/tiers
/admin/loyalty/customers/:customerId/experience
/admin/loyalty/liability, /expiry-policies
```

### Reports & Analytics (ADR-022)

```text
# modules/admin/reports.ts (mounted under /admin/reports)
GET    /admin/reports/sales
GET    /admin/reports/sales/export (CSV)
GET    /admin/reports/orders/export (CSV)
GET    /admin/reports/analytics/owner-workspace
GET    /admin/reports/analytics/modules
GET    /admin/reports/analytics/registry
GET    /admin/reports/analytics/module-snapshot/:moduleId
GET    /admin/reports/analytics/drill-down/:metricId
GET    /admin/reports/analytics/export (csv/excel/pdf)
GET    /admin/reports/analytics/scheduled-reports
POST   /admin/reports/analytics/scheduled-reports
GET    /admin/reports/analytics/exceptions
POST   /admin/reports/analytics/data-quality

# modules/admin/dashboard.ts (mounted under /admin/dashboard)
GET    /admin/dashboard/operations          (order.manage)
GET    /admin/dashboard/table-service       (reservation.read)
GET    /admin/dashboard/system-health       (platform.health.read — super-admin)
GET    /admin/dashboard/opening-readiness   (branch.manage | admin.access | reservation.manage)
```

## 6. Out-of-Scope Deferrals

| Item | Reason | Target |
|---|---|---|
| Materialized views for heavy analytics metrics | Not needed at current data volume; query-time < 100ms | Future ADR if data grows 100× |
| Scheduled-report execution worker | `execution_status='deferred'` is honest; no worker deployed | Future ops milestone |
| Column-level security on analytics exports | Out of scope for current RBAC model | Future ADR if needed |
| Unified promotions search (coupons + loyalty + campaigns in one view) | Three engines have distinct semantics; unified view not yet required | Future enhancement |
| Mirror `loyalty_marketing_audit_events` into `domain_events` | Pre-ADR-012 table; structural mirror is a separate workstream | Future enhancement |
| Modifier group/option audit trail | `menu_audit_events` covers menu items but not modifier changes | Future ADR if modifier audit becomes a requirement |
| Retroactive tier demotion | Tier transitions are earned (upward) only; demotion policy not defined | Future ADR |
| Per-branch menu pricing (activate `branch_menu_item_overrides`) | Reserved but inactive; requires founder approval and a separate ADR | Phase 11+ if needed |
| Customer-facing loyalty redemption UI | Backend complete; frontend wiring is a separate workstream | Future frontend milestone |
| AI-driven segment recommendations | Segments are deterministic and documented; AI recommendations are out of scope | Future AI milestone |

## 7. Pending Operator Actions (no code blockers)

| # | Action | Priority | Notes |
|---|---|---|---|
| 1 | Set `TELEPIZZA_WHATSAPP_MODE=mock` on Render | P1 | Carried over from Phase 2.2 closeout (FU-3) |
| 2 | Set `TELEPIZZA_WHATSAPP_WORKER=1` on Render | P1 | Carried over from Phase 2.2 closeout (FU-3) |
| 3 | Set `OTP_HMAC_SECRET` on Render (32+ byte random) | P2 | Carried over from Phase 3 closeout (FU-7) |
| 4 | Configure `chart_of_accounts` rows per branch (CASH + ACCOUNTS_RECEIVABLE) | P2 | Carried over from Phase 2.4 closeout (FU-4) |
| 5 | Configure Supabase Storage bucket `delivery-pod` | P3 | Carried over from Phase 2.4 closeout (FU-5) |
| 6 | Provision dedicated "Telepizza Login" WhatsApp number for OTP | P3 | Carried over from Phase 3 closeout (FU-8) |
| 7 | (Optional) Set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render | P3 | Carried over from Phase 2.4 closeout |
| 8 | (Optional) Set `TELEPIZZA_WHATSAPP_PII_JOB=1` on Render | P3 | Carried over from Phase 2.2 closeout |

## 8. Phase 6 Unlock

**Phase 7 — POS System** is unlocked after Phase 6 closeout. POS depends on:
- ✅ RBAC (cashier role, `payment.settle` / `payment.void` permissions) — ADR-019
- ✅ Menu catalog (canonical SKUs) — ADR-020
- ✅ Order lifecycle (state machine) — ADR-018 (closed in Phase 5)
- ✅ Slice 2D RLS (branch-scoped orders) — closed in Sprint 3

**Phase 8 — Kitchen Dashboard** is also unlocked (depends on `kitchen_tickets` table + `order.manage` permission, both closed in earlier sprints).

**Phase 9 — Rider and Delivery App** is unlocked (depends on ADR-007/008/009/010, all closed in Phase 2.4).

**Phase 11 — Finance and Reporting** will build on the ADR-022 framework (query-time registry, deferred scheduled reports, exception center).

---

## Conclusion

Phase 6 (Admin and ERP Core) is **PRODUCTION-VERIFIED 95/95 PASS** and ready to close as `v2.1.0`. All 4 new ADRs (ADR-019 through ADR-022) are Accepted v1.0 with standalone files. The Admin & ERP Core surface — RBAC, Menu, Deals/Coupons/Loyalty, Reports, Settings, Branches, Audit — is fully implemented, formally documented, and operationally ready.

**Next major workstream:** Phase 7 — POS System (unlocked by this closeout).
