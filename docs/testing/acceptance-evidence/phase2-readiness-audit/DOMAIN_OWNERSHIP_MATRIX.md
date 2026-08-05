# Phase 2 Readiness Audit — Domain Ownership Matrix

**Audit date:** 2026-08-04
**Status:** PROPOSED — for review and acceptance

---

## Authority Classes

| Class | Definition |
|---|---|
| Configuration authority | Who may create and activate configuration values |
| Operational authority | Who executes operational workflows |
| Customer authority | Who manages customer records and communication |
| Delivery authority | Who manages rider dispatch and delivery lifecycle |
| Financial authority | Who posts and approves financial entries |
| Audit authority | Who may read and export audit trails |
| AI advisory authority | Who approves AI-generated recommendations |

---

## Domain Ownership Matrix

| Domain | Domain Owner | Authoritative Data Owner | Write Authority | Read Models | Branch Scope | Org Scope | User/Role Scope | Event Producer | Event Consumers | Audit Responsibility | Retention Responsibility | Deletion/Anon | External Provider Boundary |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Organization Settings** | Config authority | Founder/super-admin | super-admin | All staff (read) | None (org-wide) | Singleton | super-admin | Settings service | Dashboard, branches | super-admin | Indefinite | N/A | None |
| **Branch Settings** | Config authority | branch-manager (write), super-admin | branch-manager, super-admin | Branch staff (read) | Per-branch | Org-wide | branch-manager, super-admin | Settings service | Delivery, Orders | branch-manager | Indefinite | N/A | None |
| **Delivery Settings** | Config authority | branch-manager, super-admin | branch-manager, super-admin | Branch staff | Per-branch | N/A | branch-manager, super-admin | Settings service | Delivery module | branch-manager | Indefinite | N/A | Map/GPS provider (future) |
| **Orders** | Operational authority | Orders service | cashier (create), kitchen (status), branch-manager (manage) | All ops roles (branch-scoped) | Per-branch | Cross-branch for owner | All ops roles | Orders service | Kitchen, Delivery, CRM, Finance | branch-manager | 7 years (financial record) | Customer request | None |
| **Kitchen/KDS** | Operational authority | Kitchen service | kitchen, branch-manager | kitchen, cashier, branch-manager | Per-branch | super-admin (cross) | kitchen, branch-manager | Kitchen service | Orders, Delivery | kitchen | 90 days | N/A | None |
| **Delivery** | Delivery authority | Delivery operations service | branch-manager (assign), rider (status) | branch-manager, super-admin | Per-branch | super-admin | branch-manager, rider, super-admin | Delivery service | Finance (COD), CRM | branch-manager | 90 days active; 7 years COD | Customer phone on completion | GPS provider (future) |
| **Riders** | Delivery authority | HR/Delivery joint | branch-manager, super-admin | branch-manager, super-admin | Per-branch | super-admin | branch-manager, super-admin | HR service / Delivery | COD settlement, Finance | branch-manager | Employment period + legal | Upon termination | GPS provider (future) |
| **POS** | Operational authority | POS/Finance service | cashier (transactions), branch-manager (Z-Report) | cashier, branch-manager, super-admin | Per-branch | super-admin | cashier, branch-manager | POS service | Finance (posting) | branch-manager | 7 years (financial) | N/A | Payment provider (future) |
| **WhatsApp/Support** | Customer authority | Support service | customer-support (agent), branch-manager (route) | customer-support, branch-manager | Per-branch (routing) | super-admin | customer-support, branch-manager | Conversation service | CRM (identity), Orders | customer-support | Consent-based; max 2 years | Customer opt-out + deletion | WhatsApp Business API |
| **CRM / Customer Master** | Customer authority | Customer master service | customer-support (update), super-admin (merge/block) | All ops roles (limited) | Cross-branch per customer | Org-wide | customer-support, super-admin | Customer service | Loyalty, Orders, Support | customer-support / super-admin | Legal retention + consent | Right-to-delete request | None (internal) |
| **Loyalty** | Customer authority | Loyalty service | Automated (order events), super-admin (manual adjust) | customer-support, branch-manager | Cross-branch per customer | Org-wide | customer-support, super-admin | Loyalty service | Marketing, CRM | super-admin | Customer lifetime + consent | On customer deletion | None |
| **Menu** | Config authority | Menu management service | super-admin, branch-manager (availability) | All roles (read) | Branch availability; org catalog | Org-wide catalog | super-admin (catalog), branch-manager (availability) | Menu service | Orders, Kitchen, POS, Inventory | super-admin | Indefinite (catalog history) | N/A | None |
| **Inventory** | Operational authority | Inventory service | branch-manager, purchasing (GRN) | branch-manager, super-admin | Per-branch | super-admin | branch-manager, super-admin | Inventory service | Purchasing, Finance (COGS), Kitchen | branch-manager | 3 years | N/A | None |
| **Purchasing** | Operational authority | Purchasing service | branch-manager (PO/GRN), super-admin | branch-manager, supplier-portal | Per-branch | super-admin | branch-manager, super-admin, supplier | Purchasing service | Inventory (GRN), Finance (AP) | branch-manager | 7 years (financial) | N/A | Supplier portal |
| **HR** | Financial authority | HR service | super-admin (hire/terminate), branch-manager (schedule) | branch-manager (own branch), super-admin | Per-branch staff | super-admin | super-admin, branch-manager | HR service | Payroll, Finance | super-admin | Employment period + legal | Upon termination | None |
| **Payroll** | Financial authority | Payroll service | super-admin (approve runs) | super-admin, branch-manager (own) | Per-branch | super-admin | super-admin | Payroll service | Finance (posting) | super-admin | 7 years (financial/legal) | N/A | None |
| **Finance / Accounting** | Financial authority | Finance service | super-admin (post/reverse), automated (rules) | super-admin, branch-manager (own branch) | Per-branch | super-admin (consolidated) | super-admin | Finance service | Reports, AI (advisory) | super-admin | 7 years (statutory) | Immutable except reversal | None |
| **Reports** | Audit authority | Reports service | N/A (read-only derived) | super-admin, branch-manager | Per-branch | super-admin (consolidated) | super-admin, branch-manager | N/A | AI (advisory) | super-admin | Derived; source retention applies | N/A | None |
| **AI Platform** | AI advisory authority | AI platform service | super-admin (configure agents), approval flow | super-admin | Org-wide | Org-wide | super-admin, designated approvers | AI service | Human approvers | super-admin | Per provider policy; max 90 days prompts | Prompt/output redaction | AI model provider |
| **Audit/Events** | Audit authority | Audit service (proposed) | System only (append-only) | super-admin, audit role | Per-domain | Org-wide | super-admin, audit role | All domain services | Compliance, AI (advisory) | super-admin | 7 years minimum | Redaction per PII rules | None |
| **Authentication** | Config authority | Auth service (Supabase) | Supabase Auth | All authenticated users | N/A | Org-wide | All | Auth service | All domains | super-admin | Account lifetime + legal | Account deletion | Supabase Auth |
| **Roles/Permissions** | Config authority | Auth/permission service | super-admin | All services | Per-branch assignments | Org-wide roles | super-admin | Auth service | All domains | super-admin | Indefinite | N/A | None |

---

## Ownership Conflict Analysis

### No conflicts found in Phase 1 design:
- Orders are owned by the operational authority; finance merely observes and posts.
- CRM owns the canonical customer record; support and loyalty are consumers.
- Delivery owns assignment and status; COD settlement is a finance boundary event.
- AI is advisory only; it is never the authoritative source of operational or financial truth.

### Potential conflicts requiring Phase 2 resolution:

1. **Branch Manager vs. Super-Admin on branch settings**: Both have write authority. Requires approval workflow for activation of certain settings (e.g., delivery radius changes).

2. **Customer identity ownership across Support and CRM**: Support creates conversations linked to customer identity; CRM is the authoritative identity. Merge/split authority must be exclusively with CRM (super-admin/customer-support lead). Support must not unilaterally create new canonical customers.

3. **COD ownership**: Delivery collects COD; Finance owns the ledger entry. The boundary event (delivery confirmed → cash received) must produce an immutable finance record. The actor is the rider; the authority is the branch manager (who reconciles); the financial truth is owned by Finance.

4. **Payroll and HR**: HR produces payroll runs; Finance posts them. A payroll run, once approved and posted, must be immutable. HR cannot modify a posted payroll period.

---

## Event Producer / Consumer Summary

| Event | Producer | Consumers |
|---|---|---|
| OrderCreated | Orders | Kitchen, Delivery, CRM, Finance |
| OrderStatusChanged | Orders | Kitchen, Delivery, Support, CRM |
| KitchenTicketStatusChanged | Kitchen | Delivery (dispatch trigger) |
| DeliveryAssigned | Delivery | Rider (notification), Support |
| DeliveryStatusChanged | Delivery | Orders (mirror), CRM, Finance (COD) |
| CustomerCreated | CRM | Loyalty, Support |
| CustomerMerged | CRM | Loyalty, Orders (re-link), Support |
| MessageReceived | Support | CRM (identity link) |
| InventoryAdjusted | Inventory | Finance (COGS), Purchasing |
| GRNPosted | Purchasing | Inventory, Finance (AP) |
| JournalPosted | Finance | Reports, AI |
| PayrollApproved | HR | Finance (posting) |
| ConfigurationActivated | Settings | All consumers of config |
| AuditEventEmitted | All domains | Audit log |

---

## External Provider Boundary Summary

| Provider | Domain | Sensitivity | Phase 2 Slice |
|---|---|---|---|
| WhatsApp Business API | Support/CRM | Critical — customer PII, messages | 2.2 |
| GPS/Map provider | Delivery/Riders | High — location data | 2.4 |
| Payment provider | POS/Finance | Critical — financial data | Future |
| AI model provider | AI Platform | High — prompt/data retention | 2.6 |
| Supabase Auth | Authentication | Critical | Existing |
| Vercel | Website hosting | Low | Existing |
| Render | API hosting | Medium | Existing |
