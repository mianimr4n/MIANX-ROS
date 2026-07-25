# D3 — Floor Plan, Tables, Dine-In & Reservation System

> Status: **READY WITH LIMITATIONS** for founder/architect review (branch `feature/aug14-dinein-table-reservations`).
> Stacked on D2 (`3106b35`). **Future D3 PR must not merge before D2.**
> Not merged, not deployed. Browser Journeys F–K + public booking + failure-state +
> Northern Bypass isolated E2E executed locally. Northern Bypass production remains **BLOCKED**.

This document is the canonical reference for the D3 slice: requirements, technical
design, domain model, state machines, concurrency strategy, migrations, API
contracts, RBAC matrix, audit model, test/runtime evidence, rollback plan, the
second-branch setup checklist, and operating runbooks.

---

## 1. Scope & non-goals

**In scope:** floor configuration, service areas, physical tables, permitted table
combinations, reservations (with availability/conflict engine), waitlist, dining
sessions, table/server assignment, atomic seating/transfer/close, dine-in POS
order linkage, live floor console, host/waiter/manager/owner surfaces, a
provider-independent notification outbox, and operational reports.

**Non-goals (explicitly excluded):** hotel room booking, event-venue management
beyond blackouts, full payment gateway, CRM marketing automation, a real
WhatsApp/SMS provider, payroll, accounting ledger, inventory ledger, supplier
purchasing backend, kiosk, unrelated route redesign, platform multi-tenancy.

---

## 2. Canonical terminology

| Term | Meaning |
| --- | --- |
| **Floor** | Branch-specific physical level (`restaurant_floors`). |
| **Service Area** | Logical area within a floor — hall, terrace, VIP (`service_areas`). |
| **Table** | Physical dine-in table (`restaurant_tables`, extended). |
| **Table Combination** | Permitted grouping of ≥2 tables (`table_combinations`). |
| **Reservation** | Future booking (`reservations`). |
| **Waitlist Entry** | Guest waiting without a confirmed table (`waitlist_entries`). |
| **Dining Session** | Live visit after seating (`dine_in_sessions`, extended). |
| **Table Assignment** | Session↔table link (`dining_session_tables`). |
| **Server Assignment** | Waiter responsible for a session (`dining_session_servers`). |

Reservation and Dining Session are never used interchangeably.

---

## 3. Domain model (migrations)

Migrations (additive, rollback-aware):

- `supabase/migrations/20260725100000_d3_floor_dinein_reservations.sql`
- `supabase/migrations/20260725101000_d3_pos_dinein_order_link.sql`

### Tables created / extended

| Object | Notes |
| --- | --- |
| `restaurant_floors` | branch-scoped; `unique (branch_id, code)`. |
| `service_areas` | floor-scoped; branch-match trigger. |
| `restaurant_tables` *(extended)* | + `floor_id`, `service_area_id`, `capacity_min/max`, `shape`, `position_x/y`, `width`, `height`, `rotation`, `is_accessible`, `high_chair_supported`, `operational_status`. Legacy `status` preserved via `d3_legacy_table_status`. |
| `table_combinations` / `table_combination_members` | branch-scoped; capacity derived from members. |
| `branch_booking_policies` | booking rules per branch (interval, duration, advance, cutoffs, deposit rules). |
| `service_blackouts` | branch/floor/area closure windows. |
| `reservations` | `next_reservation_number()` → `RES-YYMMDD-NNNNNN`. |
| `reservation_table_assignments` | `tstzrange` + GiST exclusion (see §6). |
| `waitlist_entries` | ordered queue. |
| `dine_in_sessions` *(extended)* | + `session_number`, `service_status`, `reservation_id`, `waitlist_id`, `primary_server_user_id`, `party_size`, `guest_name`, `seated_at`, `first_order_at`, `bill_requested_at`. `next_dining_session_number()` → `DS-YYMMDD-NNNNNN`. |
| `dining_session_tables` / `dining_session_servers` | assignment + server history. |
| `reservation_communications` | provider-independent outbox (FOUNDATION). |
| `table_service_audit` | audit trail for sensitive actions. |

All cross-entity relations enforce same-branch consistency with triggers
(`enforce_service_area_branch_match`, `enforce_restaurant_table_branch_match`,
`enforce_reservation_assignment_branch_match`, and session-table/server equivalents).

---

## 4. State machines

### Table `operational_status`
```
available → reserved → occupied → ordering → served → bill_requested
          → payment_pending → cleaning → available
blocked / out_of_service are administrative holds.
```
Rejected: `out_of_service → occupied` (needs reactivation), `occupied → reserved`,
`cleaning → occupied` (needs completion/override), cross-branch updates.

### Reservation `reservation_status`
```
inquiry → pending → confirmed → arrived → (partially_)seated → completed
pending/confirmed → cancelled | declined ; confirmed → no_show
```

### Waitlist `status`
```
waiting → notified → arrived → seated
waiting/notified/arrived → cancelled | left | expired
```

### Dining session `service_status`
```
seated → ordering → dining → bill_requested → payment_pending → completed
seated (no orders) → cancelled ; abandoned is the timeout terminal
```

---

## 5. Availability & capacity engine

Server-authoritative (`ReservationsService.searchAvailability`). Considers branch
operational status, booking enabled, booking policy (interval, default duration,
advance window, same-day cutoff), blackouts, party size vs table/combination
capacity, existing reservations, active dining sessions, blocked/out-of-service
tables, and accessibility. Returns time slots + table/combination options. The
client never computes availability.

> **Timezone limitation:** there is no per-branch timezone column yet. Wall-clock
> availability assumes **Asia/Karachi (UTC+5)**. Tracked in §13.

---

## 6. Concurrency strategy

1. **Database-level double-booking prevention.** `reservation_table_assignments`
   has `EXCLUDE USING gist (table_id WITH =, reserved_range WITH &&) WHERE
   (released_at IS NULL)` (via `btree_gist`). Two overlapping active holds on the
   same table are rejected with `exclusion_violation`. *(Verified — Journey J.)*
2. **Row locks in RPCs.** `seat_party_atomic` and `transfer_session_tables_atomic`
   take `SELECT ... FOR UPDATE` on the reservation/waitlist/session and every
   candidate table before mutating.
3. **Active-session occupancy guard.** A partial unique index + the
   `TABLE_ALREADY_OCCUPIED` / `TABLE_NOT_AVAILABLE` checks stop a table being
   seated twice. *(Verified — Journey J.)*
4. **Idempotency.** `create_reservation_atomic` keys on
   `(idempotency_key, idempotency_request_hash)`: same key+hash → original row
   (`idempotentReplay: true`); same key + different hash → `IDEMPOTENCY_CONFLICT`.
   *(Verified — live idempotency test.)*

---

## 7. Atomic workflows (RPCs, `security definer`, `service_role` only)

| RPC | Guarantee |
| --- | --- |
| `create_reservation_atomic` | reservation + number + optional table holds + outbox + audit in one tx; idempotent; rolls back fully on any failure. |
| `seat_party_atomic` | reservation/waitlist/walk-in → session + table assignment + table status + source status + optional server + audit, atomically. |
| `transfer_session_tables_atomic` | add/remove tables on a session atomically, preserving orders; releases removed tables to cleaning; keeps ≥1 table. |
| `close_dining_session_atomic` | releases tables to cleaning, releases servers, completes session (and reservation), audits; open-bill override recorded. |

Test-only failure injection: `SET LOCAL telepizza.d3_force_fail = '<stage>'`
honored only when `telepizza.d3_test_mode = 'on'`. Never set in production.

---

## 8. API contracts

All under `/api/v1/admin`, branch-scoped, permission-gated server-side.

- **Floor** (`/floor`): `GET /configuration`, `POST/PATCH /floors`, `POST/PATCH
  /areas`, `PATCH /tables/:id/layout`, `POST /tables/:id/status`, `GET/POST/PATCH
  /combinations`.
- **Reservations** (`/reservations`): `GET /availability`, `GET /reports/daily`,
  `POST /` (requires `Idempotency-Key`), `GET /`, `GET /:id`, `PATCH /:id`,
  `POST /:id/{confirm|cancel|arrive|no-show|decline|complete}`, `POST /:id/tables`,
  `POST /:id/seat`.
- **Waitlist** (`/waitlist`): `POST /`, `GET /`, `PATCH /:id`,
  `POST /:id/{notify|arrive|cancel|left|expire}`, `POST /:id/seat`.
- **Table service** (`/table-service`): `GET /floor-state` (single aggregated
  endpoint — no N+1), `POST /sessions/walk-in`, `GET /sessions`, `GET /sessions/:id`,
  `POST /sessions/:id/{transfer|server|request-bill|close|cancel}`.
- **POS** (`/pos/orders`): accepts optional `diningSessionId` (dine-in only) →
  `create_order_atomic(p_dine_in)` links order to session + table.

Frontend client: `apps/website/client/src/lib/table-service-api.ts`.

---

## 9. RBAC matrix

Permissions: `floor.manage`, `reservation.read`, `reservation.manage`,
`dinein.manage`. Roles seeded: `host`, `waiter` (plus grants to super-admin,
branch-manager, admin, cashier).

| Capability | Perm | super-admin | admin | branch-mgr | host | waiter | cashier | kitchen |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Floor/table config | `floor.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read floor/reservations/waitlist | `reservation.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ❌ |
| Create/edit reservations & waitlist | `reservation.manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Seat / transfer / bill / close | `dinein.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

\* cashier reads floor/sessions to attach dine-in orders. Every endpoint enforces
identity → branch membership → resource branch → permission independently. Service
layer re-checks branch scope (`*_ACCESS_DENIED`) even if called off-route.

---

## 10. Audit model

`table_service_audit` records `branch_id`, `actor_user_id`, `actor_type`,
`resource_type`, `resource_id`, `action`, and safe `before_data`/`after_data` JSON
for: reservation create/edit/cancel/no-show, table assignment/transfer, seating,
session close, party-size/capacity/deposit/status overrides, waiter transfer. No
secrets or full PII payloads are stored.

---

## 11. Test & runtime evidence

| Layer | Evidence |
| --- | --- |
| DB static | `tests/database/d3-floor-dinein-reservations.test.mjs` — 20 assertions. Full `pnpm test:db` = **453 pass**. |
| Backend | `backend/api/tests/d3-rbac.authz.test.ts` (RBAC gating), `d3-branch-isolation.d3.test.ts` (cross-branch denial) — 28 tests. Full `pnpm test:backend` = **296 pass**. |
| Live runtime | `docs/testing/d3-live-journeys.sql` — Journeys F–K + idempotency (replay/conflict) + atomic rollback, executed against local Supabase; all assertions PASS inside a rolled-back transaction (no fabricated data persists). |
| Typecheck | `pnpm check` — pass. |
| Build | `pnpm build:website` — pass. |

**Runtime bug found & fixed during verification:** `seat_party_atomic` referenced
`v_wl.customer_id` inside an inline `CASE` during the session insert; PostgreSQL
errors on an unassigned `record` even for an untaken branch. Fixed by assigning a
scalar `v_customer_id` in each source branch. Re-applied to the live DB and
re-verified.

> **Browser E2E (Phase 20) not yet performed.** DB-level runtime is the strongest
> atomicity/concurrency/isolation evidence and is complete; full multi-role browser
> walkthroughs (Super Admin config, host seating, waiter, cashier POS, kitchen
> linkage, responsive) remain outstanding and are listed as a known limitation.

---

## 12. Rollback plan

Both migrations are additive. To roll back (dev only), run the documented
`drop function ... / drop table ...` block in the header of
`20260725100000_d3_floor_dinein_reservations.sql`, and restore the prior
`create_order_atomic` (drop the `p_dine_in` overload from
`20260725101000`). Never drop `restaurant_tables` or `dine_in_sessions` (base
tables); only drop the added columns individually. Do not drop `btree_gist`
without checking other dependents.

---

## 13. Corrective pass (timezone / payment / deposits / public / notifications)

Additional migration: `20260725110000_d3_corrective_timezone_payments_deposits.sql`

### Timezone architecture
- `branches.timezone` (IANA, default `Asia/Karachi`, shape-checked).
- SQL helpers: `branch_local_date`, `branch_wall_to_utc`.
- API helpers: `backend/api/src/services/time/branch-timezone.ts` (DST-safe).
- Availability / daily reports use branch TZ — **no React-authoritative TZ math**.

### Payment settlement
- Extended `payments` ledger (branch, session, bill, idempotency, cash tendered/change).
- RPC `settle_bill_payment_atomic` — idempotent; overpay rejected; cash change server-side.
- Methods: `cash`, `card_terminal`, `bank_manual`, `complimentary` (no online gateway claimed).
- `close_dining_session_atomic` raises `SESSION_UNPAID_BALANCE` unless audited override **with reason**.
- API: `POST /api/v1/admin/payments/settle`, balance, split, void.

### Bill splits
- `bill_splits` + `bill_split_allocations` with `allocation_sum = original_total` constraint.
- Strategies: equal (deterministic cent rounding), by_item, by_quantity, by_amount.

### Deposits
- Working `reservation_deposits` lifecycle: record / waive / forfeit / refund / apply-to-bill once.
- Provider method requires external reference — no fake paid success.

### Public booking
- `GET/POST /api/v1/reservations`, cancel + status with hashed cancellation token.
- Rate-limited; channel=`website`; UI at `/book` and `/book/cancel`.
- Requires `branch_booking_policies.online_booking_enabled = true` and branch `operating`.

### Notification worker
- Outbox worker processes `reservation_communications` with retry / dead_letter.
- Modes: disabled → `provider_unavailable`; mock → sent with mock id; SMTP only when `EMAIL_SMTP_URL` set.
- Manual-contact staff action audited. Production credentials remain a blocker.

### Evidence
- `docs/testing/acceptance-evidence/d3-corrective-pass.json`
- Live SQL: `docs/testing/d3-corrective-payment-live.sql` (PASS, rolled back)
- Playwright skeletons: `e2e/d3/*`, `playwright.d3.config.ts` (**browser journeys not yet executed**)

---

## 14. Known limitations (post-corrective)

1. Full multi-role Playwright Journeys F–K / public-booking / failure-state browser E2E **not yet executed** (skeletons + config present; need fixture credentials + `playwright install`).
2. Production email/WhatsApp provider credentials not configured — worker stays honest (`provider_unavailable`) until set.
3. Public booking blocked until `online_booking_enabled` is turned on per branch policy.
4. No online card gateway — card = manual terminal confirmation only.
5. Northern Bypass production remains **BLOCKED** (coming-soon + missing founder inputs).
6. D3 PR must not merge before D2.

---

## 15. Second-branch (Northern Bypass) setup checklist — **BLOCKED**

Production Northern Bypass remains blocked until real inputs and on-site validation
exist. No production values are invented. See the Founder Input Template:
`docs/features/D3-NORTHERN-BYPASS-SETUP.md`.

Also required for NB: IANA timezone, booking policy (incl. `online_booking_enabled`),
notification sender settings, host/waiter/cashier fixtures (test-only), payment terminal refs.

---

## 16. Runbooks

### Host / front-desk
1. Open **Reservations** → confirm today's pending bookings.
2. On arrival: **Mark arrived** → **Assign tables** (or **Seat** directly).
3. When full: add walk-ins to **Waitlist** → **Notify** → **Seat** when a table frees.
4. Collect deposits via Payments → Deposits when policy requires.

### Waiter (opening-day table service)
1. Open **Live floor**; your assigned/occupied tables show party, elapsed time.
2. Take orders in **POS** (channel = dine-in) → pick the **Dining session** → send to kitchen.
3. Guests done → **Request bill** → cashier settles (cash/terminal) → **Close session** (table → cleaning).
4. After cleaning → **Mark cleaned** (table → available).
5. Unpaid close is emergency-only: manager override + reason + `payment.override_close`.

### Manager
- Configure floors/areas/tables/combinations in **Floor plan**.
- Set branch timezone and booking policy (including online booking flag).
- Watch the branch dashboard **Table service today** KPIs (covers, occupancy, no-shows, waitlist).
- Configure `branch_notification_settings` before expecting outbound email.