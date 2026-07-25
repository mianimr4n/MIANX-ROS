# Second Branch Opening Readiness — Northern Bypass

**Status:** Implementation In Progress — checklist tracking document
**Classification:** Operational Readiness Checklist
**Target opening:** 14 August 2026
**Branch record:** `branch_code = northern-bypass` (seeded in `supabase/migrations/20260713191000_seed_foundation_data.sql`, status `coming-soon`)  
**Existing operating branch:** `branch_code = royal-orchard` (Royal Orchard Branch)  
**Launch readiness statuses used:** READY · READY WITH LIMITATIONS · BLOCKED · NOT VERIFIED

This checklist tracks every input required before the second branch can operate.
Nothing here is marked READY merely because source code builds. Items marked
BLOCKED name the exact missing business input or repository capability.

There is no organization/tenant table in the repository (single-tenant Multan model).

## 1. Business configuration

| Item | Status | Evidence / Missing input |
| --- | --- | --- |
| Branch record exists | READY | `branches` row seeded with `branch_code = northern-bypass`, status `coming-soon` |
| Legal / display name | READY | "Northern Bypass Road Branch" in seed migration |
| Address | READY | Seeded (Northern Bypass, Multan) |
| Phone | BLOCKED | Seeded as null — business must supply the branch phone number |
| Timezone | READY WITH LIMITATIONS | System-wide `Asia/Karachi` hard-coded in `backend/api/src/services/orders/management.ts`; no per-branch timezone column (acceptable for a single-region business) |
| Business day | READY WITH LIMITATIONS | Karachi calendar-day logic (`startOfTodayKarachiIso`), shared across branches |
| Operating hours | BLOCKED | `opening_hours` seeded as `{"daily":"Coming Soon"}` — business must supply real hours |
| Branch status flip | BLOCKED | `status` must change `coming-soon` → `operating` (single SQL update; requires founder confirmation of opening date) |
| Pickup / delivery availability | NOT VERIFIED | No per-branch service-mode configuration column exists |
| Delivery zones | BLOCKED | No delivery-zone model in the schema (only free-text `customer_addresses.delivery_zone`); business must define zones and a zone model must be authorized in a future slice |
| Taxes and fees | BLOCKED | No branch tax configuration model (`orders.tax_amount` is per-order only); tax policy for the new branch requires business input and a future schema slice |
| Menu assignment | READY WITH LIMITATIONS | Catalog is shared (single-tenant); `item_modifier_groups.branch_id` / `branch_modifier_options` allow branch overrides. No branch-specific publish step exists |
| Pricing assignment | READY WITH LIMITATIONS | Single shared price list; no per-branch price book |

## 2. People

| Item | Status | Evidence / Missing input |
| --- | --- | --- |
| Branch manager account | BLOCKED | No `user_roles` row with `branch-manager` scoped to the northern-bypass branch id — business must name the manager |
| Staff users (cashier / kitchen / rider) | BLOCKED | Requires named people; provision through staff invites (`staff_invites`, branch required by locked decision) |
| Role model | READY | Seeded roles: `super-admin`, `branch-manager`, `kitchen`, `cashier`, `rider`, `customer-support` |
| Branch memberships | READY | `user_roles.branch_id` model verified; server-side enforcement proven by `backend/api/tests/multibranch-isolation.d2.test.ts` |
| Cashier access (POS home) | READY | D2: cashier-only principals land on `/admin/pos`; shell hides owner modules |
| Kitchen access (KDS home) | READY | Kitchen-only principals land on `/admin/kitchen-dashboard` |
| Delivery access (rider home) | READY | D2: rider-only principals land on `/admin/delivery` |
| Emergency admin access | READY | Super-admin role has global scope (`user_roles.branch_id IS NULL`) |

## 3. Devices

All device items are physical-world checks and cannot be verified from the repository.

| Item | Status |
| --- | --- |
| POS terminals | NOT VERIFIED |
| Receipt printers | NOT VERIFIED (no printer integration exists in the repository) |
| Kitchen screen | NOT VERIFIED (KDS route exists: `/admin/kitchen-dashboard`) |
| Kitchen printers | NOT VERIFIED (no integration) |
| Internet connection | NOT VERIFIED |
| Backup connectivity | NOT VERIFIED |
| Payment device | NOT VERIFIED (cash-focused; no card terminal integration in repository) |
| Rider devices | NOT VERIFIED |

## 4. Operational validation (dry run)

Must be executed live at the branch before opening. Production northern-bypass items remain NOT VERIFIED / BLOCKED until founder dry-run.

| Step | Status |
| --- | --- |
| Test order placed (website/WhatsApp) targeting northern-bypass | NOT VERIFIED (production) |
| POS order created at the branch | READY WITH LIMITATIONS — local isolated fixture PASS (`scripts/d2/runtime-journeys.mjs` Journey B); production northern remains `coming-soon` |
| Kitchen ticket appears on the branch KDS | READY WITH LIMITATIONS — local fixture PASS; not a production dry run |
| Ready handoff (kitchen → counter/dispatch) | READY WITH LIMITATIONS — local fixture PASS |
| Delivery assignment to a branch rider | READY WITH LIMITATIONS — local Royal Orchard Journey C PASS; northern production staff still BLOCKED |
| Delivery completion recorded | READY WITH LIMITATIONS — local Journey C PASS |
| Cancellation flow with reason code | NOT VERIFIED |
| Refund behavior | NOT VERIFIED (no refund engine in repository — cash handling is manual) |
| Branch dashboard reflects the test order | READY WITH LIMITATIONS — local Journeys A/B/C PASS |
| Owner dashboard cross-branch view reflects the test order | READY WITH LIMITATIONS — local multi-branch manager PASS in fixture mode |

**Important:** Local fixture activation of northern-bypass does **not** mark production northern-bypass READY.

## 5. Launch readiness summary

Current overall status: **BLOCKED** (production northern-bypass)

Local D2 corrective pass (atomic orders + isolated fixture journeys): recorded in
`docs/architecture/d2/D2_CONTINUATION_EVIDENCE.md` as **READY FOR FOUNDER AND ARCHITECT REVIEW**.
That local PASS does **not** authorize production status flip or deployment.

Opening-day blockers (exact business inputs required):

1. Branch phone number.
2. Real operating hours.
3. Named branch manager and staff, provisioned with branch-scoped roles.
4. Decision on delivery zones (no zone model exists — interim: free-text zones).
5. Tax/fee policy confirmation (no tax configuration model exists).
6. Branch status flip `coming-soon` → `operating` on the confirmed date.
7. Live operational dry run (section 4) at the branch.

Repository capabilities verified for opening (not blockers):

- Branch-scoped orders, kitchen tickets, deliveries, dashboard KPIs — enforced
  server-side and covered by negative tests.
- Cross-branch owner visibility (branch performance comparison) for super-admin
  and verified multi-branch managers.
- Honest LOADING / LIVE / EMPTY / ERROR / STALE / OFFLINE states on all
  opening-critical surfaces.
- Authenticated POS create (`POST /api/v1/admin/pos/orders`) with membership +
  operating-status enforcement; public `orderSource=pos` rejected.
- Branch readiness report API: `GET /api/v1/admin/branches/:branchId/readiness`
  (lists blockers without inventing staff).
- Live ops on `coming-soon` / `inactive` branches are rejected with
  `BRANCH_NOT_OPERATIONAL` / `BRANCH_INACTIVE`.
- True PostgreSQL atomic order create RPC `create_order_atomic` (migration
  `20260725050000_d2_atomic_order_create.sql`) with live rollback evidence.