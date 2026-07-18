# DATABASE V1 FREEZE DECLARATION

**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Git `main`:** `7e51c0c` (includes R3–R6 + hash privilege harden #78)  
**Remote migrations through:** `20260718171000`

## STATUS

```
DATABASE V1 FREEZE
STATUS
BLOCKED
NOT LOCKED
```

**Remaining gate:** **B-08** — owner written accept that `kitchen_stations` and `pos_sessions` are deferred from V1 freeze (or schedule slices before LOCK). No owner-signed deferral recorded this execution turn.

## Cleared blockers (execution evidence)

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
| B-07 | DONE | Security evidence: `_documentation-audit/reports/DATABASE-V1-FREEZE-SECURITY-EVIDENCE.md`; hash harden `20260718171000` via #78 `7e51c0c` |
| B-08 | **OPEN — OWNER DECISION** | Requires written deferral of `kitchen_stations` / `pos_sessions` for V1 |

## Merge SHAs

| Slice | PR | Merge SHA |
|---|---|---|
| R3 | #69 | `abe0ab6` |
| R4 | #70 | `1df9660` |
| R5 | #71 | `6bdec44` |
| R6 | #72 | `f2b1e3f` |
| Hash privilege harden | #78 | `7e51c0c` |

## Apply sequence (linked)

```
20260718140000  R3 restaurant_tables
20260718150000  R4 dine_in_sessions
20260718160000  R5 kitchen_tickets (+ items)
20260718170000  R6 restaurant_bills + bill_orders
20260718171000  hash column privilege harden
```

No `--include-all` required for R3–R6 sequential applies (each dry-run showed a single pending file).

## Owner action required for PASS/LOCK

Reply in writing (PR comment or signed note) accepting V1 deferral of:

1. `kitchen_stations`
2. `pos_sessions`

Then update this declaration to PASS / LOCKED and close B-08.
