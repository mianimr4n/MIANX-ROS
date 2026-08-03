# Phase 1.1 — Admin shell audit

**Primary source:** `apps/website/client/src/pages/admin/AdminShell.tsx`  
**Nav:** `lib/admin-access.ts` `NAV_BLUEPRINT` (~24 items, 7 groups)

## Explicit investigations

| # | Topic | Finding | Severity | Decision |
| --- | --- | --- | --- | --- |
| 1 | Global search “Search unavailable” | Disabled dashed control in topbar (`AdminShell.tsx` ~313–318); title promises later release | P2 | **Replace with truthful non-control** or scoped module search — do not leave prominent dead search |
| 2 | Long sidebar | 24+ entries across Overview→System; discoverability cost for BM/kitchen (ownerOnly filter helps) | P2 | POLISH-01: collapse groups, role-focused defaults |
| 3 | Duplicate branch selectors | Shell header + page filters (Orders, Delivery, Kitchen, CRM, Loyalty, WhatsApp, ExecutiveFilterBar) | P2 | Prefer single shell selector; page filters optional “refine” only |
| 4 | Top vs page branch context | Same `AdminBranchContext`; sync works but UX implies two scopes | P1 | Unify labeling (“Active branch” vs “Filter”) |
| 5 | Page titles / headings | Shell derives titles; pages also render H1 — generally ok; inconsistent eyebrow patterns | P2 | Design system |
| 6 | Active sidebar | Prefix match for branch/kitchen; verify aliases `/admin/crm` vs `/admin/customers` | P2 | Alias active-state tests |
| 7 | Role-hidden nav | `ownerOnly` + permission filters; denied → `/admin/unauthorized` | OK | Keep; add matrix evidence |
| 8 | Back/refresh/deep-link | Command Center modes use query; logout regression fixed in QA-04 | OK | Retain e2e |
| 9 | Mobile sidebar | Responsive shell present; long nav still dense | P2 | POLISH-06 |
| 10 | Logout / protected routes | QA-04 fix + Owner smoke PASS on release | OK | Guardrail tests remain |

## Other shell defects

| ID | Severity | Issue |
| --- | --- | --- |
| P11-SHELL-01 | P2 | Notifications bell disabled (“unavailable”) — same pattern as search |
| P11-SHELL-02 | P3 | Truncated branch label `max-w-[10rem]` may hide branch name on tablet |

## Assessment

Shell is **functional and authorized**, not yet **professionally polished**. Highest UX debt: dead global search + duplicate branch controls + long nav.
