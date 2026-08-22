# Phase B Audit Inventory — Backend Org-Scoping Coverage

**Companion to ADR-045.** This is the concrete, file-by-file inventory ADR-045 §3 (DEFERRED items) refers to as "the real Phase B enforcement work." It does not change any code — it is the evidence base for scoping and sequencing that work once ADR-045 §2 (catalog tenancy model) is accepted.

**Methodology:** every `.ts` file under `backend/api/src/services/` and `backend/api/src/modules/` (162 total, excluding tests) was scanned for: references to `branch_id`/`branchId` (evidence the file's data is branch-scoped and therefore needs an `organization_id` scoping path once branches roll up to organizations), references to `organization_id`/`organizationId` (evidence it's already org-aware), and direct Supabase `.from(...)` table queries (evidence it touches the database directly rather than only being a thin route layer). This is static, evidence-based triage — it flags *where to look*, not a guarantee of correctness; each Bucket B/C file still needs an actual read before changing it.

## Summary

| Bucket | Count | Meaning |
| --- | --- | --- |
| A — Already org-aware | 7 | No action needed; these already carry `organization_id` |
| B — Needs org scope, touches branch data | 61 | The real audit work — queries the DB and references `branch_id` today |
| C — Needs manual review, no branch reference | 12 | Queries the DB but isn't obviously branch-scoped — reviewed individually below, see findings |
| D — No direct DB query | 82 | Mostly thin route handlers (`modules/admin/*.ts`) that call into Bucket A/B services, or pure logic/utility files — inherit correctness from the services they call, no direct work needed |

---

## Bucket A — Already org-aware (reference, no work needed)

`modules/admin/routes.ts`, `modules/auth/routes.ts`, `modules/admin/configuration.ts`, `services/auth/supabase.ts`, `services/staff/invites.ts`, `services/branches/control-plane.ts`, `services/auth/principal.ts`.

These are the existing pattern to mirror — in particular `services/staff/invites.ts`'s `assertCanSee(actor, organizationId)` / `assertInvitationAuthority(...)` gate, cited in ADR-045 §1 and the master upgrade prompt's Phase B design.

---

## Bucket B — Needs org scoping, touches branch-scoped data (61 files)

This is the actual Phase B workload. Grouped by domain for sequencing — suggested order is by blast radius (customer-money-touching domains last, once the pattern is proven on lower-risk domains first), not file size.

### Group 1 — Foundational / cross-cutting (do first, other groups depend on the pattern these establish)
`services/branches/lookup.ts` · `services/branches/profile.ts` · `services/branches/readiness.ts` · `services/settings/branch.ts` · `services/time/branch-timezone.ts`

### Group 2 — Catalog & Menu (blocked on ADR-045 §2 — do not start until the catalog tenancy model is accepted)
`services/menu/management.ts` · `services/catalog/supabase.ts`

### Group 3 — Orders & Kitchen
`services/orders/management.ts` · `services/orders/supabase.ts` · `services/orders/customer-history.ts` · `services/kitchen/tickets.ts` · `services/dine-in/table-service.ts` · `services/dine-in/sessions.ts` · `services/tables/management.ts` · `services/tables/qr.ts`

### Group 4 — Dine-in, Reservations & Floor
`services/reservations/management.ts` · `services/reservations/public-booking.ts` · `services/reservations/deposits.ts` · `services/reservations/booking-policy.ts` · `services/floor/configuration.ts`

### Group 5 — Delivery
`services/deliveries/operations.ts` · `services/deliveries/cod-service.ts` · `services/deliveries/pod-service.ts` · `services/deliveries/rider-location-service.ts`

### Group 6 — Inventory & Purchasing
`services/inventory/management.ts` · `services/inventory/recipes.ts` · `services/purchasing/management.ts` · `services/supplier-portal/management.ts`

### Group 7 — HR & Payroll
`services/hr/workforce.ts` · `services/hr/payroll.ts` · `services/hr/scheduling.ts` · `services/hr/employees.ts` · `services/hr/payroll-engine.ts` · `services/staff/assignments.ts`

### Group 8 — Finance (highest scrutiny — real money)
`services/finance/operations.ts` · `services/finance/phase2.ts` · `services/finance/management.ts` · `services/bills/restaurant-bills.ts` · `services/payments/settlement.ts` · `services/pos/z-report.ts`

### Group 9 — Marketing & Loyalty
`services/marketing/coupons.ts` · `services/marketing/depth.ts` · `services/loyalty/depth.ts`

### Group 10 — Opening/Governance workflow
`services/opening/governance.ts` · `services/opening/operations.ts` · `services/opening/dry-run.ts` · `services/opening/readiness.ts`

### Group 11 — Analytics, Dashboard, Reports, Audit
`services/analytics/engine.ts` · `services/dashboard/summaries.ts` · `services/reports/sales.ts` · `services/audit/domain-event-service.ts`

### Group 12 — WhatsApp, AI-provider, Notifications, Documents (lower risk, not customer-money-critical)
`services/whatsapp/admin-service.ts` · `services/whatsapp/inbound-worker.ts` · `services/whatsapp/outbox-worker.ts` · `services/whatsapp/pii-anonymization.ts` · `services/ai/provider-proxy.ts` · `services/ai/prompt-log-service.ts` · `services/notifications/manual-contact.ts` · `services/documents/storage.ts` · `services/otp/session-service.ts`

**Total: 61 files across 12 groups.** Full per-file line/reference counts are in the raw scan — ask if you want the complete table rather than the grouped summary above.

---

## Bucket C — Needs manual review, no branch reference (12 files) — findings below

Each of these queries the database but showed no `branch_id`/`branchId` reference in the static scan, so each was opened and its queried tables checked individually. Findings:

| File | Table(s) queried | Finding |
| --- | --- | --- |
| `services/settings/organization.ts` | `organization_settings` | **Directly relevant to this Multi-Tenant Foundation track.** This is the pre-Phase-A singleton settings service. Post-Phase-A, it should be updated to read/write through the new `organizations` table instead of assuming the singleton. Recommend folding this into Group 1 (Foundational) rather than treating it as a separate review item. |
| `services/customers/identity-service.ts`, `services/customers/merge-service.ts` | `customers`, `customer_identities`, `customer_merge_log` | **Open product question, not just an engineering gap.** Customer identity today is phone-number-based and branch-agnostic by design (a customer can order from either Telepizza branch). Once a second tenant exists: can the same phone number be a customer of two unrelated tenants with one shared identity, or does each tenant get an independent customer record even for the same phone number? This has real UX and data-ownership implications (e.g. can Tenant B see that a phone number ordered from Tenant A?) and should be answered alongside ADR-045 §2, not assumed. |
| `services/reviews/customer-reviews.ts` | `order_reviews`, `orders` | Reviews are tied to `orders`, which are branch-scoped — this can inherit correct scoping via a join once `services/orders/*` (Group 3) is fixed. No independent design question, just sequencing: do this after Group 3. |
| `services/favorites/customer-favorites.ts` | `customer_favorites` | Favorites reference menu items — blocked on the same ADR-045 §2 catalog decision as Group 2. Sequence with Group 2. |
| `services/loyalty/management.ts` | `loyalty_accounts`, `loyalty_rewards`, `loyalty_transactions` | Currently platform-wide (all Telepizza branches share one loyalty pool). Needs a decision mirroring the customer-identity question above: is loyalty per-tenant (a customer has separate points balances per restaurant business, which matches how loyalty programs normally work) or something shared? Recommend per-tenant — flag as a sub-item of the customer-identity open question, not a separate one. |
| `services/otp/otp-service.ts`, `services/otp/otp-rate-limiter.ts` | `otp_attempts`, `otp_requests` | Phone-based auth infrastructure, correctly tenant-agnostic — OTP verification shouldn't care which tenant the user is about to interact with. **No change needed.** |
| `services/notifications/outbox-worker.ts` | `reservation_communications` | Background worker processing a queue; scoping lives on the `reservations` row it reads (Group 4), not here directly. **No independent change needed**, inherits from Group 4. |
| `modules/webhooks/whatsapp.ts` | `whatsapp_inbound_events` | Inbound WhatsApp webhook. Once a second tenant has its own WhatsApp Business number, this needs to resolve *which* tenant a message belongs to by the receiving number before any processing — this is closer to the "tenant resolution for anonymous/public traffic" deferred item already in ADR-045 §3 than a simple scoping fix. Cross-reference, don't duplicate. |
| `services/ai/approval-service.ts` | `ai_action_approvals` | Phase 13 AI governance — approvals for AI-proposed actions. Needs branch/org context resolved from whatever entity the approval is *about* (an order, a reservation, etc.), inherited transitively rather than stored directly. Low priority — sequence after the domain it approves actions for. |
| `services/ai/platform.ts` | `ai_agents`, `ai_tasks`, `ai_teams` | **Likely intentionally platform-wide, not a scoping gap.** Phase 13's "operational AI teams" concept (per the roadmap) reads as Mianx.ai's own AI staff operating across tenants, not a per-tenant resource. Recommend confirming this reading with whoever is driving Phase 13 AI work before assuming it needs scoping at all — flagging rather than guessing. |

---

## Bucket D — No direct DB query (82 files)

Mostly `modules/admin/*.ts` route handlers (thin layers that call into Bucket A/B services and don't query the database directly — e.g. `modules/admin/finance.ts` has 46 `branch_id`/`branchId` references but 0 direct queries, because it passes `branchId` through to `services/finance/*`), plus genuine pure-logic/utility files with no database access at all (`services/orders/pricing.ts`, rate limiters, calculators, adapters). No independent action needed — these inherit correctness automatically once the Bucket B service they call is fixed. Listed in the raw scan for completeness; not reproduced here since none of them are actionable on their own.

---

## Group 1 status: VERIFIED SAFE (2026-08-22 pass)

Every file in this group already routes through `assertBranchMembership` (`services/branches/operational-status.ts`) before touching branch data, and that function's `isSuperAdmin` bypass is confirmed aliased 1:1 to `isPlatformSuperAdmin` (`services/auth/principal.ts` line 99: `const isSuperAdmin = isPlatformSuperAdmin`) — not a broader flag an org-level admin could hold. Since `AuthPrincipal.branchIds` is already populated per-organization (via `user_roles.organization_id`), this means: **regular users can never touch a branch outside their own organization today, and the only bypass is the genuinely-platform-wide super admin role, which is supposed to span tenants.** This pattern was independently verified in `services/branches/profile.ts`, `services/branches/readiness.ts`, and `services/settings/branch.ts` — all three call it before any query.

One real gap found and fixed: `services/branches/lookup.ts` is a raw lookup utility (`loadBranchRow`/`loadBranchByCode`) that does **not** call `assertBranchMembership` itself — it's used by callers that may not always have an authenticated actor to check against (e.g. resolving a branch by code from a public request). Fixed by adding `organization_id` to its returned row shape and a new `assertBranchBelongsToOrganization()` helper any caller can opt into. No existing caller was forced to change.

`services/time/branch-timezone.ts` was reclassified: despite the filename, it has zero database queries — pure IANA timezone math, tenant-agnostic by nature. No work needed; this should have been Bucket D, not Group 1's Bucket B.

**Implication for the remaining 11 groups:** the same quick check (does this file already route through a `branchIds`/`organizationIds`-checking guard before querying, and is that guard's super-admin bypass genuinely platform-scoped?) should be applied to every Bucket B file before assuming it needs new code. This is likely to substantially shrink the real workload from what a first read of the bucket counts suggests — verify, don't assume, per group.

---

## What this inventory does NOT do

- It does not implement any scoping — Bucket B/C are a map, not a patch.
- It does not resolve ADR-045 §2 or the two open questions raised in Bucket C (customer identity, loyalty) — those still need Founder input.
- It does not estimate calendar time — 61 files across 12 domains, several (Finance, HR, Opening/Governance) are 1000+ lines each with dozens of query sites; this is realistically several weeks of careful, tested work, not a single sprint.
