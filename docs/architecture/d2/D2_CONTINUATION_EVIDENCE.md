# D2 Continuation — Opening-Critical Backend Evidence

**Status:** Corrective pass complete — READY FOR FOUNDER AND ARCHITECT REVIEW  
**Release Evidence:** Local runtime + live DB atomicity recorded (not production deploy)  
**Browser Runtime Verification:** API-backed Journeys A–E executed locally; full Playwright UI disconnect induction for Journey E remains a documented limitation  

**Branch:** `feature/aug14-multibranch-opening-readiness`  
**Base commit:** `fea1ae7`

## Branch status policy (canonical)

Schema values: `operating` | `coming-soon` | `inactive`  
(no `suspended` value exists)

| Action class | Rule | Code |
| --- | --- | --- |
| Live POS create | Branch must be `operating` + membership | `BRANCH_NOT_OPERATIONAL` / `BRANCH_INACTIVE` / `BRANCH_ACCESS_DENIED` |
| Order / kitchen / delivery transitions | Branch must be `operating` + membership | same |
| Quote / guest create | Branch must be `operating` | `QUOTE_BRANCH_UNAVAILABLE` / `BRANCH_NOT_OPERATIONAL` |
| Admin readiness inspect | Super-admin: all statuses; assigned BM: operating + coming-soon | `BRANCH_ACCESS_DENIED` |
| Public `orderSource=pos\|admin` | Rejected | `POS_AUTH_REQUIRED` |

Evidence: `backend/api/src/services/branches/operational-status.ts`, `lookup.ts`, wired into kitchen, delivery, order transitions, POS create.

## Authenticated POS

- Route: `POST /api/v1/admin/pos/orders`
- Requires: Bearer + `order.manage` + branch membership + operating status
- Reuses server pricing + idempotency from `orders/supabase.ts`
- Frontend `AdminPos` uses `createAdminPosOrder` (no longer public `/orders` with `orderSource:pos`)
- Tests: `backend/api/tests/pos-isolation.d2.test.ts`

## True atomic order creation

| Item | Value |
| --- | --- |
| Migration | `supabase/migrations/20260725050000_d2_atomic_order_create.sql` |
| RPC | `public.create_order_atomic(...)` |
| Order number helper | `public.next_order_number()` + sequence `orders_number_seq` |
| Execute grant | `service_role` only |
| Compensating deletes | Removed from `createOrder` path |

### Transaction boundary

Single PostgreSQL function transaction covers:

1. Idempotency lookup / conflict
2. Branch operating gate
3. `orders` insert
4. `order_items` inserts
5. `order_item_modifiers` inserts
6. Optional `deliveries` insert
7. Optional pending `payments` insert
8. `order_status_logs` insert
9. Optional `kitchen_tickets` + `kitchen_ticket_items` (POS/admin confirmed path)

API prices the cart in Node; RPC persists the validated snapshot. Client totals are not authoritative for catalog pricing.

### Idempotency

- Same key + same request hash → original result (`idempotentReplay: true`)
- Same key + different hash → `IDEMPOTENCY_CONFLICT` (409)
- Concurrent unique-key race reloads existing row

### Rollback / live tests

Command: `node scripts/d2/atomic-order-live-tests.mjs`  
Evidence: `docs/testing/acceptance-evidence/d2-atomic-order-live.json`  
Result: **14/14 PASS** including forced failures with zero partial rows:

- pickup / delivery success
- force-fail order_item / modifier / kitchen / delivery (GUC `telepizza.d2_test_mode=on`)
- invalid menu / modifier FK rollback
- unknown + coming-soon branch rejection
- idempotent replay + conflict
- concurrent order-number uniqueness (20 unique)
- priced total persistence

Static contract: `tests/database/d2-atomic-order-create.test.mjs`  
Service wiring: `backend/api/tests/atomic-order-create.d2.test.ts`

### Rollback notes (migration header)

Manual drop of function/sequence only — does **not** drop business tables or production rows.  
Test failure injection honored only when `telepizza.d2_test_mode=on`.

## Local environment (variable names only)

Created (gitignored): `backend/api/.env.local`, `apps/website/.env.local` via `scripts/write-local-env-from-supabase.mjs`.

Names used (values not recorded here):

- `TELEPIZZA_ENV`
- `API_JWT_SECRET`
- `API_PORT`
- `API_CORS_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEPIZZA_REQUIRE_LOCAL_SUPABASE`
- `TELEPIZZA_EMAIL_MODE` / `TELEPIZZA_WHATSAPP_MODE` / `TELEPIZZA_PAYMENT_MODE` / `TELEPIZZA_WEBHOOK_MODE`
- Website: `VITE_API_BASE_URL` (and related Vite public keys from writer)

Git ignore confirmed for `.env.*` / `.env*`.

## Local services started / verified

| Service | Port | Result |
| --- | --- | --- |
| Supabase local (Postgres + Kong/Auth/REST) | 54321 / 54322 | Up (existing stack) |
| Backend API | 4000 | `/healthz` 200, `/readyz` 200, `envClass=local` |
| Website (Vite) | 3000 | GET `/` 200 |
| Migration apply | — | `create_order_atomic` present locally |

## Controlled two-branch fixture

- Script: `scripts/d2/fixture-two-branch.mjs` (`up` / `down`)
- Production guard: refuses `*.supabase.co` and non-loopback hosts; refuses production env class
- Activates `northern-bypass=operating` **only** inside fixture `up`
- Restored after journeys: `down` → `northern-bypass=coming-soon` (verified)
- Credentials: gitignored `scripts/.tmp_pw/d2-two-branch.fixture.json`
- Identities: `d2-test.*@telepizza.test` cashier/kitchen/rider/BM per branch + multi-branch manager

## Browser / runtime journeys

Command: `node scripts/d2/runtime-journeys.mjs`  
Evidence: `docs/testing/acceptance-evidence/d2-runtime-journeys.json`  
Result: **JOURNEYS_OK=true**

### Branch IDs

- Royal Orchard: `380b6efe-33d0-47b4-909c-e36d184da34b`
- Northern Bypass: `d3403e15-4850-4927-b5ca-f414bd43fd77`

### Journey A — Royal Orchard pickup — PASS

- Roles: D2 test cashier / kitchen / BM (royal-orchard)
- Sample order: `TP-260724-000063` / id `ba4f74e2-ed1e-4a99-b265-245e96f7b681`
- POS create request id: `6b1b9703-a410-4632-aa84-46352a73dc11` (201)
- Kitchen ticket persisted; transitions accepted → preparing → ready → completed
- Orders list + dashboard + persistence after reload verified

### Journey B — Northern Bypass test mode — PASS

- Fixture-only operating northern-bypass
- Order branch = northern; Royal Orchard staff denied detail / no KDS leak
- Multi-branch manager dashboard OK
- Production seed restored to `coming-soon` after run

### Journey C — Delivery — PASS

- Delivery create + kitchen complete + same-branch rider assign
- Cross-branch rider assign rejected
- picked-up → delivered; dashboard updated

### Journey D — Cross-branch attacks — PASS

All unauthorized operations failed server-side (forged/unknown branch, cross-create, cross-read, cross-ticket update, omitted filter leak check, spoofed branch query, public `orderSource=pos` bypass). Request IDs recorded in evidence JSON (tokens omitted).

### Journey E — Failure semantics — PASS WITH LIMITATIONS

- Canonical op-status states + categorizeApiError contract verified in source
- Live successful dataset, empty/list success, 401, 403 verified
- Induced browser 5xx / timeout / offline disconnect **not** fully automated in this harness (limitation recorded in evidence JSON)

## Branch readiness API

Recorded in journey evidence under `readiness` (owner/multi-manager token).  
Production northern-bypass remains **BLOCKED** / **READY WITH LIMITATIONS** for business inputs — fixture pass does **not** flip production readiness.

## Verification commands and totals

| Command | Result |
| --- | --- |
| `pnpm check` | PASS |
| `pnpm build:website` | PASS |
| `pnpm test:db` | PASS — 433/433 |
| `pnpm --filter @telepizza/api exec vitest run --pool=forks --maxWorkers=1 --fileParallelism=false` | PASS — 35 files / 268 tests |
| `pnpm test` (default vitest pool) | Worker fork crash once (260 passed then exit 1) — re-run single-worker PASS |
| `node --test tests/database/d2-atomic-order-create.test.mjs` | PASS — 5/5 |
| `node --test tests/website/d2-multibranch-operational-reliability.test.mjs` | PASS — 27/27 |
| `node scripts/d2/atomic-order-live-tests.mjs` | PASS — 14/14 |
| `node scripts/d2/runtime-journeys.mjs` | PASS |
| `git diff --check` | PASS |

## Middleware

`requireBranchAccess` marked `@deprecated` NON-CANONICAL. Service layer remains authoritative.

## Remaining runtime limitations

1. Journey E full browser network-loss / induced 5xx UI not Playwright-automated.
2. Default Vitest worker pool can flake on this Windows host; single-worker run is green.
3. Production northern-bypass opening still blocked on founder business inputs (phone, hours, named staff, tax/zones, status flip date, on-site dry run).
4. Deployment not authorized in this pass.

## Final decision (this pass)

**READY FOR FOUNDER AND ARCHITECT REVIEW**
