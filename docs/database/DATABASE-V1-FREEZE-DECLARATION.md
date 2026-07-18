# DATABASE V1 FREEZE DECLARATION

**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Git `main`:** `4b5f564` (includes R3–R6 + hash privilege harden #78 + freeze tracker #77)  
**Remote migrations through:** `20260718171000`  
**Declaration type:** Owner-approved product decision — PASS LOCKED

## STATUS

```
DATABASE V1 FREEZE
STATUS
PASS
LOCKED
```

## Owner decision (2026-07-18) — quote

> V1 INCLUDES: restaurant_tables, secure QR, dine_in_sessions, kitchen_tickets, restaurant_bills, bill_orders, existing customer ordering, branch ops, security/RLS.  
> OFFICIALLY DEFERRED TO V2:  
> 1. kitchen_stations — multi-station routing not required for Aug 14 launch; kitchen tickets sufficient  
> 2. pos_sessions — cashier shift/session management out of V1; bill foundation sufficient  
> This is OWNER APPROVED PRODUCT DECISION.

## Deferred to DATABASE V2

| Object | Reason |
|---|---|
| `kitchen_stations` | Multi-station routing not required for Aug 14 launch; `kitchen_tickets` sufficient for V1 |
| `pos_sessions` | Cashier shift/session management out of V1; `restaurant_bills` / `bill_orders` foundation sufficient |

## V1 frozen tables (restaurant / dine-in / kitchen / POS surface)

| Table | Slice |
|---|---|
| `restaurant_tables` | R3 (`20260718140000`) |
| `dine_in_sessions` | R4 (`20260718150000`) |
| `kitchen_tickets` | R5 (`20260718160000`) |
| `kitchen_ticket_items` | R5 (`20260718160000`) |
| `restaurant_bills` | R6 (`20260718170000`) |
| `bill_orders` | R6 (`20260718170000`) |

Plus existing customer-ordering, branch-ops, and security/RLS surfaces already on `main` through R0–R2 and prior catalog schema. Hash-column privilege harden: `20260718171000`.

## Cleared blockers

| ID | Status | Evidence |
|---|---|---|
| B-09 | DONE | #65/#66 CLOSED superseded |
| B-10 | DONE | #62/#64 CLOSED obsolete |
| B-05 | DONE | #71 tip = `443b695` lineage → rebased `9ea0a40`; zero `docs/team/**` |
| B-06 | DONE | #72 rebuilt R6-only `3e88a54` |
| B-01 | DONE | #69 MERGED `abe0ab6`; applied `20260718140000`; `restaurant_tables` present |
| B-02 | DONE | #70 MERGED `1df9660`; applied `20260718150000`; `dine_in_sessions` present |
| B-03 | DONE | #71 MERGED `6bdec44`; applied `20260718160000`; kitchen tables present |
| B-04 | DONE | #72 MERGED `f2b1e3f`; applied `20260718170000`; bills tables present |
| B-07 | DONE | Security evidence: `_documentation-audit/reports/DATABASE-V1-FREEZE-SECURITY-EVIDENCE.md`; hash harden `20260718171000` via #78 |
| B-08 | **DONE** | Owner written deferral 2026-07-18 — `kitchen_stations` and `pos_sessions` officially deferred to V2 |

**Open freeze blockers:** none.

## Merge SHAs

| Slice | PR | Merge SHA |
|---|---|---|
| R3 | #69 | `abe0ab6` |
| R4 | #70 | `1df9660` |
| R5 | #71 | `6bdec44` |
| R6 | #72 | `f2b1e3f` |
| Hash privilege harden | #78 | `7e51c0c` |
| Freeze tracker / war-room | #77 | `4b5f564` |

## Apply sequence (linked) — frozen head

```
20260718140000  R3 restaurant_tables
20260718150000  R4 dine_in_sessions
20260718160000  R5 kitchen_tickets (+ items)
20260718170000  R6 restaurant_bills + bill_orders
20260718171000  hash column privilege harden
```

Local and remote migration lists match through `20260718171000` (read-only `migration list --linked` sanity, 2026-07-18).

## Change control policy (LOCKED)

While Database V1 Freeze is **PASS / LOCKED**:

1. **No new production schema** for V1 restaurant / dine-in / kitchen / POS without an explicit owner unfreeze + new change-control ticket.
2. **No new migrations** that add V1-required tables (including deferred `kitchen_stations` / `pos_sessions`) until DATABASE V2 scope opens.
3. **Allowed without unfreeze:** documentation, app-layer work against frozen tables, bugfix migrations that do not expand V1 scope (owner-gated), and V2 design docs clearly labeled deferred.
4. **Forbidden:** treating architecture “REQUIRED” language for `kitchen_stations` / `pos_sessions` as V1 freeze obligations — owner has deferred both to V2.
5. **Source of truth for freeze status:** this declaration + `docs/database/FREEZE-BLOCKER-TRACKER.md` + `docs/database/DATABASE-FREEZE-CHECKLIST.md`.

## Evidence package

- Security: `_documentation-audit/reports/DATABASE-V1-FREEZE-SECURITY-EVIDENCE.md`
- Pass lock: `_documentation-audit/reports/DATABASE-V1-FREEZE-PASS-LOCKED.md`
- Tracker: `docs/database/FREEZE-BLOCKER-TRACKER.md`

---

```
DATABASE V1 FREEZE
STATUS
PASS
LOCKED
```
