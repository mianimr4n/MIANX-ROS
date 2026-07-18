# Database Performance Plan

**Date:** 2026-07-18  
**Mode:** Analysis / design only  
**Current volume:** Pilot-scale (orders ≈ 0–1 in recent audits; catalog ~tens of rows; 2 branches)

---

## 1. Current assessment

| Area | Verdict | Class |
|---|---|---|
| Hot-path indexes for website quote/create/track | Adequate | — |
| Modifier join cost at current catalog size | Negligible | — |
| Admin list latency risk | Low today; add `created_at` indexes before volume | SAFE FOR FEATURE PHASE |
| Kitchen / POS queues | N/A until R3–R6 live | REQUIRED indexes ship **with** those migrations |

Production is **not** CPU/IO bound. Freeze blockers are **schema completeness**, not query tuning.

---

## 2. Hot paths to protect

| Path | Access pattern | Perf design |
|---|---|---|
| Menu catalog read | Public SELECT by active flags | Keep covering RLS-simple policies; CDN/API cache later |
| Quote / create | service_role reads catalog + writes order tree | Single transaction; idempotency unique index |
| Order track | Lookup by order number / auth | Existing uniques |
| QR resolve (designed) | Hash equality on `qr_token_hash` / `public_token_hash` | Unique indexes in R3/R4 |
| Kitchen queue (designed) | `(branch_id, status)` | Indexes in R5 |
| Bill close (designed) | Session → open bill → bill_orders → orders | Partial unique open bill + order unique |

---

## 3. Snapshot strategy (already live)

- Persist `order_items` + `order_item_modifiers` snapshots at create.  
- Kitchen ticket items (designed) copy name/modifiers JSON — avoid join storms on KDS.  
- `table_display_snapshot` freezes receipt labels when tables rename.

**Do not** recompute historical money from live catalog.

---

## 4. Write amplification risks (after R5/R6)

| Risk | Mitigation | Class |
|---|---|---|
| Ticket create on every confirm | Idempotent UNIQUE `order_id` | REQUIRED BEFORE V1 FREEZE (in R5 design) |
| Bill auto-link on confirm | One open bill per session partial unique | REQUIRED BEFORE V1 FREEZE (in R6 design) |
| Status double-write (ticket + order + logs) | Keep synchronous at pilot; async outbox later | SAFE FOR FEATURE PHASE |
| Bill number sequence via MAX()+1 | Acceptable at low volume; replace with sequence/counter table under contention | SAFE FOR FEATURE PHASE |

---

## 5. Read models / caching (feature)

| Idea | When | Class |
|---|---|---|
| Materialized branch menu JSON | Admin publish volume | SAFE FOR FEATURE PHASE |
| Redis / CDN for catalog | Multi-region | V2 / NOT REQUIRED FOR V1 |
| Kitchen websocket fan-out | KDS UI | SAFE FOR FEATURE PHASE (app layer) |
| Analytics warehouse ETL | Reporting | V2 / NOT REQUIRED FOR V1 |

---

## 6. Observability

| Metric | Target | Class |
|---|---|---|
| p95 quote/create | < 300 ms in-region | SAFE FOR FEATURE PHASE |
| QR resolve | < 150 ms | SAFE FOR FEATURE PHASE |
| Kitchen list | < 200 ms for open tickets/branch | SAFE FOR FEATURE PHASE |
| Slow query log | Enable when volume rises | SAFE FOR FEATURE PHASE |

---

## 7. What not to do before freeze

- No premature partitioning  
- No denormalized “god” JSON order blobs replacing relational items  
- No dropping snapshots “for performance”  
- No production index experiments during docs PRs  

**Performance does not unblock V1 freeze**; missing R3–R6 tables do.
