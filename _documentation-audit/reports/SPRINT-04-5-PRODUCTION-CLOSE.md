# Sprint 4.5 — Branch Order APIs — Production Close

**Scope:** Production rollout + verification of Sprint 4.5 branch-scoped order management APIs only.  
**Not in scope:** Sprint 4.6 Rider/Delivery, Kitchen UI, POS, Admin UI, OTP, catalog/menu changes.

| Field | Value |
|---|---|
| PR | [#53](https://github.com/mianimr4n/telepizza/pull/53) |
| Merge SHA | `7f8ecce0d3424d609dc09c4fc08a5ecd2e8fcd05` |
| Deployed API SHA | `7f8ecce0d3424d609dc09c4fc08a5ecd2e8fcd05` (GitHub deployment `main - telepizza-api`, state **success**) |
| Production website deploy | **Not required** for 4.5 (backend/API only). Vercel Production also recorded the merge SHA; no website code change in PR #53. |
| Migration | **None** — Sprint 4.5 reused existing `order.manage` / role mappings. No pending migration. |
| API | `https://telepizza-api.onrender.com` |
| Close date | 2026-07-16 |

---

## Phase 1 — Deploy verification

| Check | Result |
|---|---|
| Render API running PR #53 merge SHA | ✅ GitHub deployment environment `main - telepizza-api` → SHA `7f8ecce…`, status **success** (deploy `dep-d9civ6cvikkc73d9klsg`) |
| `GET /healthz` | ✅ **200** |
| `GET /readyz` | ✅ **200** (`issues: []`, Supabase URL wired) |
| DB migration pending for 4.5 | ✅ **None** |
| Website redeploy required | ✅ **No** (shared website code unchanged) |
| Admin orders surface live | ✅ `GET /api/v1/admin/orders` → **401 UNAUTHORIZED** (route mounted; auth required) |

---

## Endpoint matrix (`/api/v1/admin/orders`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Branch-scoped list (`status`, `orderType`, `branchId`, `limit`, `offset`) |
| GET | `/:id` | Branch-scoped detail + status history (safe projection) |
| POST | `/:id/confirm` | `pending → confirmed` |
| POST | `/:id/reject` | `pending`/`confirmed` → `cancelled` + `rejected_by_branch` |
| POST | `/:id/preparing` | `confirmed → preparing` |
| POST | `/:id/ready` | `preparing → ready` |
| POST | `/:id/cancel` | Staff cancel; reason required; late cancel BM/SA only |

Authz: Bearer → DB `AuthPrincipal` → `order.manage` → branch scope from `branchIds` / super-admin.  
Never trust `x-telepizza-role`, `x-telepizza-branch-id`, body role/branch, or JWT metadata.

---

## Phase 2 — Production staff persona smoke

Short-lived auth users + `public.users` / `user_roles` + tagged orders (`S45-SMOKE …`) created against production Supabase, exercised via Render API, then deleted.

| Persona | Result |
|---|---|
| Super-admin — list across both branches | ✅ |
| Super-admin — detail | ✅ (no secrets / provider payloads) |
| Super-admin — confirm / reject / preparing / ready / cancel | ✅ |
| Royal Orchard BM — own-branch only; NB detail denied | ✅ `ORDER_ACCESS_DENIED` |
| Royal Orchard BM — confirm / reject / preparing / ready / late cancel | ✅ |
| Northern Bypass BM — inverse isolation | ✅ |
| Cashier — own-branch confirm/preparing/ready; late cancel denied | ✅ `ORDER_ACCESS_DENIED` |
| Kitchen — own-branch lifecycle actions; NB denied | ✅ |
| Customer — all admin order endpoints denied | ✅ `FORBIDDEN` |
| Rider — all branch-management endpoints denied | ✅ `FORBIDDEN` |
| Suspended staff | ✅ `403 USER_ACCESS_DISABLED` |
| Spoof headers (`x-telepizza-role` / `x-telepizza-branch-id`) | ✅ no effect (still denied) |

---

## Phase 3 — Transition / audit / concurrency

| Check | Result |
|---|---|
| `pending → confirmed` | ✅ |
| `pending → rejected/cancelled` + `rejected_by_branch` | ✅ |
| `confirmed → preparing` | ✅ |
| `preparing → ready` | ✅ |
| Approved cancellation paths | ✅ |
| Required reason validation | ✅ `400 VALIDATION_ERROR` |
| Invalid transition rejected | ✅ `409 INVALID_ORDER_TRANSITION` |
| Final state protected | ✅ `409 ORDER_ALREADY_FINAL` |
| Duplicate transition → no duplicate log | ✅ `idempotentReplay:true`, log count unchanged |
| Concurrent dual-confirm | ✅ one winner + idempotent replay (safe; no lost corrupt state) |
| Audit log actor / from / to / reason | ✅ `actor_type=staff`, `actor_user_id` set |
| No secrets in response or audit rows | ✅ |

---

## Phase 4 — Regression

| Check | Result |
|---|---|
| Guest quote / create / track | ✅ |
| Authenticated create | ✅ |
| Idempotency replay + 409 conflict | ✅ `IDEMPOTENCY_CONFLICT` |
| Customer own-order RLS (PostgREST) | ✅ customer select ok; anon leaked **0** rows |
| Staff invites endpoint | ✅ reachable for SA (`200`) |
| `/auth/me` (customer + SA) | ✅ |
| Customer profile/phone E.164 | ✅ `03…` → `+923…` |
| Google + email auth pages | ✅ `/login` `/register` `/account` **200** |
| Catalog freeze | ✅ **13 / 58 / 3 / 40 / 7** |
| Branches | ✅ **2** (RO operating, NB coming-soon) |
| WhatsApp ordering number | ✅ **0304-1110495** |
| Website checkout | ✅ `/checkout` **200** |

---

## Phase 5 — Cleanup

| Item | Result |
|---|---|
| Temporary auth users deleted | ✅ |
| Temporary `public.users` / `user_roles` / customers deleted | ✅ |
| Temporary orders / order_items / status logs / deliveries / payments deleted | ✅ |
| Leftover tagged users after cleanup | ✅ **0** |
| Pre-existing production rows | ✅ Untouched (only `S45-SMOKE` / `s45.*@telepizza.smoke` artifacts removed) |

---

## Known limitations

- Dispatch / delivered / completed remain Sprint **4.6** (delivery lane).
- `order_status_logs` has no actor-role snapshot column (role derivable from `actor_user_id`).
- Per-transition finer RBAC beyond frozen `order.manage` + BM/SA late-cancel was intentionally not added.
- Concurrent `confirm` vs `reject` can both succeed when reject remains valid from `confirmed` (by frozen matrix); dual-confirm is the conflict/idempotency proof used in production smoke.

---

## Next unlocked phase

**Sprint 4.6 — Rider / Delivery APIs** (assign + dispatch / delivered), after owner approval. Do not start Kitchen UI, POS, Admin UI, or OTP in that slice unless separately scoped.

---

## Evidence summary

Production smoke matrix: **63 / 63 PASS** (persona + transition + regression + cleanup).  
Implementation report: `_documentation-audit/reports/SPRINT-04-5-BRANCH-ORDER-APIS.md`.

---

SPRINT 4.5 — BRANCH ORDER APIS: PASS AND CLOSED
