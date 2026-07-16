# Authentication & Authorization Architecture

**Status:** Canonical governance document
**Audience:** Humans and AI agents (Cursor, Codex, Claude, Copilot, etc.)
**Implementation baseline:** Sprint 3 Slice 1 + Slice 2A + Slice 2B code merged in `main` (PR #25 / #26 / #27 / #29; Slice 2B merge `0a5a730`). Production DB migrations for Slice 2B remain a **human gate**.
**Catalog freeze:** Production menu/pricing/catalog/toppings remain locked at **v1.2.0** unless a separate release unlocks them.

This document is the **single source of truth** for Telepizza authentication and authorization.
If implementation and this document disagree, treat that as a defect: fix code or update this document via an explicit architecture-approved change—never “quietly” diverge.

---

## 1. Purpose and change control

### What this document governs

- How identity is established (authentication)
- How privilege is decided (authorization / RBAC / branch scope)
- Customer vs staff journeys
- Security invariants that protect production
- Approved future direction (OTP, invites, RLS) without prematurely implementing it

### Change control (mandatory)

Any of the following requires **architecture approval** before merge:

1. Changing how roles/permissions/branches are sourced
2. Trusting JWT metadata, headers, query params, or frontend state for privilege
3. Public staff self-registration
4. Assigning privileged roles from `raw_user_meta_data`
5. Shipping customer OTP without an approved provider + smoke plan
6. Weakening RLS / branch isolation
7. Re-enabling Google OAuth without a security review
8. Touching v1.2.0 menu/pricing/catalog/toppings data as part of an auth change

**Agents must stop and ask** rather than improvise around these rules.

---

## 2. Architectural overview

```text
┌─────────────────────┐
│  Client (Website /  │
│  future Staff App)  │
└──────────┬──────────┘
           │ Bearer access token (Supabase Auth session)
           ▼
┌─────────────────────┐
│  Verify JWT         │  supabase.auth.getUser(token)
│  (authentication)   │  Never trust role claims in JWT metadata
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  AuthPrincipal      │  Loaded from Postgres public.* tables only
│  (authorization)    │  users + user_roles + roles + role_permissions + permissions
└──────────┬──────────┘
           │
           ├── status must be active
           ├── roles / permissions / branchIds
           └── isSuperAdmin (server-derived only)
           ▼
┌─────────────────────┐
│  Authorization      │  requirePermission / requireBranchAccess / …
│  Middleware         │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  API Routes         │  + future RLS on operational tables (Slice 2D)
└─────────────────────┘
```

### Core principle

| Concern | Source of truth | Never source from |
|---|---|---|
| Who is logged in? | Supabase Auth JWT verified via `getUser` | Client-invented user ids |
| What may they do? | `AuthPrincipal` from DB | Headers, body, query, JWT `app_metadata` / `user_metadata`, frontend state |
| Which branch? | `user_roles.branch_id` (+ super-admin bypass) | `x-telepizza-branch-id` or similar spoof headers |

---

## 3. Current implementation status

| Slice | Scope | Status |
|---|---|---|
| **Sprint 3 Slice 1** | Email/password auth, AuthContext, `/auth/me`, customer bootstrap, JWT verify | ✅ Complete |
| **Sprint 3 Slice 2A** | AuthPrincipal, permission/branch middleware, status gate, spoof protection, tests | ✅ Complete (`f7fa2c4`) |
| **Sprint 3.5** | Merge + migration apply + regression/smoke | ✅ Closed |
| **Slice 2B** | Staff invite / create / role+branch assign | ✅ Code merged (`0a5a730` / PR #29); ⏳ production migrations pending human gate |
| **Slice 2C** | Customer phone + OTP | 🔒 Not started |
| **Slice 2D** | Order/payment/delivery RLS by owner + branch | 🔒 Not started |

---

## 4. Dual-journey identity model (approved)

| Journey | Primary identity | Registration | Default role | Branch scope |
|---|---|---|---|---|
| **Customer** | Phone + OTP (future Slice 2C) | Public self-serve | Auto `customer` only | None (own data via RLS later) |
| **Staff** | Email + password | **No public register** — admin invite/create (Slice 2B) | Server-assigned staff roles | Assigned branch(es) |
| **Super Admin** | Email + password | Manual bootstrap / controlled invite | `super-admin` | Global (all branches) |

### Interim vs target

| Area | Now (Slice 1+2A) | Target |
|---|---|---|
| Customer login | Website email/password via Supabase Auth | Phone + OTP primary |
| Staff login | Same email/password stack (preserve) | Staff portal + invite activation |
| Customer permissions | Approved set = **empty** | Explicit `order.*` only after Slice 2D/orders |
| Admin stubs | Legacy `x-telepizza-role` may still gate **501** scaffolds | Must die before real staff routes unlock |

**Do not delete** working email/password until staff portal fully consumes it and OTP is production-ready.

---

## 5. Authentication flow

### 5.1 Token verification (API)

1. Client sends `Authorization: Bearer <access_token>`.
2. API calls Supabase Auth `getUser(token)`.
3. Missing/invalid token → **401 `UNAUTHORIZED`**.
4. Valid token yields `authUserId` (+ email if present). Identity only—no privileges yet.

### 5.2 Profile bootstrap (database)

On auth user creation (Slice 1 migration):

- Ensure one `public.users` row linked by `auth_user_id`.
- Assign global `customer` role when the user has **zero** roles (never overwrite existing staff roles).
- Do **not** create `public.customers` on email signup.
- Do **not** set `password_hash` for Supabase Auth users.
- Do **not** read role/user_type from metadata for privilege assignment.

Key migrations:

- `supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql`
- `supabase/migrations/20260716020000_sprint3_authorization_foundation.sql`

### 5.3 Account status

| `users.status` | API behavior |
|---|---|
| `active` | Allowed |
| `invited`, `inactive`, `suspended`, unknown/deleted-like | **403 `USER_ACCESS_DISABLED`** |
| Profile temporarily unloadable (DB outage) | **503 `AUTH_PROFILE_TEMPORARILY_UNAVAILABLE`** (no vendor leakage) |

Missing profile on `GET /auth/me` may return `200` with `meta.profileReady: false`.
Protected authorization middleware treats missing/non-active principal as **403 disabled**.

---

## 6. Authorization flow — AuthPrincipal

### 6.1 Shape (server-derived only)

```ts
type AuthPrincipal = {
  authUserId: string;
  userId: string;
  email: string | null;
  userType: string;
  status: string;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  isSuperAdmin: boolean;
};
```

### 6.2 Construction rules

| Field | Source |
|---|---|
| Profile / status / userType | `public.users` |
| Roles | `public.user_roles` → `public.roles.code` |
| Permissions | `role_permissions` → `permissions.code` (merged, unique) |
| Branch IDs | `user_roles.branch_id` (non-null only) |
| `isSuperAdmin` | Role code includes `super-admin` **and** user is not treated as customer |

**Customer hard rules (Slice 2A):**

- Customers receive permissions only via the `customer` role **and** the approved allowlist.
- Slice 2A approved customer allowlist = **empty**.
- Customers never receive staff/admin permissions even if mis-seeded on other roles.
- Customers do not receive branch scope from staff role rows.

### 6.3 Middleware (backend)

Canonical helpers live in `backend/api/src/middleware/authorization.ts`:

| Helper | Purpose |
|---|---|
| `requireAuthenticatedUser` | JWT + load principal + active status |
| `requirePermission(code)` | Single permission (super-admin bypass) |
| `requireAnyPermission(codes)` | Any-of permission (super-admin bypass) |
| `requireBranchAccess(resolveBranchId)` | Branch from **server resolver** (params/body), never spoof headers |
| `requireSuperAdmin` | Server-derived `isSuperAdmin` only |

HTTP semantics:

| Failure | Status | Typical code |
|---|---|---|
| Not authenticated | 401 | `UNAUTHORIZED` |
| Authenticated but forbidden / wrong branch / disabled | 403 | `FORBIDDEN` or `USER_ACCESS_DISABLED` |
| Principal repository outage | 503 | `AUTH_PROFILE_TEMPORARILY_UNAVAILABLE` |

### 6.4 Deprecated / unsafe

```text
requireRole([...])  // reads x-telepizza-role  — DEPRECATED / UNSAFE
```

Rules:

- Must **not** be used for `/auth/me` or any new route.
- Existing **501** admin/rider stubs may keep it temporarily.
- Must be removed before unlocking real admin/staff functionality.
- Tests must prove spoofed headers cannot satisfy new middleware.

---

## 7. `GET /api/v1/auth/me` contract

Safe response (no secrets):

```json
{
  "ok": true,
  "data": {
    "authUserId": "...",
    "email": "user@example.com",
    "profile": { "id": "...", "fullName": "...", "phone": null },
    "roles": ["customer"],
    "permissions": [],
    "branchIds": [],
    "isSuperAdmin": false
  },
  "meta": {
    "profileReady": true,
    "deprecatedRoleHeaderIgnored": true
  }
}
```

**Must never expose:** `password_hash`, service keys, invite tokens, private provider payloads, role-assignment internal ids beyond what the safe contract above allows, or raw Supabase/PostgREST errors.

---

## 8. RBAC model

### 8.1 System roles (seeded)

| Code | Intent |
|---|---|
| `super-admin` | Full system access; global branch bypass |
| `branch-manager` | Branch operations overview |
| `kitchen` | Kitchen workflows |
| `cashier` | POS / payment workflows |
| `rider` | Delivery workflows |
| `customer-support` | Support read/resolution |
| `customer` | Storefront customer (no staff privileges) |

### 8.2 Permission codes (current seed, non-exhaustive)

Examples already seeded: `menu.read`, `menu.write`, `branch.read`, `branch.manage`, `order.read`, `order.create`, `order.manage`, `delivery.*`, `payment.*`, `staff.*`, `admin.access`.

Future product may add aliases such as `menu.update`, `staff.create`, `staff.assign_role`, `reports.read`. Until explicitly approved and seeded, do not invent grants in ad-hoc migrations without review.

### 8.3 Customer permission policy

- Only **explicitly approved** customer permissions may ever be granted to role `customer`.
- Slice 2A: approved set is empty; migration deletes any accidental `customer` role_permissions.
- Later slices may add own-order permissions **with RLS**, never staff codes.

---

## 9. Branch hierarchy

```text
Organization (Telepizza)
 └── Branch (e.g. Royal Orchard, Northern Bypass)
      ├── Staff assignments via user_roles.branch_id
      ├── Orders / payments / deliveries (operational data)
      └── Local inventory / kitchen / riders (future)
```

Rules:

| Actor | Branch rule |
|---|---|
| Customer | No staff branch scope; own data via future RLS |
| Staff (non–super-admin) | May access only assigned `branchIds` |
| Super Admin | Global; middleware/RLS bypass is **server-derived** |
| Client headers | Never authorize branch access |

Future (Slice 2B): `user_roles.branch_id` required for non–super-admin staff roles.

---

## 10. Customer journey

### Current (Slice 1)

```text
Website Register/Login (email + password)
  → Supabase Auth session
  → AuthContext restores session
  → Optional GET /auth/me with Bearer
  → Cart preserved across logout identity clearing
```

### Target (Slice 2C)

```text
Name → Phone → OTP → Session
  → public.users + customer role only
  → Profile / addresses / own orders (with RLS)
```

Rules:

- No role picker in customer UI
- Google OAuth stays disabled unless architecture reopen
- Frontend hiding modules ≠ security; API + RLS enforce

---

## 11. Staff journey

### Current

- Email/password works via Supabase Auth.
- Public Register must **not** become a staff minting path once Slice 2B lands.
- Authorization spine is ready; staff management UI/APIs are not.

### Target (Slice 2B)

```text
Owner/Admin
  → Create Staff
  → Assign Role
  → Assign Branch
  → Send Invite
  → Staff activates account
  → /auth/me returns roles + permissions + branchIds
  → UI shows allowed modules only
```

---

## 12. Future OTP architecture (Slice 2C — planned)

Approved direction only—**do not implement until Slice 2C is authorized**.

1. Prefer Supabase Auth phone users (`auth.users.phone`).
2. Sync phone into `public.users.phone` (unique).
3. Provider ops (Twilio / Vonage / MessageBird) configured in Supabase—not hardcoded secrets in app code.
4. Bootstrap must force `customer` only for OTP customer surface; ignore metadata role claims.
5. Do not ship OTP as production default until provider + Multan test numbers + rate limits are ready.
6. Email/password remains emergency/staff path until cutover is approved.

---

## 13. Future RLS (Slice 2D — planned)

```text
Customer  → own orders / addresses only
Staff     → assigned branch operational rows only
Super Admin → everything
```

Helpers (planned): `current_app_user_id()`, `has_permission(code)`, `can_access_branch(branch_id)` — `SECURITY DEFINER` with pinned `search_path`.
RLS must use `auth.uid()` + DB RBAC, never client role claims.

---

## 14. Security invariants (must not change without approval)

1. **Verify then authorize:** JWT prove identity; DB prove privilege.
2. **Never trust:** `x-telepizza-role`, branch spoof headers, body role fields, JWT metadata roles, frontend permission arrays.
3. **Never assign privilege from metadata** on signup/backfill.
4. **Never grant service role keys or invite tokens to clients.**
5. **Never leak** PostgREST/Supabase internal errors on auth paths.
6. **Active-only:** suspended/inactive/unsupported statuses are denied.
7. **Customers cannot obtain staff permissions** (`menu.write` / `staff.*` / `payment.manage` / `admin.access` / etc.).
8. **Super-admin bypass is server-derived only.**
9. **Catalog freeze:** Auth work must not mutate v1.2.0 menu/pricing/catalog/toppings.
10. **No public staff registration.**
11. **No Google OAuth** until re-approved.
12. **Legacy header authz** must not unlock real write paths.

---

## 15. Key code map (agents)

| Concern | Location |
|---|---|
| JWT middleware | `backend/api/src/middleware/auth.ts` |
| Authz middleware | `backend/api/src/middleware/authorization.ts` |
| Principal builder | `backend/api/src/services/auth/principal.ts` |
| Supabase auth repository | `backend/api/src/services/auth/supabase.ts` |
| `/auth/me` | `backend/api/src/modules/auth/routes.ts` |
| Website session | `apps/website/client/src/contexts/AuthContext.tsx` |
| Website auth helpers | `apps/website/client/src/lib/auth-utils.ts` |
| Deprecated header role | `backend/api/src/common/http.ts` → `requireRole` |
| Auth tests | `backend/api/tests/auth*.test.ts` |
| DB static tests | `tests/database/sprint3-*.test.mjs` |

---

## 16. Long-term sequence

```text
Sprint 3.5 — Merge & production validation
    ↓
Slice 2B — Staff invite system
    ↓
Slice 2C — Customer phone OTP
    ↓
Slice 2D — Branch / owner RLS
    ↓
Sprint 4 — POS + Kitchen + Delivery (uses this authz spine)
```

Sprint 3.5 is closed. Slice 2B code is merged to `main` (PR #29). **Close Slice 2B only after** production migrations + invite→accept→`/auth/me` smoke.

### Sprint 3.5 checklist (gate) — completed

- [x] PR review for Slice 1 + 2A
- [x] Merge to `main`
- [x] Apply auth migrations to the appropriate non-prod/prod sequence per release process
- [x] Full regression: `pnpm check`, `pnpm test:db`, `pnpm test:backend`, `pnpm build:website`
- [x] Smoke: customer login, staff login, `/auth/me`, protected middleware behavior, website Menu/Cart/Checkout unbroken

### Slice 2B checklist (post-merge gate) — in progress

- [x] PR #29 review + merge (`0a5a730`)
- [x] Production API serves invite admin + accept routes (Render auto-deploy)
- [x] Website serves `/staff/accept` (Vercel)
- [x] Catalog regression PASS (58 items / 13 categories)
- [ ] Apply Slice 2B migrations to production Supabase (human gate):
  - `20260716100000_sprint3_slice2b_staff_permissions.sql`
  - `20260716101000_sprint3_slice2b_staff_invites.sql`
  - `20260716102000_sprint3_slice2b_accept_helper.sql`
- [ ] Production smoke: create invite → accept → staff `/auth/me`; spoof headers still ineffective
- [ ] Write `SPRINT-03-SLICE-2B-CLOSE.md` after smoke PASS

---

## 17. Related documents

| Document | Role |
|---|---|
| `docs/architecture/STAFF_INVITE_ARCHITECTURE.md` | Slice 2B staff invite architecture freeze |
| `docs/architecture/SLICE-2B-IMPLEMENTATION-BRIEF.md` | Pre-implementation gate brief |
| `_documentation-audit/reports/SPRINT-03-CUSTOMER-STAFF-AUTH-ARCHITECTURE.md` | Historical planning memo (pre-implementation) |
| `_documentation-audit/reports/SPRINT-03-PR-REVIEW.md` | Slice 1 PR review artifact |
| `_documentation-audit/reports/SPRINT-03.5-CLOSE.md` | Sprint 3.5 production validation close |
| `_documentation-audit/reports/SPRINT-03-SLICE-2B-GATE.md` | Slice 2B post-merge gate / migration handoff |
| `docs/04-engineering/09-security/04-api-security/AUTHENTICATION_SECURITY.md` | Broader API auth security notes |
| `docs/04-engineering/09-security/04-api-security/AUTHORIZATION_SECURITY.md` | Broader API authz security notes |
| `AGENTS.md` | Repo agent bootstrap / runtime ops |

If related docs conflict with **this** file on auth identity/privilege rules, **this file wins** until deliberately revised.

---

## 18. Agent quick checklist (before changing auth)

- [ ] Am I sourcing privilege only from DB-backed AuthPrincipal?
- [ ] Am I avoiding header/JWT-metadata trust?
- [ ] Am I preserving customer vs staff journey split?
- [ ] Am I avoiding menu/catalog freeze violations?
- [ ] Am I skipping Slice 2B/2C/2D scope that was not authorized?
- [ ] Do tests cover spoofing, status denial, 503 safety, and customer permission denial?

If any answer is unclear → **stop and ask**.
