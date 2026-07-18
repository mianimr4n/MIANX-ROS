# Database V1 Freeze Checklist

**Linked:** `pyeowxvacgypohrbvgee`  
**Updated:** 2026-07-18 (war-room execution)

| Gate | Status |
|---|---|
| R0–R2 on main + remote | DONE |
| Hygiene: close #65/#66/#62/#64 | DONE |
| Depollute #71 / R6-only #72 | DONE |
| R3 merge + apply `…140000` | DONE |
| R4 merge + apply `…150000` | DONE |
| R5 merge + apply `…160000` | DONE |
| R6 merge + apply `…170000` | DONE |
| Hash privilege harden `…171000` | DONE |
| Security evidence (RLS/grants/hashes) | DONE |
| Regression (`check` / `test:db` / `test:backend` / `build:website`) | DONE |
| Owner deferral `kitchen_stations` / `pos_sessions` (B-08) | **OPEN** |
| **Freeze LOCK** | **BLOCKED (B-08)** |
