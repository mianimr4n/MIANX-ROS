# Database Scalability Plan

**Date:** 2026-07-18  
**Mode:** Design only — no infrastructure or schema changes in this PR

---

## 1. Tenancy model (locked)

| Decision | Choice |
|---|---|
| Physical DB per branch | **Rejected** |
| Schema per branch | **Rejected** |
| Logical isolation | **`branch_id` + RLS + API principal** |

Scale by adding branches as rows, not databases. Restaurant tables are **unlimited per branch** via `UNIQUE(branch_id, table_number)`.

---

## 2. Growth stages

| Stage | Shape | DB posture |
|---|---|---|
| Pilot (now) | 2 branches, low orders | Single Supabase project `pyeowxvacgypohrbvgee` |
| City multi-branch | 5–20 branches | Same DB; indexes on branch+status; connection pooling |
| Multi-city | 20–100 branches | Read replicas / pooling; still one logical schema |
| National | 100+ | Consider regional read replicas; optional branch shard only with owner architecture change (**V2**) |

---

## 3. Table growth expectations

| Family | Growth driver | Scale tactic | Class |
|---|---|---|---|
| Menu / modifiers | Slow | Cache; rare writes | — |
| `restaurant_tables` | Linear in seats | Small; fine | REQUIRED BEFORE V1 FREEZE (existence) |
| `dine_in_sessions` | Visits/day | Partition by month later if needed | SAFE FOR FEATURE PHASE |
| `orders` / items / modifiers / logs | Orders/day | Time indexes; retention jobs | SAFE FOR FEATURE PHASE |
| `kitchen_tickets` | ≈ orders | Same as orders | REQUIRED BEFORE V1 FREEZE (existence) |
| `restaurant_bills` | Dine-in visits | Same | REQUIRED BEFORE V1 FREEZE (existence) |
| Inventory / IoT / analytics | High write | Separate store | V2 / NOT REQUIRED FOR V1 |

---

## 4. Concurrency design (dine-in)

| Conflict | Designed control |
|---|---|
| Two active sessions one table | Partial unique index (`open\|ordering`) |
| Two open bills one session | Partial unique `status=open` |
| Double kitchen ticket | `UNIQUE(order_id)` |
| Order on two bills | `bill_orders.order_id UNIQUE` |
| QR token reuse after rotate | `qr_version` + hash replace |

These belong in freeze foundations; advanced merge/move needs explicit locking in feature APIs (**SAFE FOR FEATURE PHASE**).

---

## 5. API / integration scalability

| Concern | Guidance | Class |
|---|---|---|
| Idempotent order create | LIVE unique key | — |
| Webhook / provider retries | Outbox table later | SAFE FOR FEATURE PHASE |
| Multi-device POS offline | Sync tables deferred | SAFE FOR FEATURE PHASE |
| Realtime kitchen | Supabase realtime or WS on ticket updates | SAFE FOR FEATURE PHASE |
| Cross-system ERP sync | Integration events V2 | V2 / NOT REQUIRED FOR V1 |

---

## 6. Retention & storage

| Stream | Recommendation | Class |
|---|---|---|
| `order_status_logs` | ≥ 24 months hot | SAFE FOR FEATURE PHASE (policy) |
| Closed sessions / bills | ≥ 24 months | SAFE FOR FEATURE PHASE |
| Kitchen tickets | Align with orders | SAFE FOR FEATURE PHASE |
| PII in notes | Forbid secrets; redact jobs | SAFE FOR FEATURE PHASE |

---

## 7. Failure domains

- Prefer forward-fix migrations; never re-run foundation.  
- Backup / PITR required before any future R3–R6 apply.  
- Keep website delivery/pickup functional if dine-in tables lag (nullable FKs / phased CHECK).  

---

## 8. Freeze relevance

Scalability architecture is **compatible** with V1 freeze once R3–R6 land. Missing foundations — not missing shards — block freeze.
