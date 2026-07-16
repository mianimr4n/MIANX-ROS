# Sprint 3 — Customer vs Staff Auth Architecture

**Type:** Inspection + implementation plan only (no code, no commit, no push, no production migration)  
**Date:** 2026-07-16  
**Baseline:** Release **v1.2.0** frozen (menu/pricing/catalog untouched)  
**Current auth code:** Sprint 3 Slice 1 on `feature/sprint-3-auth` @ `141de83`  
**Decision:** Preserve Slice 1 **email/password** for **staff/admin**. Add **phone + OTP** as the **customer primary** path in later slices. Do **not** delete working email/password yet.

---

## 1. Current vs target gap report

### Target model (approved)

| Journey | Identity | Registration | Role | Scope |
|---|---|---|---|---|
| **Customer** | Phone + OTP (name + phone; email optional) | Public self-serve | Auto `customer` only | Own profile, addresses, orders |
| **Staff** | Email/password (OTP optional later) | **No public register** — owner/admin invite/create | Server-assigned roles + branch | Assigned branch(es); permissions via RBAC |
| **Super Admin** | Email/password | Manual bootstrap / invite | `super-admin` | All branches |

### What Slice 1 already provides (preserve)

| Asset | Status | Reuse in dual-journey model |
|---|---|---|
| Supabase Auth email/password website Login/Register | Working | **Repurpose as staff login**; hide from customer primary UX |
| `AuthContext` session + `/auth/me` bearer | Working | Extend with `permissions`, `branchScopes`, `authPath` |
| `GET /api/v1/auth/me` + JWT via `getUser` | Working | Keep; enrich response for staff |
| `public.users` as profile + auth trigger | Working | Keep for both journeys; phone becomes required for customer path |
| Role `customer` + bootstrap assign | Working | Keep for customer OTP signup |
| Seeded staff roles + many permissions | Partial | Keep; map to finer permission codes |
| `user_roles.branch_id` column | Exists | Enable branch-scoped staff assignments |
| Google OAuth | Disabled | Keep disabled |
| Menu/catalog freeze | Intact | Do not touch |

### Gaps (must close in Slice 2+)

| Area | Current | Target | Gap |
|---|---|---|---|
| Customer primary auth | Email + password | Phone + OTP | OTP provider, UI, trigger for phone users |
| Customer self-reg UX | Same Login/Register as “account” | Name + phone + OTP only | Separate customer auth screens |
| Staff registration | Public Register page | Admin-only invite/create | Remove public staff register; admin staff APIs/UI |
| Role trust | `/me` OK; admin stubs still use `x-telepizza-role` | Never trust headers/body/metadata | Replace `requireRole` with DB RBAC middleware |
| Permissions | Seed has order/menu/staff codes | Exact codes below (+ aliases) | Align seed + `requirePermission` |
| Branch enforcement | Schema only | RLS + middleware | Staff order/payment RLS by `branch_id` |
| Customer data RLS | Own `users` row only | Own orders, addresses, profile | Address table + order RLS |
| Status lockout | Not enforced on `/me` | Suspended users blocked | Gate on `users.status` |
| Separate staff app/routes | Website Account only | Staff portal / admin routes | Route splits + auth guards |
| SMS/WhatsApp OTP ops | None | Twilio/Vonage/MessageBird + Supabase Phone | Owner dashboard + secrets |

### Explicit non-goals for this plan document

- No deletion of Slice 1 email/password code
- No Google OAuth
- No menu/pricing/catalog/POS/deploy edits
- No commit / push / production apply in this step

---

## 2. Exact schema changes (proposed)

Forward migrations only (Slice 2+). Names illustrative.

### 2.1 Permissions catalog expansion / alignment

Ensure (upsert) codes used by product:

```text
orders.read
orders.create
orders.update_status
payments.collect
menu.read
menu.update          -- alias of or replace menu.write carefully
staff.read
staff.create
staff.assign_role
reports.read
deliveries.accept    -- map from / alongside delivery.update | delivery.assign
```

Also keep existing useful codes (`branch.*`, `payment.manage`, `admin.access`, etc.) until callers migrate.

**Customer role permissions (seed):**

```text
orders.read   (own only — via RLS + scoped API)
orders.create (own)
-- no staff/menu.write/admin
```

### 2.2 Customer phone identity

- Prefer Supabase Auth phone user (`auth.users.phone`).
- Sync into `public.users.phone` via trigger/ensure (unique).
- **Still do not create `public.customers` until phone verified** (or create `customers` row only after OTP success with required phone — Slice decision: keep deferred OR introduce after OTP; recommend create `customers` after OTP when phone is reliable).

Optional table:

```sql
public.customer_addresses (
  id uuid PK,
  user_id uuid NOT NULL REFERENCES public.users(id),
  label text,
  address_line text NOT NULL,
  city text,
  is_default boolean,
  created_at, updated_at
);
```

Optional: `favourite_branch_id` on `users` or `customers`.

### 2.3 Staff invitation / assignment

```sql
public.staff_invites (
  id uuid PK,
  email text,
  phone text,
  full_name text NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id),
  branch_id uuid REFERENCES branches(id), -- required except super-admin
  invited_by uuid REFERENCES users(id),
  token_hash text,
  expires_at timestamptz,
  accepted_at timestamptz,
  status text check (pending|accepted|revoked|expired)
);
```

Rules:

- `user_roles.branch_id` **required** for non–super-admin staff roles.
- `user_roles.branch_id` **null** only for `super-admin` and `customer` (global).
- Never allow client to INSERT `user_roles` (already blocked).

### 2.4 Auth path / user_type clarity

Keep `user_type` ∈ (`customer`,`staff`,`rider`,`admin`,…).  
Document:

| Auth method | Typical `user_type` | Roles |
|---|---|---|
| Phone OTP | `customer` | `customer` only |
| Email/password staff invite | `staff` / `admin` / `rider` | Server-assigned staff roles |

Bootstrap trigger must **branch**:

- If signup is phone OTP customer surface → force `customer` role only (ignore metadata roles).
- If signup is staff invite acceptance → apply invite role+branch; **never** open public staff signup.

### 2.5 What NOT to invent

- No parallel `profiles` table
- No privileged roles from metadata
- No public staff self-registration table

---

## 3. Exact RLS policy plan

### 3.1 Preserve Slice 1

- Own `users` SELECT/UPDATE (privileged columns still trigger-blocked)
- Own `user_roles` SELECT
- Authenticated read of `roles` (optionally restrict staff codes later)

### 3.2 Add: customer_addresses

```text
SELECT/INSERT/UPDATE/DELETE: user_id IN (users where auth_user_id = auth.uid())
```

### 3.3 Add: orders / order_items (customer)

```text
Customer SELECT: orders.customer_id / user linkage = own user
Customer INSERT: only as self, branch operating, no privilege fields
Staff SELECT/UPDATE: via helper can_access_branch(branch_id) AND permission
Super-admin: all
```

Helper (SECURITY DEFINER, pinned `search_path`):

```sql
public.current_app_user_id()        -- users.id for auth.uid()
public.has_permission(code text)
public.can_access_branch(branch uuid) -- super-admin OR user_roles.branch_id match
```

### 3.4 Add: staff_invites

```text
SELECT/INSERT/UPDATE: has_permission('staff.create' | 'staff.assign_role')
                          AND can_access_branch(branch_id) OR super-admin
```

### 3.5 Enforce never trust client claims

RLS uses `auth.uid()` + DB role/permission tables only — never JWT custom role claims until custom claims are server-signed and verified.

---

## 4. Backend middleware plan

### 4.1 Keep

- `createRequireAuth` → Bearer → `supabase.auth.getUser`
- `/auth/me` enriched response

### 4.2 Replace (Slice 2 security)

Deprecate and stop using for real authz:

```text
requireRole([...])  // x-telepizza-role header
```

Add:

```text
requireAuth
requirePermission('orders.read')
requireAnyPermission([...])
requireBranchAccess(branchIdFromParams|body)
```

Load once per request (cached on `req.auth`):

```text
authUserId
profileId
status (reject inactive/suspended)
roles[]
permissions[]
branchIds[]   // from user_roles
isSuperAdmin
```

### 4.3 `/auth/me` response (extended, safe)

```json
{
  "authUserId": "...",
  "email": null,
  "phone": "+92...",
  "profile": { "id", "fullName", "phone", "email" },
  "roles": ["customer"],
  "permissions": ["orders.read", "orders.create"],
  "branchIds": [],
  "authMethods": ["phone"],
  "profileReady": true
}
```

Staff example:

```json
{
  "roles": ["cashier"],
  "permissions": ["orders.read", "orders.create", "payments.collect"],
  "branchIds": ["<royal-orchard-uuid>"]
}
```

### 4.4 New staff APIs (staged)

| Method | Path | Permission |
|---|---|---|
| POST | `/api/v1/admin/staff/invites` | `staff.create` + branch scope |
| POST | `/api/v1/admin/staff/invites/:id/accept` | invite token |
| GET | `/api/v1/admin/staff` | `staff.read` |
| PATCH | `/api/v1/admin/staff/:id/roles` | `staff.assign_role` |

Customer OTP stays on **website → Supabase Auth phone APIs** (no custom OTP store if provider handles it). Backend only verifies Bearer afterward.

---

## 5. Customer and staff UI flow

### 5.1 Customer (website) — primary

```text
/login or /register (customer)
  → Full name
  → Phone (PK format)
  → Send OTP (SMS/WhatsApp via Supabase Phone + provider)
  → Enter OTP
  → Session established
  → Trigger ensures public.users + customer role
  → /account (profile, addresses, orders)
```

Rules:

- No role picker
- Email optional (profile settings later)
- Password not required for customer V1
- Google hidden

**Email/password customer pages:** keep accessible as “legacy / alternate” behind secondary link **or** migrate later to staff-only URL — recommend:

```text
/account/login          → Phone OTP (customer)
/staff/login            → Email/password (staff)
```

Do not delete Slice 1 pages; relocate/rename carefully in Slice 2 UI work.

### 5.2 Staff

```text
Owner/Admin Dashboard
  → Create Staff
  → Name + phone/email
  → Role select (server list)
  → Branch assign (required unless super-admin)
  → Invite / temporary password
  → Staff opens /staff/login
  → Email/password (or invite accept)
  → Session → /me returns roles + branchIds + permissions
  → UI shows only permitted modules
```

Public `/register` must **not** create staff.

### 5.3 Permission-driven UI (examples)

| Role | UI modules |
|---|---|
| Cashier | POS orders, payments |
| Kitchen | Tickets, status |
| Rider | Assigned deliveries |
| Branch Manager | Branch ops, reports, staff read |
| Super Admin | Everything + staff create |

**Frontend hide ≠ security.** Backend + RLS always enforce.

---

## 6. Migration and rollback plan

### 6.1 Forward slices (suggested files)

| Migration | Purpose |
|---|---|
| `…_permissions_align_sprint3.sql` | Upsert new permission codes; map role_permissions |
| `…_customer_addresses.sql` | Addresses + RLS |
| `…_auth_helpers_rls_orders.sql` | Helpers + order RLS |
| `…_staff_invites.sql` | Invites + RLS |
| `…_phone_auth_bootstrap_adjust.sql` | Phone signup ensure path (if needed) |

Each: `BEGIN`/`COMMIT`, idempotent, verification + rollback comments.

### 6.2 Rollback principles

- Prefer disable feature flags / redeploy previous app revision before destructive SQL
- Drop new invites/addresses policies tables last
- **Never** drop `customer` role or Slice 1 bootstrap casually
- Staff invites revoke > delete historical users

### 6.3 OTP provider (ops, not in app repo secrets)

Owner must configure in Supabase Auth:

- Phone provider (Twilio / Vonage / MessageBird)
- SMS/WhatsApp templates
- Test numbers for Multan staging
- Rate limits

Until configured: **do not** ship customer OTP to production as default path; keep Slice 1 email path as fallback emergency only for known test accounts.

---

## 7. Staged Slice 2 implementation plan

### Slice 2A — Authz foundation (no OTP yet)

1. Replace `requireRole` header trust with `requirePermission` + DB load  
2. Gate `/me` on `users.status`  
3. Enrich `/me` with `permissions` + `branchIds`  
4. Align permission seed codes  
5. Tests: spoof header ignored for real admin when implemented behind permissions  
6. **Preserve** email/password Login/Register  
7. Split routes: document `/staff/login` vs customer account  

**Exit:** Staff-ready authz spine without OTP dependency.

### Slice 2B — Staff invite admin

1. `staff_invites` migration + RLS  
2. Admin APIs to create/list invites  
3. Minimal admin UI (or authenticated scripted flow)  
4. Public Register cannot mint staff  
5. Branch-required assignment for non–super-admin  

**Exit:** Owner can create cashier for Royal Orchard only.

### Slice 2C — Customer phone OTP

1. Configure SMS provider (owner)  
2. Customer UI: name + phone + OTP  
3. Trigger/ensure path for phone users → `customer` only  
4. Optional email on profile  
5. Addresses table + RLS  
6. Own-orders RLS when order APIs mature  

**Exit:** Customer default journey is OTP; email/password not primary for customers.

### Slice 2D — Branch RLS on operational data

1. Orders/payments/deliveries policies using `can_access_branch`  
2. Integration tests with two branches  
3. Remove remaining spoofable authz  

**Exit:** Ali (cashier, Royal Orchard) cannot read Northern Bypass via API.

### Hard constraints across all slices

- Do not delete Slice 1 email/password until staff portal consumes it  
- Do not enable Google OAuth  
- Do not modify menu/pricing/catalog/POS/deployment  
- Do not trust frontend role metadata  
- v1.2.0 catalog freeze remains locked  

---

## 8. Current password UX note (product)

Website enforces **min 8** characters; Supabase dashboard may show **min 6**.  
That mismatch is intentional client hygiene and is **not** an email-confirmation bug.  
Regardless: **customer V1 should not rely on passwords** — phone OTP is the intended UX.

---

## 9. Decision summary for Cursor / owners

| Decision | Value |
|---|---|
| Customer primary | Phone + OTP |
| Staff primary | Email/password (preserve Slice 1) |
| Public staff register | Forbidden |
| Roles | Server-assigned; DB `user_roles` + `branch_id` |
| Authz | Backend permissions + RLS |
| Next engineering | Start **Slice 2A** after this plan approval |

---

## 10. Immediate next ask (when approved)

Implement **Slice 2A only** (authz spine + `/me` enrichment + kill header trust for new code paths), still without OTP provider and without catalog changes.

Until approval: **stop** — plan only.
