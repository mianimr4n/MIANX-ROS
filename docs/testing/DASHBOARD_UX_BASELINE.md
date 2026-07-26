# Dashboard UX Baseline

**Worktree:** `D:\projects\telepizza-dashboard-ux`

**Branch:** `feature/dashboard-ux-excellence`

**Base SHA:** `222a3a523459035e289452089f6c4a4bbfd85ae4`

**Method:** Repository evidence only (component/route inspection). Runtime overflow and visual density marked UNKNOWN where not screenshot-proven.

This baseline feeds Phase 3–16 task-first UX work. Problems are classified only with file evidence.

---

## 1. Route → component map

| Route | Page | Shell |
| --- | --- | --- |
| `/admin/dashboard` | `apps/website/client/src/pages/admin/AdminDashboard.tsx` | `AdminShell` |
| `/admin/home/config` | `AdminConfigHome.tsx` | `RoleHomeShell` → `AdminShell` |
| `/admin/branch` | `AdminBranchManager.tsx` | `AdminShell` |
| `/admin/home/cashier` | `AdminCashierHome.tsx` | `RoleHomeShell` |
| `/admin/home/host` | `AdminHostHome.tsx` | `RoleHomeShell` |
| `/admin/home/waiter` | `AdminWaiterHome.tsx` | `RoleHomeShell` |
| `/admin/home/delivery` | `AdminDeliveryHome.tsx` | `RoleHomeShell` |
| `/admin/home/staff` | `AdminStaffHome.tsx` | `RoleHomeShell` |
| `/admin/kitchen-dashboard` | `AdminKitchenDashboard.tsx` | `KitchenManagerShell` |
| `/ops` | `pages/ops/OpsDashboard.tsx` | `OpsShell` |
| `/ops/orders` | `OpsOrders.tsx` | `OpsShell` |
| `/ops/kitchen` | `OpsKitchen.tsx` | `OpsShell` |
| `/ops/dispatch` | `OpsDispatch.tsx` | `OpsShell` |

Related destinations: `/admin/orders`, `/admin/pos`, `/admin/kitchen`, `/admin/delivery`, `/admin/reservations`, `/admin/waitlist`, `/admin/floor`, `/admin/floor-plan`, `/admin/menu`, `/admin/reports`. `/admin/branches` is Coming Soon (`App.tsx`).

---

## 2. Persona → home map

Evidence: `resolveStaffHome` in `apps/website/client/src/lib/admin-access.ts`.

| Persona | Canonical home |
| --- | --- |
| Super Admin / Owner presentation | `/admin/dashboard` |
| Configuration | `/admin/home/config` |
| Branch Manager | `/admin/branch` |
| Cashier | `/admin/home/cashier` |
| Host | `/admin/home/host` |
| Waiter | `/admin/home/waiter` |
| Kitchen | `/admin/kitchen-dashboard` |
| Delivery | `/admin/home/delivery` |
| General Staff | `/admin/home/staff` |
| Staff login path | `/ops` (bypasses role-home matrix) |

---

## 3. Shared components (current)

| Component | Path | Gap |
| --- | --- | --- |
| `RoleHomeShell` | `components/admin/dashboard/RoleHomeShell.tsx` | Duplicate H1 with `AdminShell`; no Start Here / Needs Attention structure |
| `DashboardActionCard` | `.../DashboardActionCard.tsx` | Primary action ranking inconsistent across callers |
| `OperationsModuleGrid` | `.../OperationsModuleGrid.tsx` | Kitchen deep-link goes to ERP (`/admin/kitchen`), not KDS |
| `LiveOperationsPanels` | `.../LiveOperationsPanels.tsx` | Kitchen/Delivery status panels not actionable |
| `OpeningReadinessSummary` | `.../OpeningReadinessSummary.tsx` | Raw blocker codes; camelCase labels |
| `AdminKpiCard` | `components/admin/AdminKpiCard.tsx` | State badges use engineer terms (LIVE/DERIVED/FOUNDATION) |
| `AdminShell` | `pages/admin/AdminShell.tsx` | Sticky H1 always present → RoleHomeShell H1 collision |
| `OpsShell` | `pages/ops/OpsShell.tsx` | No branch selector; path-string shortcut labels |

No `DashboardHeader` component exists today.

---

## 4. Ranked baseline problems

### P0

1. **Dual operating systems** — `/staff/login` → `/ops` while `/admin` uses `resolveStaffHome`. Same people get different chrome and branch UX.
2. **Dual kitchen surfaces** — Owner/BM primary kitchen CTA targets `/admin/kitchen` (ERP), not `/admin/kitchen-dashboard` (KDS). Also `/ops/kitchen`.

### P1

3. **Double H1** on every `RoleHomeShell` page (`AdminShell` + shell title).
4. **Dead-end / foundation panels** — Executive goals/notes/approvals; BM inventory “—” KPI; Config → Coming Soon Branches card.
5. **Technical frontline copy** — LIVE/DERIVED/FOUNDATION/UNAVAILABLE badges, readiness blocker codes, Staff “Roles (codes)”, Ops `/ops/orders` path labels.
6. **Duplicate CTAs** — Cashier Open POS ×2; Delivery console ×2; Host/Waiter dual floor links; Ops top + bottom links.

### P2

7. **Branch context inconsistency** — AdminShell has branch menu; OpsShell does not; several homes fall back to `branchIds[0]`.
8. **Status panels without next actions** — Kitchen/Delivery panels on Owner/BM.
9. **Misleading module availability** — BM module cards marked available without capability parity.

### P3

10. **Mobile density** — responsive classes exist; runtime overflow UNKNOWN without screenshots.
11. **Ops a11y** — dispatch rider `<select>` unlabeled; weaker loading skeletons on Ops subpages.

---

## 5. Per-dashboard first-screen summary

| Dashboard | Primary job | Primary CTA today | Clicks to primary | Top issues |
| --- | --- | --- | --- | --- |
| Super Admin / Owner | Branch/org health | Open Orders | 1 | Dense KPIs; dual kitchen target; foundation aside |
| Configuration | Close setup gaps | Settings | 1 | Double H1; Branches coming-soon; raw readiness codes |
| Branch Manager | Run today’s branch | Open Orders | 1 | Kitchen→ERP; inventory dead KPI; dense 10 KPIs |
| Cashier | Take payment | Open POS | 1 | POS duplicated in header + grid |
| Host | Seat / reserve | Create reservation | 1 | Duplicate floor CTAs; Avg wait FOUNDATION |
| Waiter | Serve assigned tables | Open POS / Floor | 1 | Duplicate floor CTAs; raw `serviceStatus` |
| Kitchen | Clear ticket queue | On-page KDS | 0–1 | Engineer foundation banner; 7 dense KPIs |
| Delivery | Manage assignments | Open delivery console | 1 | CTA duplicated; KPIs not actionable |
| General Staff | Enter permitted modules | First nav card | 1 | Exposes role codes; no ranked primary task |
| Northern Bypass (BM @ coming-soon) | Complete readiness | Via readiness CTA | 1 | Must stay setup-only; no fake live sales |
| Ops Command Center | Exception overview | Orders / Kitchen / Dispatch | 1 | Path-string links; no branch UI; duplicates Admin |

---

## 6. Measurable UX gates (target)

For every persona after this slice:

- Primary job obvious in first meaningful viewport
- Primary destination ≤ 2 interactions from role home
- No dead-end primary action
- No inaccessible navigation shown as available
- Branch / Assigned Branches context visible where relevant
- Freshness (“Last updated …”) visible
- Honest EMPTY / ERROR / UNAVAILABLE (never failure→0)
- Keyboard reachable; visible focus
- Usable at 390px (no horizontal page overflow)
- Technical jargon removed from user-facing copy where replaceable

Call success: **TASK-BASED UX ACCEPTANCE** — not “100% universally easy.”

---

## 7. Out of scope for this slice

- Production deployment / DB writes / migrations
- New roles or `role_permissions` changes
- Full POS/KDS/Delivery workspace redesign beyond dashboard entry
- Claiming user-research validation without real users
