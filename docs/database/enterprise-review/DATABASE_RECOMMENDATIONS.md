# Database Recommendations

**Date:** 2026-07-18  
**Audience:** Human Owner · War Room · Database Architect  
**Mode:** Analysis & design only — **NO DATABASE CHANGES IN THIS PR**

---

## Scores (honest)

| Metric | Value | Rationale |
|---|---|---|
| **Current Completion %** | **42%** | Identity, RBAC, menu, modifiers, orders core live; restaurant ops 0% live |
| **Production Readiness %** (website delivery/pickup) | **72%** | Customer order path usable; OTP/provider & staff ops incomplete |
| **Freeze Readiness %** | **38%** | R0–R2 cleared (~3/8 slices); R3–R6 designed but unmerged/unapplied; #71 polluted |

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```

---

## Critical missing items

1. **Live** `restaurant_tables` + secure QR hash (PR #69 designed only)  
2. **Live** `dine_in_sessions` + order linkage (PR #70)  
3. **Clean** kitchen tickets foundation (PR #71) — War Room blocked on governance pollution commit  
4. **Live** `restaurant_bills` + `bill_orders` (PR #72)  
5. Owner gates: accept deferred `kitchen_stations` and deferred `pos_sessions`, **or** require follow-ups before freeze PASS  
6. Catalog board **13/58/3/40/7** vs live **15/67** reconciliation (non-blocking P2)  
7. Official freeze declaration withheld until re-audit PASS (PR #73 correctly BLOCKED)

---

## Recommended implementation order

```text
0. Depollute PR #71 (kitchen-only commit; no governance pack) — War Room gate
1. Owner-approve apply of DB-R3 (#69) after merge
2. Merge + apply DB-R4 (#70)
3. Merge clean DB-R5 (#71) + apply
4. Merge + apply DB-R6 (#72)
5. Seed/verify role helpers + optional permission codes (R7)
6. Refresh production-schema-snapshot (docs)
7. Re-run freeze checklist → only then DECLARE LOCKED
```

Parallel allowed: catalog count governance docs; close stale #65/#66; architecture doc sync for one-ticket-per-order + no `pos_sessions`.

**Forbidden in parallel with freeze:** inventory, loyalty, UI builds claimed as freeze work, SQL Editor DDL, foundation re-runs.

---

## Owner decisions required

| Decision | Options | Freeze impact |
|---|---|---|
| Kitchen grain | Accept PR #71 one-ticket-per-order **or** require stations before freeze | Blocks PASS if unresolved |
| POS shifts | Accept bills without `pos_sessions` **or** add table | Blocks PASS if unresolved |
| Legacy dine-in both-null | Keep phased CHECK until cutover date | Documented in #70 |
| Bill number format | Accept `PREFIX-YYYYMMDD-####` helper | Soft |
| QR expiration TTL | Defer to feature phase (rotation only for V1) | Soft |
| Waiter / merge / move / split | Feature phase | Soft |

---

## What is already good

- Migration workflow + SSOT docs on `main`  
- R0 grant hardening verified holding  
- R1 profiles gone  
- R2 relational modifiers with server-side pricing snapshots  
- Delivery/pickup order model with idempotency and status logs  
- Architecture pack (PR #64) remains the conceptual north star even while implementation PRs diverge slightly  

---

## What not to do

- Do **not** claim R3–R6 are production-applied  
- Do **not** merge polluted #71  
- Do **not** apply stacked dry-run migrations without ordered merges  
- Do **not** invent V2 tables to “complete” the 50-domain list before freeze  
- Do **not** change existing live tables in a docs PR  
- Do **not** run SQL Editor against prod for “quick fixes”

---

## Estimated remaining database work

| Workstream | Effort (engineering days, rough) | Class |
|---|---|---|
| Depollute #71 + PR hygiene | 0.5 | REQUIRED BEFORE V1 FREEZE |
| Merge/apply R3–R6 + smoke | 2–4 (mostly review/apply gates) | REQUIRED BEFORE V1 FREEZE |
| Owner-gate follow-ups (stations / pos_sessions) | 1–3 if required | Owner-dependent |
| Freeze re-audit + declaration | 0.5–1 | REQUIRED BEFORE V1 FREEZE |
| Feature-phase dine-in (waiter, merge, move, split, QR TTL, scheduled) | 5–15 | SAFE FOR FEATURE PHASE |
| V2 commerce/inventory/loyalty | 20+ | V2 / NOT REQUIRED FOR V1 |

**Remaining to reach freeze PASS (if owner accepts PR deferrals):** ~**1 calendar week** of gated merge/apply/re-audit — not greenfield schema design.

**Remaining to satisfy full owner dine-in wish-list + 50 domains:** multi-sprint **feature + V2** program after freeze.
