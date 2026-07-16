# Sprint 3 Slice 2B — Pre-Implementation Brief

**Status:** Approved for implementation · Slice 2B in progress on `feature/sprint-3-staff-invites`  
**Date:** 2026-07-16  
**Baseline:** `main` @ Sprint 3.5 CLOSED (auth foundation production-verified)  
**Canonical SSOT:** `docs/architecture/AUTHENTICATION_ARCHITECTURE.md`  
**Full freeze doc:** `docs/architecture/STAFF_INVITE_ARCHITECTURE.md`  
**Implementation branch (after approval only):** `feature/sprint-3-staff-invites`

This brief is the gate required by the Slice 2B implementation prompt.  
**Do not create the feature branch, migrations, APIs, or PR until this document is approved.**

---

## 0. Baseline confirmation

| Item | Status |
|---|---|
| Sprint 3.5 closed | ✅ |
| DB-backed `AuthPrincipal` | ✅ |
| Header spoof blocked | ✅ |
| Production auth migrations applied | ✅ |
| Canonical auth architecture on `main` | ✅ |
| `main` is source of truth | ✅ |
| Slice 2B code started | ❌ Not started (correct) |

---

## 1. Architecture review

### Goal

Admin-controlled **Staff Invitation System** so Super Admin / Owner can invite staff with a fixed role + required branch; invitee activates via email/password; no public staff registration.

### Trust model (unchanged from Slice 2A)

```text
Bearer JWT → getUser → AuthPrincipal (DB) → requirePermission / requireBranchAccess
```

- Never trust client `roleCode` / `branchId` on accept  
- Never use `x-telepizza-role`  
- Reuse `requireAuthenticatedUser` + `requirePermission`  
- Follow `AUTHENTICATION_ARCHITECTURE.md` invariants  

### Recommended product defaults (pending owner D1–D8)

| Default | Value |
|---|---|
| Who invites | Super Admin only (Owner ≡ Super Admin) |
| Branch Manager invites | Deferred to 2B.1 |
| Branches per invite | Exactly one (or null for super-admin) |
| Expiry | 72h (max 168h) |
| Rider | Same invite flow (`rider` + branch) |
| Delivery | API returns `inviteUrl` once (email later) |
| Accept UI | Minimal `/staff/accept` in implementation PR |

### Out of scope (hard stop)

Phone OTP, SMS, customer login changes, addresses, order/delivery RLS, Admin POS, dashboard redesign, menu/catalog changes.

---

## 2. Database design

### Tables

**`public.staff_invites`**

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `email`, `full_name`, `phone` | Invitee identity; email lowercased |
| `role_id` | FK → `roles` (not client free-text at accept) |
| `branch_id` | NULL only for `super-admin` role; else required |
| `status` | `draft` \| `pending` \| `accepted` \| `revoked` \| `expired` |
| `token_hash` | SHA-256 of raw token; null when cleared |
| `token_expires_at` | UTC |
| `invited_by`, `accepted_user_id` | FK → `users` |
| `send_count`, `sent_at`, `last_sent_at`, `accepted_at`, `revoked_at` | Lifecycle |
| `metadata` | Non-secret only |
| `created_at`, `updated_at` | Audit timestamps |

**`public.staff_invite_events`** (append-only audit)

`invite_id`, `actor_user_id`, `event_type`, `payload` (no secrets), optional `ip` / `user_agent`, `created_at`.

### Indexes / constraints

- Partial unique: one `pending` invite per `lower(email)`  
- Unique `token_hash` where not null  
- Indexes on `status`, `branch_id`, `lower(email)`  
- Trigger: role `super-admin` ⇔ `branch_id IS NULL`; else `branch_id NOT NULL`  

### RLS

- No anon/authenticated writes  
- API uses service role / SECURITY DEFINER accept helper  

### Accept vs Slice 1 bootstrap

New auth users still hit customer bootstrap trigger. Accept transaction must:

1. Create Auth user (service role, email confirmed)  
2. Set `user_type` + `status=active`  
3. Remove `customer` role if present  
4. Insert invite `role_id` + `branch_id` only  
5. Mark invite `accepted`; clear `token_hash`  

---

## 3. API contract

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/v1/admin/staff/invites` | JWT + `staff.create` (+ `staff.assign_role`) |
| `GET` | `/api/v1/admin/staff/invites` | JWT + `staff.read` |
| `GET` | `/api/v1/admin/staff/invites/:id` | JWT + `staff.read` |
| `POST` | `/api/v1/admin/staff/invites/:id/send` | JWT + `staff.create` |
| `POST` | `/api/v1/admin/staff/invites/:id/resend` | JWT + `staff.create` |
| `POST` | `/api/v1/admin/staff/invites/:id/revoke` | JWT + `staff.create` |
| `POST` | `/api/v1/auth/staff/invites/accept` | Invite token (no JWT privilege) |

Sketch aliases (`/staff/invites`) map to the `/api/v1/...` paths above.

### Lifecycle

```text
draft → pending (send) → accepted (accept)
pending → revoked | expired
resend (pending): rotate token + refresh expiry
```

### Errors

`UNAUTHORIZED` · `FORBIDDEN` · `USER_ACCESS_DISABLED` · `INVITE_CONFLICT` · `INVITE_NOT_ACCEPTABLE` · `VALIDATION_ERROR` · `RATE_LIMITED` · `AUTH_PROFILE_TEMPORARILY_UNAVAILABLE`

### Token rules

- ≥32-byte CSPRNG · hash-only at rest · single-use · returned raw at most once on send/resend · never on GET  

---

## 4. Migration plan

Forward-only, idempotent, no catalog changes:

| Order | Migration (suggested) | Purpose |
|---|---|---|
| 1 | `…_sprint3_slice2b_staff_permissions.sql` | Upsert `staff.create`, `staff.assign_role`; grant to `super-admin` only |
| 2 | `…_sprint3_slice2b_staff_invites.sql` | Tables, indexes, triggers, RLS, grants |
| 3 | `…_sprint3_slice2b_accept_helper.sql` | Optional SECURITY DEFINER accept helper |

Rules:

- `BEGIN`/`COMMIT` + verification + rollback comments  
- Preserve existing auth behavior  
- **No production apply** until PR merge + release gate  
- Do not touch v1.2.0 menu/pricing/catalog/toppings  

---

## 5. Test plan

| Layer | Cases |
|---|---|
| Unit | Token hash, expiry caps, state transitions, branch/role pairing |
| DB static | Schema, partial unique, permission seed, trigger presence |
| API | Super Admin CRUD; non-admin/customer/spoof header denied; branch required; accept provisions principal; expired/revoked/replay → 410 |
| Security | No token/hash on GET; accept ignores body role/branch; register stays customer-only |
| Regression | `pnpm check`, `pnpm test:db`, `pnpm test:backend`, `pnpm build:website`; catalog 58/13 |

---

## 6. Owner approval card (required)

| ID | Decision | Recommendation | Approve? |
|---|---|---|---|
| D1 | Branch Manager may invite in 2B v1? | **No** | ☐ |
| D2 | Owner identity | **≡ Super Admin** | ☐ |
| D3 | Multi-branch per invite? | **No** | ☐ |
| D4 | Invite TTL | **72h** (max 168) | ☐ |
| D5 | Rider onboarding | **Same invite flow** | ☐ |
| D6 | Invite another Super Admin? | **Yes** (audited) | ☐ |
| D7 | Accept UI in first PR? | **Yes** `/staff/accept` | ☐ |
| D8 | Email provider in 2B? | **API inviteUrl only** | ☐ |

Also confirm:

- [ ] Scope / out-of-scope accepted  
- [ ] API paths accepted  
- [ ] DB + security model accepted  
- [ ] Branch name `feature/sprint-3-staff-invites` accepted  

---

## 7. After approval — implementation order (agents)

1. Create branch `feature/sprint-3-staff-invites` from latest `main`  
2. Small commits: migrations → permissions wiring → invite service/APIs → accept flow → minimal accept UI → tests → docs  
3. Run full validation suite  
4. Open PR to `main`  
5. **Stop** — no merge, no push to `main`, no production migration/deploy  

### PR gate checklist

- [ ] Tests pass  
- [ ] Migrations verified (local/static)  
- [ ] Documentation updated  
- [ ] Security review passes (spoof, token, accept override)  

### Deliverables

Migrations · backend APIs · middleware usage · tests · documentation · PR report  

---

## 8. Stop line (now)

**WAITING FOR APPROVAL.**

Until D1–D8 (and scope) are approved:

- Do not create `feature/sprint-3-staff-invites`  
- Do not write invite migrations/code  
- Do not open a PR  
- Do not start Slice 2C / 2D  

Full detail: `docs/architecture/STAFF_INVITE_ARCHITECTURE.md`
