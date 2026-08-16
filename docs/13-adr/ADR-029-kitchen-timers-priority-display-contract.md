# ADR-029: Kitchen Timers, Priority & Display Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.3.0` (closes Phase 8 — Kitchen Dashboard, ADR-029 of 3)

---

## Context

The kitchen display contract — how timers are computed, how priority is
represented, how stations are cataloged, what the KDS screen shows — is
the user-facing half of Phase 8. The other half (lifecycle, schema,
stock consume) is covered by ADR-027 and ADR-028. This ADR covers the
display layer: elapsed-time computation, color thresholds, priority
badge derivation, station catalog (display-only), and the explicit
deferral of server-side SLA, late-alert events, audible alarms,
priority mutation endpoint, and the `kitchen_stations` table.

The as-built display contract lives across two frontend files:

1. `apps/website/client/src/lib/admin-kitchen.ts` (208 lines) — pure
   functions for elapsed time, timer tone, priority badges, action
   labels, average prep computation, shift label, Karachi-clock
   formatting, modifier line parsing.
2. `apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx`
   (622 lines) + `AdminKitchen.tsx` (435 lines) — the two kitchen
   surfaces that consume those functions, with 8s polling, 4-column
   board layout, KPI cards, and explicit "Planned for Phase 2" deferral
   labels for stations, sounds, per-item ticks, and capacity
   prediction.

The display contract was never elevated to a formal ADR. The
`ROS_CURRENT_STATE_ASSESSMENT_2026-07-25.md` classifies both kitchen
surfaces as "Partially Implemented" and accepts the deferrals as known
debt. `docs/rc1/10-KNOWN_LIMITATIONS.md` line 10 explicitly notes
"Three kitchen UIs coexist (Owner, KDS, Ops)" — but no ADR locks the
display contract or the deferral triggers.

This ADR formally accepts the as-built display contract as the
canonical Phase 8 decision: client-side elapsed computation, display
thresholds as client constants (NOT server-side SLA), `priority`
field existence with mutation deferred, `KITCHEN_STATION_CATALOG`
display-only with table + routing API deferred, and no realtime /
sounds / bump / recall.

## Decision

### 1. Client-side elapsed timer — `ticketTimerStartIso()` fallback chain

The kitchen display computes elapsed time per ticket on the client,
using a fallback chain defined in
`apps/website/client/src/lib/admin-kitchen.ts` lines 65-71:

```typescript
export function ticketTimerStartIso(ticket: {
  startedAt?: string | null;
  acceptedAt?: string | null;
  createdAt?: string | null;
}): string | null {
  return ticket.startedAt ?? ticket.acceptedAt ?? ticket.createdAt ?? null;
}
```

| Ticket status | Timer start | Rationale |
|---|---|---|
| `queued` (not yet accepted) | `created_at` | Timer starts the moment the ticket enters the queue — represents "time waiting for kitchen to acknowledge" |
| `accepted` (kitchen claimed, not yet preparing) | `accepted_at` | Timer reflects "time since kitchen accepted" — excludes queue wait |
| `preparing` (actively cooking) | `started_at` | Timer reflects "time since cooking started" — excludes queue + accept |
| `ready` (food done, waiting for pickup) | `started_at` (continues from preparing) | Timer keeps running until `completed` — represents "total kitchen dwell time" |
| `completed` / `cancelled` | N/A — timer hidden | Terminal tickets show duration, not running timer |

`elapsedMinutes(fromIso, now)` (line 60) returns the integer minute
count between the timer start and the current wall clock. The current
wall clock is updated on a separate tick — 30s on `AdminKitchen.tsx`
(line 171), 15s on `AdminKitchenDashboard.tsx` (line 202). This means
the displayed timer can lag the true elapsed time by up to 30s; this
is acceptable for a kitchen display (chefs don't need second-precision).

**Why client-side?** The server stores the timestamp columns
(`created_at`, `accepted_at`, `started_at`, `ready_at`, `completed_at`)
but does NOT compute elapsed time. Computing elapsed on the client
means:

- No server-side SLA tracking (no cron job, no `kitchen.ticket_late`
  domain event — explicitly deferred §2).
- No drift between server-computed "elapsed" and client wall clock —
  the client's `now` is the source of truth.
- Simpler backend: the kitchen API returns timestamps; the client
  derives display.

### 2. Display thresholds — `PREP_WARN=15m`, `PREP_TARGET=20m`

`apps/website/client/src/lib/admin-kitchen.ts` lines 18-19 define two
display constants:

```typescript
export const PREP_WARN_MINUTES = 20;
export const PREP_TARGET_MINUTES = 15;
```

Wait — the constant NAMES suggest `PREP_WARN` is the WARNING threshold
and `PREP_TARGET` is the TARGET (i.e., the goal). But the values are
inverted from what the names suggest: `PREP_WARN=20` and
`PREP_TARGET=15`. Reading the usage in `timerTone()` (line 73-77):

```typescript
export function timerTone(minutes: number | null): "green" | "yellow" | "red" {
  if (minutes === null) return "green";
  if (minutes >= PREP_WARN_MINUTES) return "red";        // 20m+ → red
  if (minutes >= PREP_TARGET_MINUTES) return "yellow";   // 15-19m → yellow
  return "green";                                         // 0-14m → green
}
```

So the contract is:

| Elapsed | Tone | Meaning |
|---|---|---|
| 0-14 minutes | 🟢 green | Within target — kitchen is on track |
| 15-19 minutes | 🟡 yellow | Approaching warning — kitchen should prioritize |
| 20+ minutes | 🔴 red | Past warning — ticket is "delayed" |

These are **display constants only**, NOT server-side SLA alarms. There
is no `emit_domain_event('kitchen.ticket_late')` when a ticket crosses
20m. There is no audible alarm. There is no push notification to a
branch-manager. The "red" state is purely a visual cue that the kitchen
staff member sees on their KDS screen — they are expected to notice and
prioritize accordingly.

This is an explicit non-goal: server-side SLA tracking is **deferred**
with trigger condition: "when operators require automated escalation
to branch-manager on tickets > 20m elapsed". Until then, the visual
cue is the entire contract.

### 3. Priority field — exists, mutation deferred

`kitchen_tickets.priority` integer column exists (DB-R5 line 33,
default 0). It is fetched by the frontend and used in two ways:

1. **Sorting** — `AdminKitchenDashboard.tsx` `sortTickets` (around line
   180) sorts by `priority DESC, createdAt ASC, sequenceNumber ASC`.
   Higher priority tickets appear first in the queue.
2. **Badge derivation** — `priorityBadges(priority, minutesElapsed)`
   in `admin-kitchen.ts` lines 91-95:

```typescript
export function priorityBadges(
  priority: number,
  minutesElapsed: number
): Array<"normal" | "high" | "delayed"> {
  const badges: Array<"normal" | "high" | "delayed"> = [];
  if (priority > 0) badges.push("high");
  if (minutesElapsed >= PREP_WARN_MINUTES) badges.push("delayed");
  if (badges.length === 0) badges.push("normal");
  return badges;
}
```

| Condition | Badge |
|---|---|
| `priority > 0` | `high` (always shown alongside any other badge) |
| `minutesElapsed >= 20` | `delayed` (always shown alongside any other badge) |
| Otherwise | `normal` (only shown if no other badges) |

A ticket can have BOTH `high` AND `delayed` badges simultaneously
(e.g., a VIP ticket that's been in the kitchen 25 minutes).

**However**, `priority` is always 0 in Production because:

1. `createKitchenTicketForConfirmedOrder` sets `priority: 0` on every
   new ticket (no channel-based auto-priority).
2. There is NO `PATCH /api/v1/kitchen/tickets/:id/priority` endpoint.
3. The `PATCH /tickets/:id/status` endpoint does not accept a
   `priority` field.

So in practice, `priorityBadges` returns `["normal"]` for fresh tickets
and `["delayed"]` for tickets over 20m. The `high` badge is reachable
in code but never triggered in Production.

This ADR accepts the current state as V1 and DEFERS:

| Deferred concern | Trigger condition |
|---|---|
| `PATCH /tickets/:id/priority` endpoint | When operators request manual VIP/urgent escalation |
| Channel-based auto-priority (delivery > dine-in > pickup) | When operators report that delivery tickets are routinely late due to kitchen deprioritization |
| `priority_log` audit table | If priority mutation needs its own audit (vs. piggybacking on `order_status_logs`) |
| VIP customer flag → auto-priority | When CRM (ADR-005/006) surfaces a `is_vip` flag on customers |
| Sequence-based priority (lower sequence = higher priority) | When `sequence_number` is populated (deferred in ADR-028 §5) |

The column exists in schema today so future implementation does NOT
require a migration.

### 4. `KITCHEN_STATION_CATALOG` — display-only, table + routing deferred

`apps/website/client/src/lib/admin-kitchen.ts` lines 25-32 define a
display-only station catalog:

```typescript
export const KITCHEN_STATION_CATALOG = [
  { code: "pizza", label: "Pizza Station" },
  { code: "oven", label: "Oven Station" },
  { code: "packing", label: "Packing Station" },
  { code: "drinks", label: "Drinks Station" },
  { code: "desserts", label: "Desserts Station" },
] as const;
```

These 5 stations are rendered in `KitchenStationsPanel.tsx` (48 lines)
as a collapsed `<details>` element with `data-testid="kitchen-stations-deferred"`.
Each station entry is marked "Assignment unavailable — Planned for
Phase 2". The panel footer says: *"Tickets are not routed to stations
until a verified stations API is available. No fake assignment."*

`KitchenCard.tsx` shows a placeholder pill "Station · Planned for
Phase 2" on every ticket — there is no station assignment because
there is no backend.

This ADR accepts the current state as V1 and DEFERS:

| Deferred concern | Trigger condition |
|---|---|
| `kitchen_stations` table (per-branch station configuration) | When operators request per-station ticket routing |
| `kitchen_tickets.assigned_station_id` FK column | Same trigger — schema follows table |
| `POST /api/v1/kitchen/tickets/:id/assign-station` endpoint | Same trigger — backend follows schema |
| Station-filtered queue view (e.g., "show only Pizza Station tickets") | Same trigger — UI follows backend |
| Station-based KPIs (utilization %, throughput per station) | Same trigger — analytics follows UI |
| Auto-routing rules (e.g., "all pizzas → Pizza Station") | Same trigger — rules engine follows UI |

The DB-R5 migration line 7 explicitly defers this: *"kitchen_stations
/ station routing — Phase 8 / later slice."* This ADR confirms the
deferral with a concrete trigger condition.

The display catalog exists in frontend code so that operators can see
what stations WILL exist when the backend is implemented — it's a
visual placeholder, not a fake feature. The `data-testid="kitchen-stations-deferred"`
attribute makes the deferral machine-readable for static tests
(`tests/website/admin-kitchen-display-v1.test.mjs` line 28 asserts
this testid is present).

### 5. KDS navigation modes — board / queue / ready / delayed

`KitchenManagerShell.tsx` (217 lines) defines `KDS_NAV` with 4 view
modes:

| Mode | Filter | Purpose |
|---|---|---|
| `board` | All active tickets (queued/accepted/preparing/ready) | Default — 4-column kanban board |
| `queue` | `queued` only | "What's waiting to be accepted" |
| `ready` | `ready` only | "What's ready for pickup / dispatch" |
| `delayed` | Elapsed ≥ 20m (any active status) | "What's running late — needs attention" |

Two more nav items are rendered as DISABLED (with "Planned for Phase
2" labels):

- `item-view` — per-item view (would show items across tickets,
  grouped by menu_item, for batch cooking). Deferred until per-item
  prep ticks are implemented (ADR-028 §4).
- `history` — completed/cancelled tickets archive. Deferred until
  operators request historical KPI analysis beyond what
  `KitchenPerformance.tsx` already shows.

The clock in the shell header (`KitchenManagerShell.tsx` line ~180)
ticks every 1 second and displays Karachi time
(`Asia/Karachi`). `isKarachiToday(iso)` in `admin-kitchen.ts` is used
to bucket "completed today" KPIs by Karachi business day, not UTC day
— this matches the POS Z-Report timezone invariant (ADR-025 §4).

### 6. KPIs — 8 on owner ERP, 7 on KDS

`KitchenKPIs.tsx` (122 lines, used by `AdminKitchen.tsx`) renders 8
KPI cards:

| KPI | Source | Notes |
|---|---|---|
| Orders waiting | Count of `queued` tickets | |
| Preparing | Count of `preparing` tickets | |
| Ready | Count of `ready` tickets | |
| Delayed | Count of active tickets with elapsed ≥ 20m | Client-computed |
| Average prep time | `averagePrepMinutes(tickets)` from `started_at → ready_at` on finished tickets | Client-computed |
| Completed today | Count of `completed` tickets where `completed_at` is Karachi-today | |
| Kitchen capacity | `FOUNDATION` — unavailable | Display-only placeholder, no capacity API |
| Priority orders | Count of tickets with `priority > 0` | Always 0 in V1 (priority deferred §3) |

`AdminKitchenDashboard.tsx` (KDS) renders 7 KPIs (similar but no
"Priority orders" — KDS focuses on operational status, not priority
analytics).

**Honesty invariant**: when an API request fails or returns empty,
the KPIs show "—" (em dash) or "Unavailable" rather than `0`. This
prevents the kitchen from seeing `0` and thinking "no orders" when
the actual state is "API down". The static test
`tests/website/admin-kitchen-manager-dashboard-v1.test.mjs` line 78
asserts this: "EMPTY successful queue shows resolved zero KPIs (not
LIVE); API failure withholds invented zeros".

### 7. Insights — rule-based only, NO AI prediction

`KitchenInsights.tsx` (116 lines) renders a "Mianx.ai Kitchen
Assistant" panel. Despite the name, the panel is **rule-based only** —
no LLM call, no AI prediction, no autonomous action. The insights are
deterministic functions of live ticket counts:

- "X orders waiting, Y preparing — kitchen load is normal/high"
- "Z tickets delayed (>20m) — consider reassigning staff"
- "Average prep time is N minutes — within/above target"

The static test `tests/website/admin-kitchen-display-v1.test.mjs`
asserts: "AI panel rule-based only (no LLM/autonomous)".

This is an explicit non-goal: AI-driven kitchen prediction (e.g.,
"based on current queue + historical prep times, ticket #42 will be
late by 7 minutes") is **deferred** with trigger condition: "when
operators request predictive SLA alerts AND the AI provider boundary
(ADR-013) is integrated with kitchen domain events". The Mianx.ai
branding is preserved for future integration but the V1 panel is
purely deterministic.

### 8. Non-goals (this ADR)

| Concern | ADR / status |
|---|---|
| Ticket lifecycle (status machine, transitions) | ADR-027 |
| KOT item snapshots + atomic stock consume | ADR-028 |
| Per-item prep ticks UI | ADR-028 §4 (deferred) |
| KOT print format + sequence numbering | ADR-028 §5 (deferred) |
| Server-side SLA tracking + late-alert events | This ADR §2 (deferred) |
| `PATCH /tickets/:id/priority` endpoint + auto-priority | This ADR §3 (deferred) |
| `kitchen_stations` table + station routing | This ADR §4 (deferred) |
| Realtime updates (Supabase Realtime channels) | ADR-027 §8 (deferred) |
| Audible alarms / bump-bar / recall | Deferred — RC1 accepted limitation |
| Push notifications to branch-manager on delayed tickets | Deferred — depends on server-side SLA (§2) |
| AI-driven kitchen prediction | This ADR §7 (deferred) |
| `kitchen_capacity` API (capacity prediction) | Deferred — display-only placeholder in V1 |
| Three parallel kitchen UIs consolidation | Out of scope — RC1 known debt |

## Consequences

### Positive

- **Client-side timer is simple and drift-free.** No server cron job
  to maintain, no SLA events to handle, no drift between server and
  client clocks. The kitchen sees elapsed time computed from the same
  wall clock that renders the UI.
- **Display thresholds are tunable in one place.** `PREP_WARN=20` and
  `PREP_TARGET=15` are constants in `admin-kitchen.ts` — operators can
  request a change and it's a one-line edit (no migration, no ADR
  amendment needed for tuning within an order of magnitude).
- **Honest deferral of priority mutation.** The `priority` column
  exists but is always 0; the UI shows "normal" badges only. No fake
  VIP feature, no implication that priority is settable. When operators
  request manual escalation, the implementation is backend code + UI
  changes only — no migration.
- **Honest deferral of stations.** `KITCHEN_STATION_CATALOG` is
  display-only with `data-testid="kitchen-stations-deferred"` —
  machine-readable deferral. No fake station assignment.
- **Honest deferral of AI.** "Mianx.ai Kitchen Assistant" is branded
  but rule-based only. No LLM call, no autonomous action. When AI is
  integrated, it will be via the ADR-013 provider boundary — not via
  a direct OpenAI call from the kitchen UI.

### Negative

- **No automated escalation on delayed tickets.** A ticket that's
  been `preparing` for 35 minutes will show red on the KDS screen, but
  no branch-manager is automatically paged. If the kitchen staff
  member is distracted, the ticket can sit indefinitely. This is
  operationally risky for high-volume branches.
- **Priority is dead code today.** The column exists, is fetched, is
  used in sort + badge derivation — but is always 0. Same tradeoff as
  `is_completed` in ADR-028 §4: column pre-positions for V2, but
  carries a "dead" field in V1.
- **`KITCHEN_STATION_CATALOG` is hardcoded.** The 5 stations
  (pizza/oven/packing/drinks/desserts) are frontend constants, not
  per-branch configuration. When the `kitchen_stations` table is
  implemented, branches will be able to define their own stations —
  but the frontend catalog will need to be migrated to a backend
  fetch.
- **15s/30s clock tick can lag true elapsed.** A ticket that's been
  in the kitchen for exactly 14m59s might show "14m" for up to 30
  seconds before updating to "15m". This is acceptable for a kitchen
  display (chefs don't need second-precision) but might confuse
  operators who expect real-time.
- **Three kitchen UIs are not consolidated.** `/admin/kitchen`,
  `/admin/kitchen-dashboard`, and `/ops/kitchen` all coexist with
  overlapping functionality. This ADR does not address consolidation —
  it's an RC1-known limitation that requires operator UX research.

## Alternatives Considered

- **Server-side SLA tracking with `emit_domain_event('kitchen.ticket_late')`.**
  Rejected for V1: adds a cron job, a domain event consumer, a
  notification channel (push / SMS / email), and an operator
  configuration UI for SLA thresholds. The visual cue (red timer) is
  sufficient for current scale; automated escalation is deferred with
  a trigger condition.
- **Channel-based auto-priority (delivery > dine-in > pickup).**
  Considered: would set `priority=10` for delivery, `priority=5` for
  dine-in, `priority=0` for pickup on ticket creation. Rejected for
  V1: the assumption that delivery is more time-sensitive than
  dine-in is operator-specific and may not hold for all branches.
  Better to defer until operators explicitly request it.
- **`kitchen_stations` table in V1.** Rejected: adds a table, a
  per-branch configuration UI, a routing rules engine, and a
  station-filtered queue view. The visual placeholder
  (`KITCHEN_STATION_CATALOG`) communicates intent without
  implementing the backend. When operator demand emerges, the
  implementation is a single migration + backend code + UI changes.
- **Real-time clock tick (1s).** Considered: would make the displayed
  timer accurate to the second. Rejected: 15s/30s is sufficient for
  kitchen operations and reduces unnecessary re-renders. The 1s tick
  is reserved for the Karachi wall clock in the shell header (which
  is a display element, not a timer).
- **AI-driven prediction in V1.** Rejected: would require integrating
  the ADR-013 AI provider boundary with kitchen domain events, plus
  an operator configuration UI for prediction thresholds. The
  rule-based panel is sufficient for V1; AI is deferred with a
  trigger condition.
- **Single consolidated kitchen UI.** Considered: merge
  `/admin/kitchen`, `/admin/kitchen-dashboard`, and `/ops/kitchen`
  into one. Rejected for V1: the three UIs serve different audiences
  (owner, kitchen manager, ops) with different navigation patterns.
  Consolidation requires operator UX research and is not a Phase 8
  blocker.

## As-Built Verification (2026-08-16)

`scripts/phase_8_verify.py` confirms:

- ✅ `kitchen_tickets.priority` integer column exists (default 0) —
  schema supports priority mutation when endpoint is added
- ✅ `kitchen_tickets.sequence_number` integer column exists (nullable)
  — schema supports KOT numbering when print format is specified
- ✅ `kitchen_tickets.accepted_at`, `started_at`, `ready_at`,
  `completed_at` timestamptz columns exist — client-side timer
  fallback chain has all required source data
- ✅ Frontend `apps/website/client/src/lib/admin-kitchen.ts` exports
  `PREP_WARN_MINUTES=20`, `PREP_TARGET_MINUTES=15`,
  `KITCHEN_STATION_CATALOG`, `ticketTimerStartIso`, `timerTone`,
  `priorityBadges`, `nextKitchenActions`, `averagePrepMinutes`,
  `currentShiftLabel`, `formatKitchenClock`, `isKarachiToday`
- ✅ Frontend `KitchenStationsPanel.tsx` has
  `data-testid="kitchen-stations-deferred"` (machine-readable
  deferral)
- ✅ Frontend `AdminKitchenDashboard.tsx` `sortTickets` sorts by
  `priority DESC, createdAt ASC, sequenceNumber ASC`
- ✅ No `PATCH /api/v1/kitchen/tickets/:id/priority` endpoint exists
  (deferred — confirmed by grep of `modules/kitchen/routes.ts`)
- ✅ No `PATCH /api/v1/kitchen/tickets/:id/items/:itemId` endpoint
  exists (deferred — confirmed by grep)
- ✅ No `kitchen_stations` table exists in any migration (deferred —
  confirmed by grep of `supabase/migrations/`)
- ✅ No `supabase.channel(...)` calls in any kitchen-related frontend
  file (realtime deferred — confirmed by grep)
- ✅ No `emit_domain_event('kitchen.ticket_late')` in backend code
  (SLA tracking deferred — confirmed by grep)
- ✅ `KitchenInsights.tsx` is rule-based only — no LLM import, no
  fetch to an AI endpoint (confirmed by source inspection)

**Result: see PHASE8_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md`](../architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md) — polling-not-realtime contract
- [`docs/architecture/assessments/ROS_CURRENT_STATE_ASSESSMENT_2026-07-25.md`](../architecture/assessments/ROS_CURRENT_STATE_ASSESSMENT_2026-07-25.md) — classifies kitchen surfaces as "Partially Implemented"
- [`docs/rc1/10-KNOWN_LIMITATIONS.md`](../rc1/10-KNOWN_LIMITATIONS.md) — three parallel kitchen UIs known debt
- [`docs/rc1/04-MODULE_STATUS.md`](../rc1/04-MODULE_STATUS.md) — Kitchen (Owner) + Kitchen Manager KDS both PARTIAL
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 8 entry
- [`docs/13-adr/ADR-013-ai-provider-boundary.md`](./ADR-013-ai-provider-boundary.md) — AI provider boundary (deferred integration for kitchen prediction)
- [`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`](./ADR-018-order-lifecycle-state-machine.md) — order status transitions
- [`docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md`](./ADR-025-pos-shifts-zreport-cash-recon.md) — §4 Asia/Karachi timezone invariant (mirrored here for kitchen clock)
- [`docs/13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md`](./ADR-027-kitchen-ticket-lifecycle-queue-contract.md) — ticket lifecycle (parent of this ADR)
- [`docs/13-adr/ADR-028-kot-snapshot-per-item-status.md`](./ADR-028-kot-snapshot-per-item-status.md) — KOT item snapshots + per-item status deferral
- [`apps/website/client/src/lib/admin-kitchen.ts`](../../apps/website/client/src/lib/admin-kitchen.ts) — display contract pure functions
- [`apps/website/client/src/pages/admin/AdminKitchen.tsx`](../../apps/website/client/src/pages/admin/AdminKitchen.tsx) — owner ERP UI
- [`apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx`](../../apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx) — kitchen KDS UI
- [`apps/website/client/src/components/admin/kitchen/`](../../apps/website/client/src/components/admin/kitchen/) — 10 kitchen components
- [`tests/website/admin-kitchen-display-v1.test.mjs`](../../tests/website/admin-kitchen-display-v1.test.mjs) — UI structure assertions
- [`tests/website/admin-kitchen-manager-dashboard-v1.test.mjs`](../../tests/website/admin-kitchen-manager-dashboard-v1.test.mjs) — KDS route + access + KPI honesty assertions
- [`tests/website/kitchen-completion-rc2.test.mjs`](../../tests/website/kitchen-completion-rc2.test.mjs) — lifecycle + timer + station deferral assertions
