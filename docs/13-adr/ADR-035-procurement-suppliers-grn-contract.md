# ADR-035: Procurement, Suppliers & GRN Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.5.0` (closes Phase 10 — Inventory and Procurement, ADR-035 of 3)

---

## Context

Telepizza's procurement surface covers the full supplier → PO → GRN →
invoice → payment lifecycle. The data model was shipped across five
RC3/RC4 migrations:

1. `20260730170000_purchasing_backend.sql` — creates `suppliers` +
   `purchase_orders` + seeds `purchasing.manage` permission.
2. `20260730180000_fix_purchasing_missing_tables.sql` — idempotent
   re-creation of suppliers + POs (fixes a prior missed migration) +
   adds `purchase_requisitions` + `goods_receiving`.
3. `20260730220000_atomic_inventory_and_grn_stock.sql` — adds
   `goods_receiving_lines` + the
   `create_goods_receiving_with_stock_atomic` SECURITY DEFINER RPC +
   the `adjust_inventory_stock_atomic` RPC (covered in ADR-033 §4).
4. `20260730270000_supplier_invoices_payments.sql` — adds
   `supplier_invoices` + `supplier_payments` + the
   `record_supplier_payment_atomic` SECURITY DEFINER RPC.
5. `20260731120000_supplier_portal_foundation.sql` — adds the
   supplier-facing portal surface: `supplier_portal_users` +
   `purchase_order_lines` + `purchase_order_responses` +
   `purchase_order_delivery_refs` + `supplier_documents` +
   `supplier_portal_events`. Adds the `supplier` role + `supplier.portal`
   permission.
6. `20260731130000_supplier_portal_hardening.sql` — tightens
   `purchase_order_responses.response_type` CHECK, adds
   `supplier_response_staff_decisions` table for staff-side decisions on
   supplier responses, adds idempotency UNIQUE index on
   `purchase_order_responses.idempotency_key`, and tightens
   `supplier_documents.document_type` CHECK.

The backend service layer
(`backend/api/src/services/purchasing/management.ts`, 1087 lines) +
`backend/api/src/services/supplier-portal/management.ts` (1507 lines)
expose the procurement + supplier-portal surface. Admin router
(`backend/api/src/modules/admin/purchasing.ts`, 687 lines, 21 routes)
handles branch-side procurement; supplier-portal router
(`backend/api/src/modules/supplier-portal/routes.ts`, 421 lines, 20
routes) handles supplier-side interactions. Frontend spans
`AdminPurchasing.tsx` (517 lines) + `AdminSupplierOperations.tsx`
(114 lines) + 6 supporting components + the full supplier portal
(`apps/website/client/src/pages/supplier/`, 7 files, 745 lines).

391 backend tests in `purchasing.test.ts` + 168 tests in
`grn-stock-posting-atomic.test.ts` + 100 tests in
`rc3-supplier-portal.test.ts` cover the procurement surface.

However, the procurement + supplier portal data model was never elevated
to a formal ADR. The deferral of 3-way match automation, multi-branch
PO consolidation, supplier SSO, supplier-side invoice submission, and
procurement-to-GL automation is documented piecemeal in
`ProcurementStatusBanner.tsx` (lines 22-35) and `SupplierShell.tsx`
honest-gap blocks. This ADR consolidates those deferrals into a single
accepted decision with explicit trigger conditions.

This ADR formally accepts the as-built procurement + supplier portal
model as the canonical Phase 10 contract.

---

## Decision

### 1. Supplier master (`suppliers`)

`suppliers` (migration `20260730170000` lines 24-43, extended by
`20260731120000` lines 32-46) is the branch-scoped supplier directory.
Each supplier belongs to exactly one branch (same pattern as
`inventory_items` in ADR-033 §1).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `name` | varchar(200) NOT NULL | Supplier name |
| `contact_person` | varchar(150) | Account manager / sales rep |
| `phone` | varchar(40) | Phone |
| `email` | varchar(150) | Email |
| `address` | text | Address |
| `status` | text NOT NULL DEFAULT `'active'` CHECK ∈ {`active`, `inactive`} | Lifecycle status |
| `tax_id` | varchar(80) | Tax ID (e.g., NTN in Pakistan) — added by supplier portal migration |
| `business_registration` | varchar(120) | Business registration number |
| `payment_terms` | varchar(120) | Payment terms (e.g., "Net 30", "COD") |
| `supplied_categories` | text[] NOT NULL DEFAULT `'{}'` | Categories supplied (e.g., `{'Dough', 'Cheese'}`) |
| `approval_status` | text NOT NULL DEFAULT `'approved'` CHECK ∈ {`pending`, `approved`, `suspended`} | Internal approval (distinct from `status`) |
| `notes` | text | Free-text notes |
| `created_at` / `updated_at` | timestamptz | Timestamps |

Three indexes on `branch_id`, `status`, `name`. RLS enabled with
`current_user_has_branch_access(branch_id)` for SELECT, service_role
for write.

**Why branch-scoped?** Same rationale as `inventory_items` (ADR-033 §1):
each branch manages its own supplier relationships. Multi-branch
supplier consolidation is DEFERRED (§9).

**Why two status fields?** `status` is the supplier's lifecycle
(active/inactive — controls whether new POs can be created). 
`approval_status` is the internal approval gate
(pending/approved/suspended — controls whether the supplier can access
the portal). A supplier can be `status='active'` (operational) but
`approval_status='suspended'` (portal access revoked pending review).

### 2. Purchase orders + state machine

`purchase_orders` (lines 49-78) is the procurement contract. The
`status` column has an 8-value CHECK constraint forming a state machine:

```text
draft → submitted → approved → ordered → partially_received → received
                                                                       ↘
                                  rejected ← submitted/approved ←──────╯
                                  cancelled ←─ any non-terminal state ←─┘
```

| State | Meaning | Who can transition |
|---|---|---|
| `draft` | Initial state, BM editing | BM/SA |
| `submitted` | Sent for approval | BM/SA |
| `approved` | Approved by SA | SA |
| `rejected` | Approval denied | SA |
| `ordered` | Sent to supplier | BM/SA |
| `partially_received` | Some GRN lines posted | System (on first GRN post) |
| `received` | All GRN lines posted | System (on final GRN post) |
| `cancelled` | Cancelled | BM/SA |

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `supplier_id` | uuid FK → `suppliers(id)` ON DELETE RESTRICT | Supplier (RESTRICT prevents deleting a supplier with POs) |
| `po_number` | varchar(40) NOT NULL | PO number (UNIQUE per branch) |
| `status` | text NOT NULL DEFAULT `'draft'` | Lifecycle status (see state machine above) |
| `total_amount` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Total amount |
| `expected_delivery_date` | date | Expected delivery date |
| `created_by` | uuid FK → `users(id)` ON DELETE SET NULL | Author |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, po_number)`. Four performance indexes.

**Approval gate:** The `POST /api/v1/admin/purchasing/orders/:id/approve`
endpoint (with body `{decision: 'approved' | 'rejected', notes}`) is
the explicit approval gate. This mirrors the ADR-014 (AI Approval Gate)
pattern: a high-value decision (PO > 50,000 PKR by default) requires
explicit super-admin approval before the PO can transition from
`submitted` to `approved`. The threshold is configurable via
`configuration` table (ADR-002).

**Why no DB-level state-machine trigger?** Unlike the delivery state
machine (ADR-007) which has a `BEFORE UPDATE` trigger enforcing valid
transitions, the PO state machine is enforced at the API layer
(`purchasing/management.ts` lines 400-500). This is acceptable because
PO transitions are less frequent than delivery transitions (10s/day
vs 100s/day) and the API layer provides sufficient invariant
enforcement. A DB-level trigger is DEFERRED (§9).

### 3. Purchase requisitions

`purchase_requisitions` (migration `20260730180000` lines 102-130) is
the internal request-for-purchase surface. A branch staff member
creates a requisition, a BM/SA approves it, and the system converts
it to one or more POs.

| State | Meaning |
|---|---|
| `draft` | Initial state |
| `submitted` | Sent for approval |
| `approved` | Approved — ready for conversion to PO |
| `rejected` | Approval denied |
| `converted` | Converted to one or more POs (terminal) |
| `cancelled` | Cancelled |

6-state machine, also API-enforced. Requisitions are optional — a BM
can create a PO directly without a requisition.

### 4. Goods Receiving Notes (GRN)

`goods_receiving` (lines 145-180) records the physical receipt of
goods. Each GRN can optionally reference a PO and contain multiple
GRN lines.

| State | Meaning |
|---|---|
| `draft` | Initial state, BM entering lines |
| `posted` | Finalized — stock posted to `inventory_items` via atomic RPC |
| `cancelled` | Cancelled (only allowed in `draft`) |

3-state machine. The `posted` transition is irreversible — once stock
is posted, the GRN cannot be edited. To correct a posted GRN, create a
new GRN with negative lines (effectively a return) — DEFERRED (§9).

`goods_receiving_lines` (migration `20260730220000` lines 17-32) stores
the per-line received quantities. Each line can optionally map to an
`inventory_item` — when it does, the atomic RPC posts stock on GRN
post.

### 5. Atomic GRN stock posting (`create_goods_receiving_with_stock_atomic`)

The `create_goods_receiving_with_stock_atomic` RPC (lines 110-250 of
`20260730220000`) is a SECURITY DEFINER function that performs the
following in a single transaction:

1. INSERT the `goods_receiving` row with `status='posted'`.
2. INSERT each `goods_receiving_lines` row.
3. For each line with an `inventory_item_id`, call
   `adjust_inventory_stock_atomic` with `movement_type='purchase'` and
   the received quantity (positive delta).
4. UPDATE the parent `purchase_order.status` to `partially_received` or
   `received` based on whether all expected lines have been received.
5. Return the GRN + updated PO + posted stock movements as a JSON
   payload.

On any line failure (e.g., insufficient stock for a return, item not
found), the entire transaction rolls back — no partial posting.

### 6. Supplier invoices + payments (3-way match foundation)

`supplier_invoices` (migration `20260730270000` lines 20-80) records
invoices received from suppliers for delivered goods. Each invoice
references a PO and contains line items that should match the PO lines
+ GRN lines.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `supplier_id` | uuid FK → `suppliers(id)` | Supplier |
| `purchase_order_id` | uuid FK → `purchase_orders(id)` | Source PO |
| `invoice_number` | varchar(120) NOT NULL | Supplier's invoice number |
| `invoice_date` | date NOT NULL | Invoice date |
| `subtotal` | numeric(14,2) NOT NULL CHECK ≥ 0 | Pre-tax subtotal |
| `tax_amount` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Tax amount |
| `total_amount` | numeric(14,2) NOT NULL CHECK ≥ 0 | Total (subtotal + tax) |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `pending_approval`, `approved`, `paid`, `disputed`, `cancelled`} | Lifecycle status |
| `matched_grn_id` | uuid FK → `goods_receiving(id)` NULLABLE | Matched GRN (for 3-way match) |
| `match_status` | text NOT NULL DEFAULT `'unmatched'` CHECK ∈ {`unmatched`, `matched`, `variance`, `exception_approved`} | 3-way match state |
| `variance_amount` | numeric(14,2) NOT NULL DEFAULT 0 | Variance vs PO+GRN (positive = over-billing) |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` / `updated_at` | timestamptz | Timestamps |

`supplier_payments` (lines 90-130) records payments made against
invoices. Each payment references an invoice and contains the payment
method + amount + reference.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `supplier_invoice_id` | uuid FK → `supplier_invoices(id)` ON DELETE RESTRICT | Source invoice (RESTRICT prevents deleting an invoice with payments) |
| `supplier_id` | uuid FK → `suppliers(id)` | Denormalized for query efficiency |
| `payment_date` | date NOT NULL | Payment date |
| `amount` | numeric(14,2) NOT NULL CHECK > 0 | Payment amount |
| `payment_method` | text NOT NULL DEFAULT `'bank_transfer'` CHECK ∈ {`cash`, `bank_transfer`, `cheque`, `other`} | Payment method |
| `reference_number` | varchar(120) | Payment reference (e.g., bank transaction ID) |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` | timestamptz | Creation timestamp |

### 7. Atomic payment recording (`record_supplier_payment_atomic`)

The `record_supplier_payment_atomic` RPC (lines 150-280) records a
payment + updates the invoice status to `paid` (if fully paid) +
posts to the GL via the ADR-011 `create_journal_entry_atomic` RPC.
Idempotent via the `payment_reference + supplier_invoice_id` UNIQUE
constraint.

**3-way match (PO + GRN + Invoice):** The `match_status` column on
`supplier_invoices` is the foundation for 3-way match. Currently, the
match is manual — a BM sets `matched_grn_id` and `match_status` by
hand. Automated 3-way match (system computes `variance_amount` and
sets `match_status='variance'` when variance > threshold) is
DEFERRED (§9).

### 8. Supplier portal surface

The supplier portal (`/api/v1/supplier-portal/*`, mounted at
`backend/api/src/modules/index.ts` line 47) is a separate API surface
for supplier-side interactions. It uses the `supplier` role + the
`supplier.portal` permission (seeded in
`20260731120000_supplier_portal_foundation.sql` lines 14-46).

**Supplier identity:** `supplier_portal_users` (lines 56-72) maps an
authenticated `users` row to exactly one supplier via the UNIQUE
`(user_id)` constraint. A supplier user can log in via the standard
`/auth/login` endpoint and the JWT's `user_type='supplier'` claim
routes them to the supplier portal. The `current_user_supplier_ids()`
SQL function (lines 84-110) returns the supplier IDs the current user
can access — used by RLS policies to scope PO/document reads.

**Supplier-side routes** (20 routes in `modules/supplier-portal/routes.ts`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/supplier-portal/me` | Supplier profile |
| `GET` | `/api/v1/supplier-portal/dashboard` | KPI dashboard |
| `GET` | `/api/v1/supplier-portal/orders` | List POs assigned to this supplier |
| `GET` | `/api/v1/supplier-portal/orders/:id` | PO detail |
| `POST` | `/api/v1/supplier-portal/orders/:id/acknowledge` | Acknowledge PO |
| `POST` | `/api/v1/supplier-portal/orders/:id/accept` | Accept PO |
| `POST` | `/api/v1/supplier-portal/orders/:id/reject` | Reject PO |
| `POST` | `/api/v1/supplier-portal/orders/:id/request-amendment` | Request amendment |
| `POST` | `/api/v1/supplier-portal/orders/:id/propose-delivery-date` | Propose delivery date |
| `POST` | `/api/v1/supplier-portal/orders/:id/confirm-delivery-date` | Confirm delivery date |
| `POST` | `/api/v1/supplier-portal/orders/:id/respond` | Generic response (with `response_type`) |
| `POST` | `/api/v1/supplier-portal/orders/:id/delivery-ref` | Submit delivery reference (e.g., dispatch note, invoice ref) |
| `GET` | `/api/v1/supplier-portal/documents` | List documents |
| `POST` | `/api/v1/supplier-portal/documents` | Create document (URL) |
| `POST` | `/api/v1/supplier-portal/documents/upload` | Upload document (base64) |
| `POST` | `/api/v1/supplier-portal/documents/:id/download-url` | Get download URL |
| `POST` | `/api/v1/supplier-portal/documents/:id/archive` | Archive document |
| `GET` | `/api/v1/supplier-portal/performance` | Supplier performance KPIs |
| `GET` | `/api/v1/supplier-portal/profile` | Profile (editable) |
| `POST` | `/api/v1/supplier-portal/orders/:id/approve` | (DEFERRED — stub returns 501) |

**Response types** (CHECK constraint after hardening migration):

```text
acknowledge | accept | reject | request_amendment |
propose_delivery_date | confirm_delivery_date | delivery_ref
```

`purchase_order_responses` is idempotent via the
`UNIQUE(idempotency_key)` constraint added in the hardening migration.
`supplier_response_staff_decisions` records staff-side decisions on
supplier responses (e.g., accept/reject a proposed delivery date).

**Supplier documents:** `supplier_documents` (lines 200-240) stores
document metadata. Two creation paths: (a) URL-based (supplier
provides a URL to an externally-hosted document), (b) upload-based
(supplier uploads a base64-encoded document, stored in Supabase
Storage). Document types are constrained to a CHECK enum
(e.g., `invoice`, `delivery_note`, `quality_certificate`).

**Portal events:** `supplier_portal_events` (lines 250-280) is the
append-only audit trail for every supplier-side action. Same pattern
as `delivery_state_transitions` (ADR-007) and `pos_z_report_events`
(ADR-025).

### 9. Deferred items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| Automated 3-way match (system computes variance_amount and sets match_status='variance' when variance > threshold) | Owner request for automated invoice auditing OR >3 incidents of invoice over-billing per quarter |
| DB-level PO state-machine trigger (enforce valid transitions at DB layer) | First incident of invalid transition caused by direct DB write |
| Negative-quantity GRN lines (returns to supplier) | First incident of supplier return requiring stock reversal |
| Multi-branch PO consolidation (HQ issues PO spanning multiple branches) | Franchise expansion OR >5 branches (currently 2) |
| Supplier SSO (SAML / OIDC integration for enterprise suppliers) | First enterprise supplier with SSO requirement |
| Supplier-side invoice submission (suppliers upload invoices directly) | >10 active suppliers OR owner request to offload invoice entry |
| Procurement-to-GL automation (auto-post PO + GRN + invoice to GL) | Phase 11 (Finance and Reporting) — when BMs request procurement P&L dashboards |
| Supplier performance scoring (on-time delivery rate, quality rejection rate) | Phase 11 — when procurement KPIs are requested |
| Approval workflow for high-value POs (multi-level approval chain) | First PO > 500,000 PKR |
| RFQ (Request for Quotation) flow | Owner request for competitive bidding on high-value procurements |
| Supplier-side PO acknowledgment SLA enforcement (auto-flag if no ack within 24h) | >2 incidents of unacknowledged urgent POs |
| Contract management (supplier contracts with pricing tiers + expiry) | First supplier with negotiated annual pricing |
| Inventory reservation (reserve stock for upcoming PO delivery) | First incident of stock-out during PO delivery delay |

---

## Consequences

**Positive:**

- Full procurement lifecycle (PO → GRN → invoice → payment) is
  production-verified with 659 backend tests.
- Atomic GRN stock posting guarantees no partial writes — stock and
  GRN are always consistent.
- Supplier portal provides a self-service surface for suppliers,
  reducing BM workload for PO acknowledgment + document exchange.
- Idempotent supplier responses prevent duplicate actions on network
  retries.
- 3-way match foundation (`match_status` + `variance_amount`) is in
  place — automated matching is additive when triggered.
- RLS ensures suppliers see only their own POs; staff see only their
  branch's procurement data.

**Negative:**

- 3-way match is manual today — a BM must visually compare PO + GRN +
  invoice. This is error-prone for high-volume branches.
- No DB-level state-machine trigger on `purchase_orders.status` —
  invalid transitions are blocked at the API layer only.
- No negative-quantity GRN lines — supplier returns require a manual
  `adjustment` movement with negative delta, which doesn't link to
  the original GRN.
- Supplier-side invoice submission is not wired — invoices are
  entered by branch staff, not suppliers.

**Neutral:**

- The procurement surface is branch-scoped, like inventory. A future
  multi-branch consolidation layer would sit above the current schema
  and require a `consolidated_po_id` FK on `purchase_orders`.

---

## Related

- [ADR-002](./ADR-002-settings-versioning-rollback.md) — Settings Versioning (PO approval threshold config)
- [ADR-007](./ADR-007-delivery-state-machine.md) — Delivery State Machine (state-machine + append-only audit pattern)
- [ADR-011](./ADR-011-accounting-immutability.md) — Accounting Immutability (record_supplier_payment_atomic GL posting)
- [ADR-019](./ADR-019-rbac-authorization-principal.md) — RBAC (purchasing.manage + supplier.portal permissions)
- [ADR-033](./ADR-033-inventory-stock-master-movement-ledger-contract.md) — Inventory Stock Master (GRN stock posting target)
- [ADR-034](./ADR-034-recipe-bom-cogs-costing-contract.md) — Recipe/BOM & COGS (Phase 10 sibling)
- `supabase/migrations/20260730170000_purchasing_backend.sql` — suppliers + POs
- `supabase/migrations/20260730180000_fix_purchasing_missing_tables.sql` — requisitions + GRN
- `supabase/migrations/20260730220000_atomic_inventory_and_grn_stock.sql` — atomic GRN RPC
- `supabase/migrations/20260730270000_supplier_invoices_payments.sql` — invoices + payments
- `supabase/migrations/20260731120000_supplier_portal_foundation.sql` — supplier portal
- `supabase/migrations/20260731130000_supplier_portal_hardening.sql` — portal hardening
- `backend/api/src/services/purchasing/management.ts` — service layer
- `backend/api/src/services/supplier-portal/management.ts` — portal service
- `backend/api/src/modules/admin/purchasing.ts` — admin routes
- `backend/api/src/modules/supplier-portal/routes.ts` — portal routes
- `apps/website/client/src/pages/admin/AdminPurchasing.tsx` — admin frontend
- `apps/website/client/src/pages/supplier/` — portal frontend (7 files)
