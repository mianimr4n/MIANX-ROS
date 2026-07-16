# Sprint 3 — Slice 2B Staff Invite Architecture

**Status:** Locked owner decisions approved · implementation on `feature/sprint-3-staff-invites`  
**Type:** Complete blueprint + security review (implementation in progress)  
**Audience:** Owner (business decisions) · Architects · AI implementation agents  
**Depends on:** Canonical `docs/architecture/AUTHENTICATION_ARCHITECTURE.md`  
**Baseline:** Sprint 3.5 **CLOSED** (Slice 1 + 2A production-verified)  
**Catalog freeze:** v1.2.0 menu/pricing/catalog/toppings — **do not touch**

```text
✅ Sprint 3.5 Complete
        ↓
✅ Slice 2B architecture + locked owner decisions (D1–D8)
        ↓
🚧 Implementation on feature/sprint-3-staff-invites (this PR)
        ↓
PR review → Merge → Migration → Smoke → CLOSE
```

Implementation branch:

```text
feature/sprint-3-staff-invites
```

**Locked owner decisions (authoritative):**

1. **D1** Only DB-derived `super-admin` may create/send/resend/revoke/list/inspect invites  
2. **D2** Branch managers cannot invite in Slice 2B  
3. **D3** Inviteable roles only: `branch-manager`, `cashier`, `kitchen`, `rider`, `customer-support` — **not** `customer` or `super-admin`  
4. **D4** Exactly one operating `branch_id` on every invite; never trust accept-body branch  
5. **D5** Default TTL 72h, max 168h (server-enforced)  
6. **D6** Resend rotates token, invalidates prior, refreshes expiry, audits, max 3 send/resend per 24h per email; revoked cannot resend  
7. **D7** Return `inviteUrl` once to super-admin; never persist/log/GET/audit raw token; SHA-256 hash only  
8. **D8** Minimal `/staff/accept` with read-only email/name/role/branch + password fields  

**CRITICAL:** Existing `auth.users` email → `INVITE_ACCOUNT_CONFLICT` (no silent convert / no staff attach).
---

## Executive summary

Slice 2B adds **admin-controlled staff invitation** on top of the verified AuthPrincipal spine.

| Principle | Rule |
|---|---|
| Identity | Supabase Auth email/password after invite accept |
| Privilege | DB `user_roles` + `roles` + `permissions` only |
| Branch | Required on invite for every non–super-admin role |
| Token | Single-use, hashed at rest, time-limited |
| Public register | Remains **customer-only** — never mints staff |

**Recommended 2B v1 defaults (pending owner sign-off):**

1. Only **Super Admin** (Owner ≡ Super Admin) may create/resend/revoke invites  
2. **Branch Manager invite rights deferred** to 2B.1  
3. **One branch per invite** (no multi-branch assignment in 2B)  
4. Invite expiry **72 hours** (max 168)  
5. Rider onboarded via same invite flow with role `rider` + required branch  
6. Accept UX: ship minimal `/staff/accept` page + APIs in same implementation PR  
7. Invite delivery: return `inviteUrl` in API for 2B; email provider optional later  

---

## 0. Purpose and non-goals

### In scope

- Staff invitation lifecycle (create → send → accept / expire / revoke / resend)
- Role + branch assignment at invite time
- Email/password activation via accept
- Audit trail
- Permission seed alignment (`staff.create`, `staff.assign_role`)
- API contracts + DB schema + security controls + test plan + DoD

### Out of scope (hard stop)

- Customer phone OTP (Slice 2C)
- Order / payment / delivery RLS (Slice 2D)
- Full Admin console polish, POS, Kitchen, Rider apps feature unlock
- Google OAuth
- Menu / pricing / catalog / toppings / branch business data edits
- Production migration/deploy until post-merge gate
- Silent customer→staff account upgrade
- Multi-branch single invite (2B.2+)

---

## 1. Staff invitation system

### 1.1 Invite lifecycle (happy path)

```text
draft
  │  send
  ▼
pending          ← product language: “Sent”
  │  accept + activate
  ▼
accepted         ← invite terminal
  │
  ▼
public.users.status = active
+ staff/rider/admin role via user_roles
```

### 1.2 Alternate paths

```text
pending ──► expired      (token_expires_at passed)
pending ──► revoked      (admin revoke)
draft   ──► revoked      (cancel before send)
accepted ──► (immutable terminal; no reuse)
```

### 1.3 Status dictionary

| DB status | Product term | Acceptable? |
|---|---|---|
| `draft` | Draft | No |
| `pending` | Sent / Pending | Yes (if not past expiry) |
| `accepted` | Accepted | No (replay blocked) |
| `revoked` | Revoked | No |
| `expired` | Expired | No |

“Active” refers to the **user account**, not an invite status.

### 1.4 State machine (normative)

| From | Event | To | Side effects |
|---|---|---|---|
| — | `create` | `draft` or `pending` | If `sendNow`: generate token, hash, set expiry |
| `draft` | `send` | `pending` | Generate token, hash, `sent_at`, `send_count++` |
| `pending` | `resend` | `pending` | **Rotate** token, new hash, extend expiry, `send_count++` |
| `pending`/`draft` | `revoke` | `revoked` | Clear `token_hash`, set `revoked_at` |
| `pending` | clock/`accept` check | `expired` | Clear `token_hash` (lazy or batch) |
| `pending` | `accept` success | `accepted` | Clear hash; bind `accepted_user_id`; provision roles |

Rules:

1. Terminal states are immutable.  
2. Resend only from `pending`.  
3. Accept only from `pending` with valid unexpired token.  
4. Failed accept does **not** consume token (unless abuse lockout policy triggers).  
5. Successful accept is single-use (hash cleared in same transaction).

### 1.5 Acceptance flow (end-to-end)

```text
Invitee opens /staff/accept?token=RAW
        │
        ▼
POST /api/v1/auth/staff/invites/accept
  { token, password, fullName? }
        │
        ├─ hash(token) lookup
        ├─ status=pending && now < token_expires_at
        ├─ email conflict checks
        │
        ▼
Service role:
  1. auth.admin.createUser(email, password, email_confirm=true)
  2. ensure public.users row (Slice 1 trigger may create customer first)
  3. SECURITY DEFINER / gated transaction:
       - user_type := staff|rider|admin (from invite role mapping)
       - status := active
       - delete customer role if present
       - insert user_roles(role_id, branch_id) from invite ONLY
       - invite := accepted; token_hash := null
  4. audit accept_succeeded
        │
        ▼
Client signs in with email/password
GET /auth/me → roles, permissions, branchIds, isSuperAdmin
```

**Critical:** Accept body must **ignore** any client `roleCode` / `branchId`.  
Source of truth = invite row.

### 1.6 Expiry

| Parameter | Value |
|---|---|
| Default TTL | **72 hours** from send/resend |
| Max TTL | **168 hours** (7 days) |
| Min TTL | **1 hour** |
| Enforcement | Reject accept if `now() >= token_expires_at`; mark `expired` |
| Clock | Store UTC `timestamptz` |

### 1.7 Revoke / resend

| Action | Who (2B v1) | Effect |
|---|---|---|
| Revoke | Super Admin | `revoked`; hash cleared; accept fails |
| Resend | Super Admin | New raw token; old token immediately invalid; expiry refreshed |

---

## 2. RBAC finalization (Slice 2B lens)

### 2.1 Roles (system)

| Role code | `user_type` on accept | Invite in 2B? | Branch on invite |
|---|---|---|---|
| `super-admin` | `admin` | **Never** (manual/bootstrap only) | n/a |
| `branch-manager` | `staff` | Yes | **Required** (exactly one operating) |
| `cashier` | `staff` | Yes | Required |
| `kitchen` | `staff` | Yes | Required |
| `customer-support` | `support` | Yes | Required |
| `rider` | `rider` | Yes | Required |
| `customer` | `customer` | **Never via staff invite** | n/a |

**Owner:** no separate role code in 2B. Owner operators use `super-admin`.

### 2.2 Permission catalog (staff invite related)

| Code | Already seeded? | 2B action |
|---|---|---|
| `staff.read` | Yes | List invites / staff |
| `staff.manage` | Yes | Keep; do not rely alone for new routes |
| `staff.create` | **No** | **Add** — create/send/resend/revoke |
| `staff.assign_role` | **No** | **Add** — set role on invite |

Grant mapping for 2B v1:

| Role | `staff.read` | `staff.create` | `staff.assign_role` | `staff.manage` |
|---|---|---|---|---|
| `super-admin` | ✅ | ✅ | ✅ | ✅ |
| `branch-manager` | ✅ (existing) | ❌ until 2B.1 | ❌ until 2B.1 | ✅ existing seed — **not enough alone to open invite APIs** |
| Others | ❌ | ❌ | ❌ | ❌ |

New invite routes must require **DB-derived `isSuperAdmin`** (`requireSuperAdmin`), not permission-only gates and never header roles.

### 2.3 Actor matrix (invite management)

| Action | Super Admin / Owner | Branch Manager (2B v1) | Cashier/Kitchen/Support | Rider | Customer | Anon |
|---|---|---|---|---|---|---|
| Create invite | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| List invites | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Resend | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Revoke | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Accept invite | — | — | — | — | — | ✅ token |
| Public register as staff | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 2.4 Decision D1 — Branch Manager as inviter

**Recommendation: No for 2B v1.**

| Option | Pros | Cons |
|---|---|---|
| A. Super Admin only (recommended) | Minimal escalation surface | Owner must invite all staff |
| B. BM can invite into own branch, allowlisted roles only | Scales ops | Needs branch-scoped authz + deny `super-admin`/`branch-manager` |

**2B.1 (later):** Option B with allowlist `{cashier, kitchen, rider, customer-support}`.

### 2.5 Rider onboarding (2B)

Same invite pipeline:

1. Super Admin creates invite: `roleCode=rider`, `branchId=<operating branch>`  
2. Rider accepts → password set → `user_type=rider` + `rider` role + branch  
3. `/auth/me` returns rider permissions (`delivery.read`, `delivery.update`, `order.read`)  
4. Rider app/POS unlock remains **out of scope** (routes may stay 501)

---

## 3. Branch assignment rules

### 3.1 Slice 2B rule: one branch per invite

| Invite role | Branches allowed |
|---|---|
| `super-admin` | **0** (`branch_id` NULL) — global bypass |
| All other inviteable roles | **Exactly 1** required `branch_id` |

**Multi-branch assignment:** **Not in 2B.**  
Future: multiple `user_roles` rows or a later admin “add branch” API (2B.2+).

### 3.2 Isolation

| Actor | Sees / manages |
|---|---|
| Super Admin | All branches; all invites |
| Branch-scoped staff (after accept) | Only `AuthPrincipal.branchIds` via middleware |
| Client headers | Never authorize branch |

### 3.3 Validation on create

1. `branchId` UUID exists in `public.branches`  
2. Prefer `status = 'operating'` (reject `inactive`; warn/reject `coming-soon` — **recommend reject non-operating**)  
3. Role/branch pairing enforced by DB trigger + API  
4. Never read `x-telepizza-branch-id`

### 3.4 Super Admin bypass

- Invite with `roleCode=super-admin` ⇒ `branch_id` must be NULL  
- Resulting principal: `isSuperAdmin=true`, `branchIds=[]`  
- `requireBranchAccess` continues to bypass for super-admin (Slice 2A)

---

## 4. API design

Product sketch paths map to versioned admin/auth routes:

| Sketch | Canonical 2B path |
|---|---|
| `POST /staff/invites` | `POST /api/v1/admin/staff/invites` |
| `GET /staff/invites` | `GET /api/v1/admin/staff/invites` |
| `POST /staff/invites/:id/resend` | `POST /api/v1/admin/staff/invites/:id/resend` |
| `POST /staff/invites/:id/revoke` | `POST /api/v1/admin/staff/invites/:id/revoke` |
| `POST /staff/invites/accept` | `POST /api/v1/auth/staff/invites/accept` |

Additional (recommended):

| Method | Path | Permission |
|---|---|---|
| `GET` | `/api/v1/admin/staff/invites/:id` | `staff.read` |
| `POST` | `/api/v1/admin/staff/invites/:id/send` | `staff.create` |

### 4.1 Authz wiring

- Admin routes: `requireAuthenticatedUser` → `requirePermission('staff.create'|'staff.read'|'staff.assign_role')`  
- Accept route: **no JWT privilege**; invite token + rate limit  
- **Forbidden:** `requireRole` / `x-telepizza-role`

### 4.2 Create request

```json
{
  "email": "ali.cashier@example.com",
  "fullName": "Ali Cashier",
  "roleCode": "cashier",
  "branchId": "<uuid>",
  "sendNow": true,
  "expiresInHours": 72
}
```

### 4.3 Create/send response (raw token once)

```json
{
  "ok": true,
  "data": {
    "id": "<invite-uuid>",
    "email": "ali.cashier@example.com",
    "fullName": "Ali Cashier",
    "roleCode": "cashier",
    "branchId": "<uuid>",
    "status": "pending",
    "expiresAt": "2026-07-19T00:00:00.000Z",
    "inviteUrl": "https://<host>/staff/accept?token=<RAW_ONCE>"
  }
}
```

Subsequent GET **must not** include raw token or hash.

### 4.4 Accept request / response

```json
{
  "token": "<raw>",
  "password": "********",
  "fullName": "Ali Cashier"
}
```

```json
{
  "ok": true,
  "data": {
    "authUserId": "<uuid>",
    "email": "ali.cashier@example.com",
    "profileReady": true
  },
  "meta": { "next": "sign_in_with_email_password" }
}
```

Prefer **create user + explicit sign-in** (clearer audit) over returning a session from accept.

### 4.5 Stable error codes

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Admin route without valid JWT |
| 403 | `FORBIDDEN` / `USER_ACCESS_DISABLED` | No permission / disabled principal |
| 409 | `INVITE_CONFLICT` | Duplicate pending / email already staff/customer |
| 410 | `INVITE_NOT_ACCEPTABLE` | Bad/expired/revoked/used token |
| 422 | `VALIDATION_ERROR` | Schema / branch / role rules |
| 429 | `RATE_LIMITED` | Accept/resend abuse |
| 503 | `AUTH_PROFILE_TEMPORARILY_UNAVAILABLE` | Dependency outage (no vendor leak) |

---

## 5. Database design

### 5.1 `public.staff_invites`

```sql
create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),

  email varchar(150) not null,
  full_name varchar(150) not null,
  phone varchar(30),

  role_id uuid not null references public.roles (id),
  branch_id uuid references public.branches (id),

  status text not null default 'draft'
    check (status in ('draft', 'pending', 'accepted', 'revoked', 'expired')),

  token_hash text,
  token_expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,

  invited_by uuid references public.users (id),
  accepted_user_id uuid references public.users (id),

  send_count integer not null default 0,
  last_sent_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

### 5.2 Constraints / triggers

1. **Branch pairing trigger**  
   - role `super-admin` ⇒ `branch_id IS NULL`  
   - else ⇒ `branch_id IS NOT NULL`
2. **Email normalize** on write: `lower(trim(email))`
3. **Partial unique pending email**

```sql
create unique index staff_invites_one_pending_email_uidx
  on public.staff_invites (lower(email))
  where status = 'pending';
```

4. **Unique token hash** where not null  
5. **updated_at** via existing `set_updated_at` pattern

### 5.3 Indexes

| Index | Purpose |
|---|---|
| `(lower(email))` | Lookup / conflict |
| `(status)` | Admin filters |
| `(branch_id)` | Branch-scoped lists (2B.1) |
| unique `(token_hash)` where not null | Accept path |
| partial unique pending email | One active invite per email |

### 5.4 Audit: `public.staff_invite_events`

```text
id uuid PK
invite_id uuid NOT NULL REFERENCES staff_invites(id)
actor_user_id uuid NULL REFERENCES users(id)
event_type text NOT NULL
  -- created|sent|resent|revoked|accept_succeeded|accept_failed|expired_marked
payload jsonb NOT NULL DEFAULT '{}'   -- no secrets/tokens
ip inet NULL
user_agent text NULL
created_at timestamptz NOT NULL DEFAULT now()
```

Append-only; no updates/deletes from app roles.

### 5.5 RLS

- Enable RLS on both tables  
- **No** `authenticated` / `anon` write policies  
- Reads: none for anon; optional authenticated read deferred (API uses service role)  
- Mutations: service role + SECURITY DEFINER accept helper only  

### 5.6 Email conflict policy

| Existing | Create invite | Accept |
|---|---|---|
| None | Allow | Create |
| Pending invite same email | 409 | — |
| Active staff same email | 409 | Reject |
| Customer same email | **409 reject (2B)** | Reject |
| Suspended / inactive | **409 reject (2B)** | Reject |

### 5.7 Slice 1 bootstrap reconciliation

Accept must not leave staff with only `customer` role:

1. Create auth user (service role)  
2. Trigger may insert customer profile + customer role  
3. Accept transaction: set `user_type`, `status=active`, remove `customer` role, insert invite role+branch  
4. Prefer SECURITY DEFINER helper with pinned `search_path` to bypass client privilege triggers safely  

---

## 6. Security review

### 6.1 Threat model (abridged)

| Threat | Mitigation |
|---|---|
| Stolen invite URL | TTL 72h; single-use; HTTPS only |
| Token DB leak | Store hash only |
| Replay accept | Clear hash on success; terminal status |
| Privilege via accept body | Ignore role/branch from client |
| Header spoof admin | Slice 2A middleware; no `requireRole` |
| Staff via `/register` | Customer-only; accept is only mint path |
| Enumeration on accept | Generic `INVITE_NOT_ACCEPTABLE` |
| Brute force tokens | 32+ byte entropy + rate limit |
| Inviter suspended mid-flight | Admin routes still status-gated |
| Log leakage | Never log raw token / hash / passwords |

### 6.2 Token security controls

| Control | Requirement |
|---|---|
| Generation | CSPRNG ≥ 32 bytes |
| Encoding | URL-safe base64/hex |
| At rest | SHA-256 hash only |
| Compare | Constant-time |
| Delivery | Once in create/resend response (and optional email later) |
| Rotation | Resend invalidates prior token |
| Single-use | Hash nulled on accept in same TX |

### 6.3 Email ownership validation

1. Invite email is the only email used to create Auth user  
2. Accept does not allow different email  
3. Auth email confirmed at create (`email_confirm: true`) for invite path  
4. No linking invite to a different existing auth subject in 2B  

### 6.4 Authorization security

- All admin invite APIs: JWT + DB AuthPrincipal + permission codes  
- Super-admin bypass: server-derived only  
- Customers cannot gain `staff.*` via accept  
- Assignable roles validated against `public.roles` + deny `customer`  

### 6.5 Security sign-off checklist (architecture)

- [x] Single-use hashed tokens specified  
- [x] Expiry + revoke + resend rotation specified  
- [x] Replay protection specified  
- [x] Header spoof explicitly forbidden  
- [x] Public staff registration forbidden  
- [x] Accept ignores client role/branch  
- [x] Audit events without secrets  
- [x] Vendor error non-leakage (503 pattern)  

---

## 7. Migration strategy

Forward-only, idempotent, no catalog changes:

1. `…_sprint3_slice2b_staff_permissions.sql` — upsert `staff.create`, `staff.assign_role`; grant to `super-admin` only  
2. `…_sprint3_slice2b_staff_invites.sql` — tables, indexes, triggers, RLS, grants  
3. `…_sprint3_slice2b_accept_helper.sql` — optional SECURITY DEFINER accept function  

Each: `BEGIN`/`COMMIT`, verification queries, rollback comments.  
**No production apply** until merge + release gate.

---

## 8. UI surfaces (minimal)

| Surface | 2B |
|---|---|
| Admin invite | API-first acceptable; thin UI optional |
| `/staff/accept` | **Recommended in same PR** (password form) |
| Customer `/register` | Unchanged |
| Staff login | Existing email/password; `/staff/login` rename optional |

Frontend hide ≠ security.

---

## 9. Test plan

### 9.1 Unit

- Token hash helper  
- State transition guards  
- Branch/role pairing validator  
- Expiry calculation (cap/min)

### 9.2 DB (static)

- Schema/indexes/partial unique  
- Permission seed presence  
- Trigger SQL present for branch pairing  
- No metadata privilege assignment in helpers  

### 9.3 API

- Super Admin CRUD happy paths  
- Non-admin / customer / spoof header → 403/401  
- Missing branch for cashier → 422  
- Super-admin invite with null branch → 201  
- Accept provisions `/auth/me` principal correctly  
- Expired/revoked/replay → 410  
- Suspended inviter → 403  
- Outage → safe 503  

### 9.4 Security

- GET never returns token/hash  
- Accept ignores role/branch override attempts  
- Register path still customer-only  
- Customer principal cannot call admin invite APIs  

### 9.5 Regression

- `pnpm check`, `pnpm test:db`, `pnpm test:backend`, `pnpm build:website`  
- Catalog 58/13 unchanged  
- Existing customer `/auth/me` behavior preserved  

---

## 10. Definition of Done

### 10.1 Architecture DoD (before any code) — owner sign-off

- [ ] Lifecycle `draft/pending/accepted/revoked/expired` approved  
- [ ] **D1:** Super Admin–only inviters for 2B v1 (BM deferred) approved  
- [ ] Owner ≡ Super Admin (no new owner role) approved  
- [ ] **Single-branch invites only** (no multi-branch) approved  
- [ ] Rider uses same invite flow approved  
- [ ] Default expiry **72h** (max 168) approved  
- [ ] Super Admin may invite Super Admin (audited) approved  
- [ ] API paths under `/api/v1/admin/staff/invites` + accept path approved  
- [ ] Customer email conflict = reject approved  
- [ ] Out-of-scope list acknowledged  
- [ ] Implementation branch name reserved: `feature/sprint-3-staff-invites`  

### 10.2 Implementation DoD (after approval; agents)

- [ ] Migrations + APIs + tests + PR per governance  
- [ ] No catalog changes  
- [ ] Spoof-header tests green  
- [ ] Accept → `/auth/me` smoke documented  
- [ ] No production migrate until merge gate  

---

## 11. Owner decision card (blocking)

| ID | Question | Locked decision | Owner |
|---|---|---|---|
| D1 | Who may manage invites? | **DB-derived super-admin only** | ☑ |
| D2 | May Branch Manager invite? | **No** (defer 2B.1) | ☑ |
| D3 | Allowed invite roles? | BM / cashier / kitchen / rider / customer-support only — **no customer, no super-admin** | ☑ |
| D4 | Branch on invite? | **Exactly one operating branch** always | ☑ |
| D5 | Invite TTL? | **72h** (max 168) | ☑ |
| D6 | Resend rules? | Rotate token, refresh expiry, audit, **max 3/24h**; revoked → new invite | ☑ |
| D7 | Email delivery? | **`inviteUrl` once** to SA; hash-only at rest; never GET/log/audit raw token | ☑ |
| D8 | Accept UI? | **Yes** `/staff/accept` with read-only identity fields | ☑ |

Architecture decisions above are **locked** for this implementation PR.

---

## 12. Post-approval implementation sequence

```text
Owner approves D1–D8
    ↓
Create feature/sprint-3-staff-invites
    ↓
Migrations → Backend APIs → Accept page → Tests
    ↓
PR review → Merge
    ↓
Apply migrations → Redeploy API (+ website if UI)
    ↓
Production smoke: invite → accept → /auth/me
```

---

## 13. Related documents

| Doc | Role |
|---|---|
| `docs/architecture/AUTHENTICATION_ARCHITECTURE.md` | Canonical authz SSOT |
| `_documentation-audit/reports/SPRINT-03-CUSTOMER-STAFF-AUTH-ARCHITECTURE.md` | Earlier dual-journey plan |
| `_documentation-audit/reports/SPRINT-03.5-CLOSE.md` | Production close |

On privilege/identity conflicts, **canonical SSOT wins** until both are deliberately updated.

---

## 14. Agent stop line

Until owner approves this architecture (D1–D8):

- Do **not** create the feature branch  
- Do **not** write invite migrations/routes/UI  
- Do **not** apply production SQL  
- Do **not** start Slice 2C / 2D / POS unlock  
