# RC6 Command Center Architecture

**Status:** Proposed planning contract (RC6-DASH-00)
**Date:** 2026-08-02
**Baseline tip:** `da99875ddedbc25ae51e6db22a16de4a50d2ea16` (post-A11Y-02)
**Production website runtime (separate):** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`

> This document defines **approved product/technical contracts**. It does **not** implement widgets, mutations, migrations, or providers. Visible routes, mocks, schema tables, or static cards alone are **not** end-to-end proof.

---

## 1. Purpose

Define the Owner-facing **Restaurant Command Center** as a progressive, trust-labeled operating surface over existing Telepizza ROS domains (orders, kitchen, delivery, cash, inventory, HR, finance, settings), without inventing LIVE status for incomplete workflows.

**Current repository anchor:** `/admin/dashboard` → Owner Command Center (`LIVE_VERIFIED` for Owner login + dashboard shell; deeper widgets remain mixed truth).

---

## 2. Six-zone structure

| # | Zone | Owner decision | Typical widgets (registry IDs) |
| --- | --- | --- | --- |
| 1 | **What Needs Attention** | What must I act on now? | Exception Center, Critical alerts, Pending approvals, Open complaints |
| 2 | **Business Performance** | How is the business doing? | Net Sales, Orders, AOV, Cancelled/refunded, Forecast vs actual, Profitability truth |
| 3 | **Live Operations** | What is happening on the floor now? | Kitchen queue/delays, Active/late deliveries, Rider availability, Live timeline |
| 4 | **Customer and Growth** | Where is customer risk/opportunity? | Complaints, CRM signals, Loyalty/marketing health (trust-labeled) |
| 5 | **Multi-branch Control** | How do branches compare and drift? | Branch comparison, Branch health score, Readiness, System health |
| 6 | **Mianx.ai Intelligence** | What does the assistant recommend? | AI recommendations, What Changed explanations (draft-only until Founder ADR) |

Zone 6 remains **PLANNED / FOUNDATION_READ_ONLY** until `RC6-AI-01` ADR. Draft recommendations must never auto-execute.

---

## 3. Progressive interaction model

| Level | Name | Behavior | Mutation |
| --- | --- | --- | --- |
| 1 | Situation summary | KPI / severity card | None |
| 2 | Explanation | Why this matters; trust/source/freshness | None |
| 3 | Filtered records | Drill-down list with preserved filters | None / read |
| 4 | Recommended action | Proposed next step (human-readable) | Draft only unless maturity allows |
| 5 | Approval / execution | Confirm, re-auth, approve, or execute | Per Action Registry |
| 6 | Audit and outcome | Immutable event + outcome state | Audit write only |

**Rule:** UI presence of a button is not execution maturity. Maturity comes from `RC6_COMMAND_CENTER_ACTION_REGISTRY.md`.

---

## 4. Daily operating modes

| Mode | Intent | Required signals |
| --- | --- | --- |
| **Pre-open** | Readiness before service | Branch hours, staff attendance, inventory low/out, device/KDS health, payments channels |
| **Live Operations** | Active service | Kitchen delays, dispatch queue, late deliveries, cash variance, complaints |
| **Closing** | End-of-day control | Expected cash/variance, rider COD pending, EOD pack readiness, unfinished tickets |
| **Manual override** | Temporary mode lock by Owner/BM | Audit who/why/until; visible banner |
| **Branch-local timezone** | All windows in branch TZ (Asia/Karachi default) | Explicit TZ on every KPI contract |
| **Degraded / unknown** | Source missing, stale, or denied | No fake zeros; show UNAVAILABLE/STALE |

---

## 5. Cross-cutting behavior (required)

| Concern | Contract |
| --- | --- |
| Global filters | Organization → brand → branch → time window; sticky across drill-downs |
| Role scope | Owner org-wide; BM/kitchen/delivery scoped per Role Matrix |
| Drill-down preservation | Query params carry branch, severity, window, source widget ID |
| Freshness | Each widget declares target; UI shows age + trust state |
| Loading / empty / stale / error / denied | Distinct copy; empty ≠ zero; denied ≠ error |
| Permissions | Backend authorization is source of truth; UI hide ≠ security |
| Audit | Levels 5–6 emit audit/events per Unified Event Model |
| Accessibility | WCAG-oriented; follow RC6-A11Y-02 patterns for new chrome |
| Mobile | Attention + Live Ops first; dense tables progressive |
| Performance | Lazy zones; widget timeouts; cancel stale polls (NFR doc) |
| Partial provider outage | Widget UNAVAILABLE; rest of shell remains usable |
| Runtime trust indicator | Separate tip SHA / Prod website SHA / migration tip / API health |

---

## 6. Honesty rules

1. Do not mark a capability LIVE because a sidebar route exists.
2. Do not treat analytics `exception_center` as the Owner Exception Center product.
3. Do not treat delivery assign/status foundation as full rider lifecycle + POD + COD settlement.
4. Do not treat Settings Foundation panels as configuration versioning/rollback.
5. Operational Estimate ≠ Accounting Posted (`RC6_KPI_TRUST_REGISTRY.md`).
6. AI recommendations are draft-only until Founder-gated ADR.

---

## 7. Related contracts

| Document | Role |
| --- | --- |
| `RC6_COMMAND_CENTER_WIDGET_REGISTRY.md` | Widget catalogue |
| `RC6_KPI_TRUST_REGISTRY.md` | KPI definitions and trust |
| `RC6_COMMAND_CENTER_ACTION_REGISTRY.md` | Action maturity |
| `RC6_EXCEPTION_AND_RISK_CATALOGUE.md` | Exceptions |
| `RC6_UNIFIED_EVENT_MODEL.md` | Events / What Changed |
| `RC6_DELIVERY_RIDER_DOMAIN_CONTRACT.md` | Delivery/rider domain |
| `RC6_SETTINGS_CONFIGURATION_CONTRACT.md` | Settings inheritance |
| `RC6_COMMAND_CENTER_ROLE_MATRIX.md` | RBAC |
| `RC6_COMMAND_CENTER_NON_FUNCTIONAL_REQUIREMENTS.md` | A11y/perf/security |
| `RC6_COMMAND_CENTER_TRACEABILITY.md` | Vision → slice → proof |

---

## 8. Current vs vision (summary)

| Area | Current truth | Vision |
| --- | --- | --- |
| Owner shell | LIVE dashboard + attention APIs | Six-zone Command Center |
| Exception product | Attention cards + analytics exceptions (different) | Unified Exception Center (DASH-01+) |
| Delivery | PARTIAL_LIVE assign/status | Full lifecycle + POD + COD (DEL/RIDER slices) |
| Settings | PARTIAL_LIVE org/branch/delivery writes | Inheritance, versioning, rollback (SET slices) |
| AI zone | PLANNED / foundation read-only | Draft recommendations with audit (AI-01) |
