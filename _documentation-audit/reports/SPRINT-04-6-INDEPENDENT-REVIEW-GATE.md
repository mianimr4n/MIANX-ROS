# Sprint 4.6 — Independent Release-Quality Review Gate

**Product:** Telepizza Pakistan · Powered by Mianx.ai  
**Branch:** `feature/sprint-4-6-restaurant-ops-foundation`  
**Reviewed commit:** `88c6eeb8d77562ae320e97dbbe4ba8ca01751f23` (`feat(ops): add Sprint 4.6 restaurant ops foundation`)  
**Base:** `origin/main` @ merge-base `52d7cef` (single commit ahead of main)  
**Reviewed:** 2026-07-19  
**Reviewer stance:** Independent inspection of code, tests, authz, and workflow — implementation report not trusted as evidence  
**Verdict:** `CHANGES REQUIRED`

---

## Executive summary

Sprint 4.6 delivers a usable staff ops shell (`/staff/login`, `/ops/*`), real rider/delivery APIs (legacy 501s removed), and order `dispatch` / `complete` transitions on the frozen status enum. Branch isolation for delivery IDs is enforced in the service layer. Required typecheck, full tests, and website build are green.

Release quality is **not** merge-ready: `git diff --check` fails on trailing whitespace in sprint docs; delivery↔order multi-entity updates are **not atomic** and order→delivery sync errors are unchecked; `order.manage` is used as a delivery-status shortcut that contradicts the seeded permission matrix (`delivery.update` omitted for branch-manager; kitchen/cashier never granted delivery.*); delivery authz/happy-path tests are essentially absent beyond 401 smoke and static string checks; dispatch/kitchen UI lacks double-submit guards; print is `window.print()` with only `print:hidden` controls.

No confirmed **cross-branch IDOR**. No customer→staff privilege grant. Those would have forced `BLOCKED`.

---

## Claimed flow verification

| Step | Happy path | Failure / edge path | Evidence |
|---|---|---|---|
| Customer order | Delivery checkout inserts `orders` + `deliveries` (`pending`) | Delivery insert failure rolls back order | `backend/api/src/services/orders/supabase.ts` |
| Staff receive/manage | `/ops/orders` + `GET/POST /api/v1/admin/orders…` with Bearer + `order.manage` | Customer / rider without `order.manage` → 403; wrong branch → 403 | `admin/orders.ts`, `management.ts`, Ops UI |
| Kitchen | Confirm creates kitchen ticket; KDS advances ticket and can mirror order `preparing`/`ready` | Cashier/rider denied kitchen RLS/API roles | DB-R5 + `kitchen/tickets.ts` + `/ops/kitchen` |
| Ready | Order `preparing`→`ready` via admin or kitchen mirror | Invalid from-status → 409 | `transitions.ts` |
| Assign rider | `POST /riders/deliveries/:id/assign` + roster; same-branch rider required | Inactive rider 409; other-branch rider 400; non-`delivery.assign` 403 at route | `operations.ts`, `riders/routes.ts` |
| Pickup / dispatch | Delivery `assigned`→`picked-up` mirrors order `dispatch` (`ready`→`dispatched`) | Concurrent conflict 409; idempotent replay if already at target | `operations.ts` + `planTransition` |
| Delivered / complete | Delivery `picked-up`→`delivered` mirrors order `complete` | Same as above | `operations.ts` |
| Customer tracking/history | Unchanged guest track + My Telepizza routes still wired | Not re-UAT’d in browser this review | App routes + existing website tests still pass |

**Operational caveat:** Staff can skip the rider lane and call admin `dispatch`/`complete`; those paths best-effort patch `deliveries` without checking Supabase errors. Kitchen ticket lane and order lane can diverge if staff only use one surface.

---

## Validation results (exact)

| Command | Result |
|---|---|
| `pnpm check` | **PASS** (website `tsc` + backend `tsc`) |
| `pnpm test` | **PASS** — DB/static **200/200**; backend Vitest **184/184** (24 files) |
| `pnpm --filter telepizza-pakistan build` | **PASS** (chunk warning: JS ~1010 kB / gzip ~291 kB) |
| `git diff --check` (`main...HEAD`) | **FAIL** — trailing whitespace in `docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md` (lines 3–6) and pre-existing-on-branch coordination doc if present in working tree; **on commit `88c6eeb` the sprint architecture doc fails `--check`** |
| Targeted: `orders-transitions.test.ts` | **PASS** (includes Sprint 4.6 dispatch/complete cases) |
| Targeted: `riders-auth.test.ts` | **PASS** (2× 401 smoke; asserts not `NOT_IMPLEMENTED`) |
| Targeted: `admin-orders.authz.test.ts` + `orders-management.test.ts` + `kitchen-tickets.authz.test.ts` | **PASS** (pre-existing; not delivery-ops matrix) |
| Targeted: `tests/website/sprint-4-6-ops-foundation.test.mjs` | **PASS** (4 static source assertions) |
| `supabase/migrations` in `origin/main...HEAD` | **None** (no hidden migrations in this commit) |

Do not treat green unit/static suites as end-to-end proof of the full restaurant loop against live Supabase.

---

## Review areas (1–16)

### 1. Scope integrity — PASS (with note)

- Commit `88c6eeb` touches ops UI, riders/deliveries service, order dispatch/complete, docs, thin tests only.
- **No** loyalty/wallet/inventory/finance/SaaS surfaces added.
- **No** new SQL migrations in the commit.
- Out-of-scope honesty preserved in ops copy (no fake payment rails).
- Note: local uncommitted files (`.tmp/`, other audit notes, dirty `LAUNCH-MODE-COORDINATION.md`) are **not** part of `88c6eeb` and must not be smuggled into the PR.

### 2. Authentication — PASS (minor UX gap)

- `/staff/login` uses shared Supabase password sign-in; principal loaded via `/auth/me` (Bearer).
- `/ops/*` gated in `OpsShell` by `isStaffPrincipal` (roles/permissions from API, not JWT metadata).
- Customer chrome (nav/cart) stripped for `/ops` and `/staff/login`.
- Gap: after successful `signIn`, StaffLogin always `setLocation("/ops")` without re-checking staff principal — customers land on a blocked ops interstitial (not a security bypass; API still 403).

### 3. Authorization — CHANGES REQUIRED (High design defect)

**Seeded matrix** (`20260713191000_seed_foundation_data.sql`):

| Role | Relevant permissions |
|---|---|
| branch-manager | `order.manage`, `delivery.read`, `delivery.assign` — **no** `delivery.update` |
| kitchen / cashier | `order.manage` — **no** `delivery.*` |
| rider | `delivery.read`, `delivery.update`, `order.read` — **no** `delivery.assign` |

**Code behavior** (`services/deliveries/operations.ts`):

- Assign / status updates allow `order.manage` **or** the matching `delivery.*` permission.
- HTTP assign/roster still require route middleware `delivery.assign` (kitchen cannot assign via API — good).
- HTTP `POST …/status` has **no** `requirePermission` middleware; service allows anyone with `delivery.update` **or** `order.manage`.

**Interpretation vs escalation:**

- Branch-manager lacking `delivery.update` but holding `order.manage` can still mark picked-up/delivered via riders status API — **seed intent is undermined** (seed implies BM assigns; riders/`delivery.update` or order `dispatch`/`complete` should own status).
- Kitchen/cashier with `order.manage` can also hit delivery status updates (and already can `complete` orders on admin routes). This is **role-lane bleed**, not cross-branch escalation.
- Rider cannot assign (route + permissions) — good.
- Customer-support with `delivery.read` can open Dispatch UI and see PII but cannot assign/update — UI still shows action buttons that 403.

**Owner decision needed:** Keep `order.manage` as delivery-status super-permission (document + tests), **or** remove the shortcut and align to seed (`delivery.update` only; BM uses admin dispatch/complete).

### 4. Branch isolation — PASS

- `assertBranchInScope` on assign/transition after load-by-id.
- List queries filter `branch_id IN principal.branchIds` (super-admin optional filter).
- Rider-only lists constrained to `riders.user_id = principal`.
- Cross-branch rider assign rejected (400).
- Order management retains prior branch checks (existing tests pass).

### 5. Order state machine — PASS

- Canonical statuses only; `dispatch` (`ready`→`dispatched`), `complete` (`ready`|`dispatched`→`completed`).
- Invalid transitions → `INVALID_ORDER_TRANSITION` / finals → `ORDER_ALREADY_FINAL`.
- Late cancel still BM/SA-gated.
- Idempotent no-op when already at target.
- Covered by `orders-transitions.test.ts`.

### 6. Kitchen / KDS usability — PASS with gaps

- Column board, elapsed time, large touch targets, 7s poll, fullscreen mode.
- Ticket→order mirror for preparing/ready (DB-R5) supports the claimed kitchen path.
- Gaps: no per-ticket busy/disable on advance (double-click); fullscreen is CSS overlay not Fullscreen API; no sound/priority alerts beyond border; kitchen vs orders dual-control can confuse floor staff.

### 7. Rider dispatch — PASS with High integrity flags

- Routes live: assignments, roster, assign, status — **no 501 stubs**.
- Roster/assign/status state machine: `pending→assigned→picked-up→delivered`.
- Order mirror on pickup/delivered.
- Gaps: non-atomic mirror (below); UI shows pickup/delivered to any dispatch viewer; no busy guards; no delivery-ops authz tests.

### 8. Transactions / multi-entity / idempotency — HIGH (CHANGES REQUIRED)

| Path | Behavior | Severity |
|---|---|---|
| Delivery status → order mirror | Delivery row updated **first**; then order update + audit log. Failure after delivery commit leaves **delivery ahead of order**. No DB transaction/RPC. | **High** |
| Order dispatch/complete → delivery patch | Order+log committed; delivery `update` awaited **without checking `error`**. Order can be `dispatched`/`completed` while delivery stays behind. | **High** |
| Assign rider | Single delivery update with status predicate; idempotent same-rider replay | OK |
| Transition idempotent replay | Same status returns `idempotentReplay: true` without second mirror | OK |

Partial multi-entity update without atomicity is a production integrity risk for the claimed end-to-end loop.

### 9. API quality — PASS (inventory)

Exact routes from code:

| Method | Path | Gate |
|---|---|---|
| GET | `/api/v1/admin/orders` | Bearer + `order.manage` |
| GET | `/api/v1/admin/orders/:id` | Bearer + `order.manage` |
| POST | `/api/v1/admin/orders/:id/{confirm\|reject\|preparing\|ready\|dispatch\|complete\|cancel}` | Bearer + `order.manage` |
| GET | `/api/v1/kitchen/tickets` | Bearer (+ kitchen service scope) |
| PATCH | `/api/v1/kitchen/tickets/:id/status` | Bearer (+ kitchen service scope) |
| GET | `/api/v1/riders/assignments` | Bearer; service needs `delivery.read` or `order.manage` |
| GET | `/api/v1/riders/roster` | Bearer + `delivery.assign` |
| POST | `/api/v1/riders/deliveries/:deliveryId/assign` | Bearer + `delivery.assign` |
| POST | `/api/v1/riders/deliveries/:deliveryId/status` | Bearer only at route; service enforces `delivery.update` or `order.manage` |

Zod validation present on bodies/queries. Error codes generally stable.

### 10. Frontend reliability — CHANGES REQUIRED (Medium)

- Polling: dashboard 10s, orders/dispatch 8s, kitchen 7s — acceptable for foundation; no shared backoff/jitter.
- Orders actions: `busy` flag — good.
- Dispatch assign/status + kitchen advance: **no in-flight disable** — double-submit risk.
- Deep links to `/ops/kitchen` or `/ops/dispatch` for unauthorized staff roles still render the page (nav hidden); rely on API 403 — acceptable if errors are clear (they mostly are).
- Staff login customer redirect — see §2.

### 11. Customer regression — PASS (automated)

- Customer routes (`/my-telepizza`, `/orders`, `/checkout`, `/track`) remain registered; ops chrome isolation avoids cart/nav pollution.
- Website static suite (including 4.5A / checkout / track) passed inside `pnpm test`.
- No intentional customer API changes in `88c6eeb`.
- **Not** browser-UAT’d in this review.

### 12. Print view — CHANGES REQUIRED (Low–Medium)

- `window.print()` on order detail; action buttons use `print:hidden`.
- **No** `@media print` stylesheet (dark zinc UI will print poorly; no dedicated ticket layout, no auto-hide shell chrome beyond button classes).
- Insufficient for production kitchen/ticket printing.

### 13. Security — PASS on blockers; High findings remain

| Finding | Sev | Block merge? |
|---|---|---|
| Cross-branch delivery/order access | — | **Not found** (scope checks present) |
| Customer accessing ops APIs | — | Denied (permissions + staff shell) |
| IDOR by delivery UUID across branches | Mitigated | No |
| `order.manage` → delivery status (kitchen/cashier/BM) | High (lane bleed / seed contradiction) | No (not cross-tenant); **fix before approve** |
| Assignments list exposes contact name/phone/address to `delivery.read` / `order.manage` | Medium (expected for ops; CS included) | No |
| Service role client bypasses RLS (API is enforcement point) | Accepted pattern | No — keep authz tests strong |
| PII in print / screen share | Low ops risk | No |

**Critical/High cross-branch or anonymous escalation:** none confirmed → not `BLOCKED`.

### 14. Performance — PASS (foundation)

- Polling only; ~3–4 staff clients × ~7–10s is fine for single-branch pilot.
- List limits capped (50–100).
- Watch for N open kitchen tablets + dashboard without ETag/conditional requests later.

### 15. Accessibility / operational UX — PASS with gaps

- Large touch targets, high-contrast kitchen columns, clear status chips.
- Gaps: icon-only semantics limited; error live regions not announced; select+assign without keyboard-focus management; dispatch buttons visible when unauthorized.

### 16. Tests — CHANGES REQUIRED (quality)

| Coverage | Assessment |
|---|---|
| `planTransition` dispatch/complete | Solid pure-unit coverage |
| Riders routes | **Only** unauthenticated 401 — no permission matrix, no branch isolation, no assign/status happy path, no mirror failure |
| Website sprint 4.6 | Static file string matches — **does not** prove runtime behavior |
| Delivery `operations.ts` | **No dedicated unit/integration tests** |
| Admin order authz | Exists for orders; BM fixture omits `delivery.assign` (pre-4.6) |

Counts are healthy overall; **Sprint 4.6-specific assurance is thin.**

---

## Production dependency buckets

### Code blockers (must fix or explicitly waive before merge)

1. Strip trailing whitespace so `git diff --check` is clean on the PR diff.
2. Resolve delivery authz model: remove `order.manage` shortcut for delivery status **or** document + test it as intentional; align seed (`delivery.update` for BM if status API is BM-facing).
3. Add tests: delivery assign/status authz matrix (BM / kitchen / rider / other-branch), and at least one mirror conflict/idempotency case.
4. Fix or explicitly accept non-atomic delivery↔order updates (prefer single RPC/transaction; at minimum check/propagate delivery sync errors on admin dispatch/complete).

### Config blockers

1. Supabase URL + service role + JWT secret for API readiness (`/readyz`).
2. Post-start table grants gap (known platform issue in `AGENTS.md`) if not already applied in the target environment.
3. CORS / app origin for staff browser sessions.

### Owner-data blockers

1. Active staff users with correct `user_roles` + branch assignments per role.
2. Rider roster rows (`riders`) linked to branch (and `user_id` for rider app accounts).
3. Operating branch data (Royal Orchard); Northern Bypass still coming-soon per docs.

### UAT blockers

1. Full happy-path UAT: place delivery order → confirm → kitchen → ready → assign → pickup → delivered → customer track/history.
2. Failure UAT: wrong-branch staff, rider updating another rider’s job, double-click assign, cancel mid-prep (BM-only).
3. Print from real device (thermal/browser).
4. Staff login with customer account (expect block, not ops data).

### Future-scope (not merge blockers for 4.6 foundation)

- Websockets / push; native KDS; JazzCash/EasyPaisa; automated customer notifications; inventory/loyalty/finance; multi-tenant SaaS; Fullscreen API; stronger print CSS.

---

## Findings summary

### Blocking for this gate (`CHANGES REQUIRED`)

1. **`git diff --check` FAIL** on sprint architecture doc trailing whitespace.
2. **Non-atomic / unchecked multi-entity updates** between `deliveries` and `orders` (High integrity).
3. **`order.manage` delivery-status shortcut** contradicts seeded `delivery.update` split; kitchen/cashier lane bleed (High authz design).
4. **Insufficient Sprint 4.6 delivery authz/flow tests** (High assurance gap).
5. **Dispatch/kitchen double-submit** unprotected (Medium reliability).
6. **Print view** incomplete for operations (Low–Medium).

### Non-blocking / acceptable for foundation

- Polling instead of websockets.
- No new migrations (correct for this slice).
- 501 rider stubs removed.
- Branch isolation present for inspected paths.
- Customer surfaces not regressing in automated suites.

---

## Final verdict

`CHANGES REQUIRED`

Do **not** merge until whitespace gate is green, delivery authz intent is fixed or owner-ratified with tests, and multi-entity update integrity is addressed or formally accepted with compensating ops procedure. Re-review after those land may move to `APPROVED FOR MERGE`. This is **not** `BLOCKED` — no confirmed cross-branch IDOR or customer privilege escalation was found.
)
