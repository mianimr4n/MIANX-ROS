# Sprint 3 Slice 1 — PR Review Report

| Field | Value |
|---|---|
| Branch | `feature/sprint-3-auth` |
| Commit | `141de83` — `feat(auth): add Sprint 3 Slice 1 customer auth foundation` |
| Baseline freeze | Release **v1.2.0** @ `697554a` |
| Review type | Complete PR + security + migration + auth flow + RLS + trigger + middleware + website session + v1.2.0 regression + production readiness |
| Code changes in this review | **None** (report only) |
| Review date | 2026-07-16 |

---

## Critical issues

**None.**

---

## High issues

### H1 — Legacy `x-telepizza-role` still gates admin/rider stubs
- **Where:** `backend/api/src/common/http.ts` → `requireRole`; used by admin/riders routes
- **Why:** Clients can spoof the header and pass the coarse gate. `/auth/me` correctly ignores it; stubs still return **501**, so customer impact today is limited.
- **Merge impact:** **Non-blocking** for Slice 1 customer auth. **Must be removed before any real admin/rider handler ships** (becomes Critical then).

### H2 — `/auth/me` does not enforce `public.users.status`
- **Where:** `backend/api/src/services/auth/supabase.ts`, `modules/auth/routes.ts`
- **Why:** Suspended/inactive profiles still receive a successful `/me` if the JWT is valid. Migration protects status from client writes, but the API never gates on it.
- **Merge impact:** **Non-blocking** for Slice 1 (lockout deferred). Track for Slice 2+ session/account management.

---

## Medium issues

### M1 — SECURITY DEFINER bootstrap trusts `p_auth_user_id` by EXECUTE grant alone
- **Where:** `ensure_customer_profile_for_auth_user` in migration
- **Mitigation today:** `REVOKE` from `PUBLIC`; `GRANT EXECUTE` only to `service_role`; `search_path = public`
- **Risk:** Future EXECUTE grants to `authenticated`/`anon` would allow profile minting for arbitrary auth users
- **Merge impact:** Non-blocking; harden before broadening EXECUTE

### M2 — RLS UPDATE is row-scoped, not column-scoped
- **Where:** `"Users can update own allowed profile fields"`
- **Why:** Own-row update can change `email`/`phone`/`full_name`/`last_login_at` (unique squatting possible). Triggers block `user_type` / `auth_user_id` / `password_hash` / authenticated `status` changes.
- **Merge impact:** Non-blocking until phone linking / profile edit Slice

### M3 — Backfill labels orphan auth users as customers
- **Where:** Migration section 6A/6B
- **Why:** Correct for Slice 1 website customers; empty-role “staff-ish” pre-links would get customer. Profiles with existing roles are preserved (good).
- **Merge impact:** Non-blocking if prod has no unfinished staff auth links (expected)

### M4 — Client synthesizes `roles: ["customer"]` when API base URL unset
- **Where:** `AuthContext.tsx` when `!isApiConfigured`
- **Why:** Display fallback only; must never become authorization source
- **Merge impact:** Non-blocking

### M5 — Unmapped Supabase errors may surface vendor text
- **Where:** `auth-utils.ts` `mapSupabaseAuthError` fallback
- **Why:** Common login/register cases are sanitized; unknown messages can leak internals
- **Merge impact:** Non-blocking

---

## Low issues

| ID | Topic | Note |
|---|---|---|
| L1 | Invoker privilege triggers lack `SET search_path` | Lower risk than DEFINER; inconsistent hardening |
| L2 | `user_roles` mutation trigger only rejects `authenticated` | Relies on RLS absence of write policies for others |
| L3 | Full `roles` catalog readable by authenticated | Disclosure of staff role codes only |
| L4 | `getMe` selects unused `password_hash` | Not returned; tighten select list later |
| L5 | Password policy = min 8 | Relies on Supabase for real enforcement |
| L6 | Offline fallback uses auth UUID as `profile.id` | Wrong namespace vs `public.users.id` if later used as FK |

---

## Security review

### Strengths
- Metadata never trusted for `role` / `user_type`; only safe `full_name` / `name`
- Bearer verification via `supabase.auth.getUser(accessToken)` — no second password stack
- `/auth/me` roles loaded from DB by verified `authUserId`; header spoof ignored
- Profile load failures → `503 AUTH_PROFILE_TEMPORARILY_UNAVAILABLE` without vendor leakage
- Missing profile (valid JWT) → `200` + `profileReady: false` (retryable race-safe)
- Triggers block privilege escalation fields; authenticated cannot mutate `user_roles`
- Partial unique index closes NULL-`branch_id` duplicate customer roles
- Website: Google OAuth disabled; generic invalid-credentials; generic register-already-exists wording
- Service role never in frontend bundle

### Residual accepted debt
- H1 header role gate on 501 stubs
- H2 status not enforced on `/me`
- M1–M5 as above

**Security posture for Slice 1 customer auth: acceptable for merge.**

---

## Migration review

**File:** `supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql`

| Check | Result |
|---|---|
| Forward-only, transactional `BEGIN`/`COMMIT` | PASS |
| Customer role seed idempotent | PASS |
| `AFTER INSERT` on `auth.users` | PASS |
| SECURITY DEFINER + pinned `search_path` on bootstrap | PASS |
| No recursive auth↔users loop | PASS |
| No `public.customers` insert | PASS |
| `password_hash = null` for Supabase users | PASS |
| Idempotent backfill A/B/C | PASS |
| Staff role sets preserved (C) | PASS |
| RLS own-row read/update; no auth writes on `user_roles` | PASS |
| Verification / rollback comments | PASS |

**Not applied to production yet** — required as a controlled post-merge step (see production risks).

---

## API review

| Endpoint / concern | Result |
|---|---|
| `GET /api/v1/auth/me` Bearer required | PASS |
| Invalid/missing token → 401 | PASS |
| Profile missing → 200 + `profileReady: false` | PASS |
| Profile load failure → 503 safe code | PASS |
| Roles from DB only | PASS |
| Deprecated `POST /login`, `/refresh` → 501 | PASS |
| No secrets in responses | PASS |
| Tests (`auth.test.ts`) cover happy/401/503/spoof | PASS |

---

## Website review

| Concern | Result |
|---|---|
| Supabase Auth email/password register/login | PASS |
| Optional `full_name` only in signup metadata | PASS |
| Session restore + single `onAuthStateChange` + cleanup | PASS |
| Failed `/auth/me` does not clear Supabase session | PASS |
| Logout clears identity key only; cart preserved | PASS |
| Confirm-email required state | PASS |
| Google OAuth absent | PASS |
| Account/Checkout/Orders tolerate null phone | PASS |
| Anonymous menu/cart providers still wired | PASS |

---

## Production risks

| Risk | Mitigation / sequence |
|---|---|
| Migration not applied before traffic hits signup | Apply migration **after** merge, **before** relying on production registration |
| Redeploy race (code live, DB not backfilled) | Follow order below; expect `profileReady: false` briefly if race |
| Email confirm / redirect URLs misconfigured | Owner: Supabase Auth Site URL + Vercel/localhost redirects |
| Google OAuth accidentally enabled in dashboard | Keep disabled for Slice 1 |
| CORS / `VITE_API_BASE_URL` missing | Render + Vercel env check before smoke |
| Staff backfill edge cases | Prod has no unfinished staff `auth.users` links expected |

### Required post-merge tab sequence (owner)
1. PR create (if not already)
2. Self review (this report)
3. Merge → `main`
4. Production migration apply (`20260716010000_sprint3_customer_auth_foundation.sql`)
5. Render API redeploy
6. Vercel website redeploy
7. Login/Register smoke test
8. `/auth/me` verify (Bearer)
9. Sprint 3 Slice 1 close

---

## v1.2.0 regression review

| Check | Result |
|---|---|
| Menu/pricing/catalog/toppings migrations touched | **None** |
| Catalog visibility / customizer / cart-config touched | **None** |
| Deployment configs (`.vercel`, Render) touched | **None** |
| Files in PR | Auth foundation only (20 files; website auth pages + API auth + migration + tests + `package.json` test glob) |

**v1.2.0 menu catalog freeze: unaffected.**

---

## PASS / FAIL recommendation

### **PASS**

No Critical issues. High items are accepted Slice 1 debt (501 stub header gate; deferred status enforcement) and do not block customer-auth merge.

Ready for PR merge.
