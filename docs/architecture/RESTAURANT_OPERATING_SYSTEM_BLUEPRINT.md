# Telepizza Restaurant Operating System Blueprint

**Status:** Approved Target Architecture
**Classification:** Architecture Blueprint
**Authority:** Approved Product Direction
**Implementation Evidence:** No
**Release Evidence:** No
**Repository Verification:** Required for current-state claims

---

## Purpose

This document defines the approved long-term product and system
architecture for the Telepizza Restaurant Operating System.

It describes intended roles, dashboards, operational consoles,
management workspaces, product boundaries, UX principles, and
delivery direction.

This document does not prove that any capability is currently
implemented, verified, merged, deployed, or released.

Repository evidence and acceptance records remain the only sources
for implemented and verified capability claims. See
[`assessments/`](./assessments/) for point-in-time repository assessments.

---

## 1. Product Vision

Telepizza is a **Restaurant Operating System (ROS)** — not only a POS.

The platform must connect ordering, kitchen execution, delivery,
branch operations, back-office management, and enterprise oversight
under one governed product model.

Strategic inspiration (not competitor implementation evidence):

| Inspiration | Intent for Telepizza |
| --- | --- |
| Square / Toast simplicity | Fast operational screens; one primary action |
| Restaurant365 back-office depth | Inventory, purchasing, finance, and labor depth over time |
| Oracle enterprise hierarchy | Multi-org / multi-branch governance when architecture is ready |
| Foodics / Sapaad regional usability | Practical shift operations for local restaurant staff |
| Odoo modular integration | Clear module boundaries with shared platform services |
| Telepizza Repository Truth | Architecture ≠ implementation ≠ acceptance ≠ release |

Do not treat competitor marketing as Telepizza capability evidence.

---

## 2. Core UX Principles

- Everything accessible, not everything visible.
- Status → Problem → Next Action.
- One primary action per screen.
- Important KPIs and exceptions first.
- Advanced filters remain secondary.
- Alerts must provide an actionable next step.
- Do not fabricate values.
- Error, empty, unavailable, foundation, derived, stale, offline, and live states must remain semantically distinct.
- Business roles receive business language.
- Platform and technical administrators may receive technical diagnostics.

---

## 3. Canonical Product Terminology

| Term | Meaning |
| --- | --- |
| **Dashboard** | Role-specific home: summary, exceptions, and decisions |
| **Console** | Real-time operational execution |
| **Workspace** | Configuration, records, administration, and management |
| **Application** | Dedicated staff, customer, rider, kiosk, POS, or device experience |

These terms are product language. Route paths may differ until an ADR authorizes rename.

---

## 4. Role-Based Home Dashboards

### 4.1 Platform Owner Dashboard

| Field | Target |
| --- | --- |
| Primary user | Mianx / platform operator |
| Scope | Cross-organization platform health |
| Key decisions | Tenant health, platform incidents, commercial platform controls |
| Important metrics | Org count, platform error budget, integration health |
| Allowed actions | Platform diagnostics; tenant escalation (target) |
| Data sensitivity | Highest — cross-tenant |
| Explicit exclusions | Day-to-day branch cooking, cashiering, rider dispatch |

**Marking:** Approved Target · **Not Current Operational Requirement** until multi-tenant platform architecture is verified in repository evidence.

### 4.2 Super Admin Dashboard

| Field | Target |
| --- | --- |
| Primary user | Telepizza technical / system administrator |
| Scope | Full organization technical control |
| Key decisions | Access, integrations, incident response, config risk |
| Important metrics | Auth failures, API health, permission anomalies, failed jobs |
| Allowed actions | Technical diagnostics; governed configuration |
| Data sensitivity | High |
| Explicit exclusions | Replacing Branch Manager operational judgment |

### 4.3 Organization / Franchise Owner Dashboard

| Field | Target |
| --- | --- |
| Primary user | Business owner |
| Scope | Organization-wide commercial performance |
| Key decisions | Growth, margin, branch investment, brand standards |
| Important metrics | Sales, order volume, AOV, branch comparison, exceptions |
| Allowed actions | Review, drill-down, approve major commercial policies (target) |
| Data sensitivity | Commercial confidential |
| Explicit exclusions | Ticket bumping, rider assignment, POS ringing |

### 4.4 Organization Admin Dashboard

| Field | Target |
| --- | --- |
| Primary user | Central operations administrator |
| Scope | Org policies, master data, cross-branch operations |
| Key decisions | Menu/policy rollout, staffing policy, supplier standards |
| Important metrics | Open exceptions, compliance drift, pending approvals |
| Allowed actions | Workspace administration within policy |
| Data sensitivity | High |
| Explicit exclusions | Platform tenancy controls |

### 4.5 Regional / Area Manager Dashboard

| Field | Target |
| --- | --- |
| Primary user | Multi-branch area manager |
| Scope | Assigned region / branch set |
| Key decisions | Coaching, staffing coverage, SLA recovery |
| Important metrics | Branch scorecards, delayed orders, labor coverage |
| Allowed actions | Branch drill-down; escalate exceptions |
| Data sensitivity | Regional commercial + ops |
| Explicit exclusions | Unassigned regions; platform config |

### 4.6 Branch Manager Dashboard

| Field | Target |
| --- | --- |
| Primary user | Branch manager |
| Scope | Single branch (or assigned branch set) |
| Key decisions | Shift readiness, staffing, cash, inventory exceptions |
| Important metrics | Today sales/orders, kitchen queue, delivery load, cash variance (target) |
| Allowed actions | Open consoles; resolve branch exceptions |
| Data sensitivity | Branch PII and cash |
| Explicit exclusions | Enterprise GL closing; other branches outside scope |

Intended manager analytics home aligns with repository route `/admin/branch` (do not rename without ADR).

### 4.7 Staff Dashboard

| Field | Target |
| --- | --- |
| Primary user | Cashier, kitchen, waiter, rider, or general staff |
| Scope | Role-assigned tasks for current shift |
| Key decisions | What to do next |
| Important metrics | Personal queue, assigned tickets, shift notices |
| Allowed actions | Open the relevant console/application only |
| Data sensitivity | Least privilege |
| Explicit exclusions | Finance ledgers; org-wide analytics |

---

## 5. Operational Consoles

### 5.1 Console catalog (target)

| Console | Purpose |
| --- | --- |
| Operations Command Center | Live shift command across orders, kitchen, and dispatch |
| Orders Console | Order intake, status transitions, exceptions |
| Kitchen Display System | Full-screen ticket execution |
| Delivery / Dispatch Console | Rider assignment and delivery status |
| POS Console | Cashier and touch-focused selling |
| Waiter / Table Console | Dine-in table service execution |

### 5.2 Intended route separation (repository-aware)

Do **not** rename existing routes unless an approved ADR exists.

| Concern | Intended surface | Current repository-equivalent (if any) |
| --- | --- | --- |
| Manager analytics / staffing / inventory / cash / exceptions | Branch Manager Dashboard | `/admin/branch` |
| Live shift command center | Operations Command Center | `/ops` (and `/ops/orders`, `/ops/kitchen`, `/ops/dispatch`) |
| Full-screen kitchen execution | Kitchen Display System | `/admin/kitchen-dashboard` (also `/admin/kitchen`, `/ops/kitchen` coexist today) |
| Cashier / touch POS | POS Console | `/admin/pos` |

Target architecture allows eventual dedicated `/kds` and `/pos` application shells **only after ADR + migration plan**. Until then, repository routes remain authoritative.

---

## 6. Management Workspaces

Target capability only. No implementation claim.

| # | Workspace | Target scope |
| --- | --- | --- |
| 1 | Menu and Pricing | Catalog, variants, modifiers, availability, pricing governance |
| 2 | Inventory, Recipes, and Food Cost | Stock, recipes, theoretical vs actual food cost |
| 3 | Purchasing and Suppliers | Suppliers, POs, receiving, invoice match |
| 4 | Finance, Cash, and Accounting | Cash drawer, settlements, taxes, ledger postings |
| 5 | CRM and Customer 360 | Identity, history, preferences, service cases |
| 6 | Loyalty, Promotions, and Marketing | Points, tiers, campaigns, offer rules |
| 7 | Workforce and Scheduling | Directory, roles, schedules, attendance, payroll handoff |
| 8 | Reports and Business Intelligence | Executive and operational BI with governed metrics |
| 9 | Security, Audit, and Governance | Access reviews, audit trails, policy controls |
| 10 | Integrations, Channels, and Devices | Channels, devices, webhooks, partner connectors |

---

## 7. Customer and Field Applications

Unless repository evidence proves otherwise, treat the following as **target applications**:

| Application | Target purpose | Evidence posture |
| --- | --- | --- |
| Online ordering application | Browse, cart, checkout, account | Customer website exists in repository; depth varies by slice |
| WhatsApp ordering and inbox | Conversation commerce + ops inbox | Target depth beyond current foundation |
| QR and table ordering | Dine-in session ordering | Target / partial foundations may exist; verify before claiming |
| Self-service kiosk | In-store ordering device UX | Target |
| Rider application | Delivery execution for riders | Target / partial rider APIs may exist; verify before claiming |
| Customer display and order tracking | Status visibility for guests | Target |

Screenshots and mockups are not implementation evidence.

---

## 8. Product Hierarchy

```text
Platform Owner
        ↓
Super Admin
        ↓
Organization Owner
        ↓
Organization Admin
        ↓
Regional Manager
        ↓
Branch Manager
        ↓
Operational and Functional Managers
        ↓
Cashier / Kitchen / Rider / Waiter / Staff
        ↓
Customer Channels
```

Lower roles inherit least-privilege task scope. Higher roles gain broader visibility and approval authority, not unbounded write rights by default.

---

## 9. Shared Platform Capabilities

Architecture-wide requirements (target):

| Capability | Intent |
| --- | --- |
| Organization and branch tenancy | Hard scope boundaries for data and actions |
| Identity and RBAC | Server-authoritative roles and permissions |
| Approval policies | Human approval for sensitive actions |
| Audit logs | Append-only, attributable change history |
| API contracts | Versioned, documented public contracts |
| Event model | Domain events for ops and integrations |
| Observability | Health, metrics, traces, structured logs |
| Offline and retry behavior | Safe retries; no silent data loss |
| Integration framework | Channel and partner connectors |
| Device management | POS, KDS, printers, payment devices |
| Localization | Language and regional formats |
| Business-day and timezone rules | Asia/Karachi (or org-configured) business day |
| Data classification | PII, commercial, secrets handling |
| Accessibility | Keyboard, contrast, assistive tech |
| Responsive design | Phone / tablet / desktop role fitness |
| Status semantics | LIVE / DERIVED / FOUNDATION / UNAVAILABLE / ERROR / STALE / OFFLINE |

---

## 10. Proposed Engineering Roadmap

**Roadmap authorization is separate from this blueprint.**

This section is a technically recommended sequence only. It does not authorize implementation, commit, merge, or release.

1. Production API Reliability and Unified Operational Status
2. Organization Hierarchy, Roles, and RBAC
3. Orders → POS → Kitchen → Delivery
4. Menu → Recipes → Inventory → Purchasing
5. Cash Management → Finance → Accounting
6. CRM → Loyalty → Promotions → WhatsApp
7. Employees → Scheduling → Attendance
8. Owner → Regional → Enterprise BI → AI

---

## 11. Recommended Next Slice

### Proposal — not authorization

#### D2 — Production Data Reliability and Unified Operational Status

Proposed concerns:

- shared API client behavior
- authentication propagation
- organization and branch scope propagation
- API environment correctness
- dashboard loading reliability
- orders loading reliability
- kitchen ticket loading reliability
- delivery assignment loading reliability
- error versus empty-state semantics
- stale-data handling
- retry behavior
- health status
- request tracing
- observability
- consistent LIVE / DERIVED / FOUNDATION / UNAVAILABLE / ERROR / STALE / OFFLINE semantics

**The blueprint does not authorize D2 implementation.**

D2 requires separate Founder / Chief Architect authorization, requirements, and acceptance gates before any product code changes.

---

## Related Documents

| Document | Role |
| --- | --- |
| [`../00-governance/GOVERNANCE.md`](../00-governance/GOVERNANCE.md) | Governance constitution |
| [`../00-governance/REPOSITORY_STATUS.md`](../00-governance/REPOSITORY_STATUS.md) | Living repository status |
| [`../00-governance/ADR_INDEX.md`](../00-governance/ADR_INDEX.md) | Architecture Decision Register |
| [`assessments/ROS_CURRENT_STATE_ASSESSMENT_2026-07-25.md`](./assessments/ROS_CURRENT_STATE_ASSESSMENT_2026-07-25.md) | Point-in-time repository assessment |
| [`../14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) | Locked phase roadmap (separate authority) |
| Domain architecture notes under [`./`](./) | Slice-specific architecture (not this blueprint) |

---

## Summary

This blueprint is approved **target product direction** for Telepizza ROS.

It must never be cited as proof that a module is implemented, verified, or released.
