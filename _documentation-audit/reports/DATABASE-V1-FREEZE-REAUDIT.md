# DATABASE V1 FREEZE — Re-Audit (DB-R7)

**Status:** BLOCKED  
**Date:** 2026-07-18  
**Mode:** Audit & freeze governance only (no feature code, no migration apply)  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Git baseline:** `main` @ `9c1d21c` (docs PR from `audit/db-r7-v1-freeze-declaration`)

---

## Executive verdict

Owner claimed DB-R0–R6 were **CLOSED & APPLIED**. Independent verification **rejects** that claim for **R3–R6**.

- R0–R2: on `main` and linked remote; dry-run clean on `main`
- R3–R6: **not merged** (PRs #69–#72 OPEN) and **not applied** (tables absent; dry-run from feature stack would push four migrations)

**Official freeze declaration is withheld.**

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```

---

## PHASE 1 — Safety & migration alignment

### Environment

| Item | Value |
|---|---|
| Linked project | `pyeowxvacgypohrbvgee` |
| Working tree for audit | Clean branch from `origin/main` |
| Unmanaged remote-only migrations | None observed on main baseline |

### `npx supabase migration list --linked` (from clean `main`)

All 20 local migrations through `20260718130200` match remote. No local-only / remote-only skew on this baseline.

| Timestamp | Role | Local | Remote |
|---|---|---|---|
| … through `20260716160000` | Pre-R0 foundation / auth / orders / catalog | Yes | Yes |
| `20260718120000` | Product modifiers (R2 base) | Yes | Yes |
| `20260718130000` | DB-R0 grant/DEFINER harden | Yes | Yes |
| `20260718130100` | DB-R1 retire `profiles` | Yes | Yes |
| `20260718130200` | DB-R2 owner alignment | Yes | Yes |
| `20260718140000` | DB-R3 restaurant tables | **Absent on main** | **Absent** |
| `20260718150000` | DB-R4 dine-in sessions | **Absent on main** | **Absent** |
| `20260718160000` | DB-R5 kitchen tickets | **Absent on main** | **Absent** |
| `20260718170000` | DB-R6 POS bills | **Absent on main** | **Absent** |

### Dry-run

| Baseline | Result |
|---|---|
| Clean `main` | `Remote database is up to date.` |
| `feature/db-r6-pos-bill-foundation` (open stack) | Would push R3–R4–R5–R6 SQL files |

### PR merge reality (#69–#72)

| PR | Title | State | Merged to main? |
|---|---|---|---|
| [#69](https://github.com/mianimr4n/telepizza/pull/69) | DB-R3 restaurant tables & QR | OPEN | **No** |
| [#70](https://github.com/mianimr4n/telepizza/pull/70) | DB-R4 dine-in sessions | OPEN | **No** |
| [#71](https://github.com/mianimr4n/telepizza/pull/71) | DB-R5 kitchen tickets | OPEN | **No** |
| [#72](https://github.com/mianimr4n/telepizza/pull/72) | DB-R6 POS bill foundation | OPEN | **No** |

Related open (content largely landed via #67): #65 (R0), #66 (R1). Latest merged DB close on main is **#68** (R2 production-close docs).

**PHASE 1 gate:** FAIL for freeze PASS — required R3–R6 foundations not applied. Audit continues to document gaps.

---

## PHASE 2 — Schema inventory (linked production)

### Public tables present (24) — all RLS = true

`branch_modifier_options`, `branches`, `customers`, `deliveries`, `item_modifier_groups`, `menu_categories`, `menu_items`, `menu_item_variants`, `modifier_groups`, `modifier_options`, `order_item_modifiers`, `order_items`, `order_status_logs`, `orders`, `payments`, `permissions`, `riders`, `role_permissions`, `roles`, `staff`, `staff_invite_events`, `staff_invites`, `user_roles`, `users`

### Required V1 ops tables — missing

| Table | Expected rem | Present? |
|---|---|---|
| `restaurant_tables` | R3 | **No** |
| `dine_in_sessions` | R4 | **No** |
| `kitchen_tickets` | R5 | **No** |
| `kitchen_ticket_items` | R5 | **No** |
| `restaurant_bills` | R6 | **No** |
| `bill_orders` | R6 (junction; not `restaurant_bill_orders`) | **No** |

### Naming notes verified

| Expected informal name | Actual |
|---|---|
| `menu_item_modifier_groups` | **Not a table** — canonical is `item_modifier_groups` |
| `restaurant_bill_orders` | Designed as `bill_orders` on R6 branch (not applied) |

### `profiles`

`to_regclass('public.profiles')` → null. `handle_new_user()` absent. DB-R1 holds on production.

### PK / FK / check spot-check

Core tables (`users`, `orders`, `order_items`, `payments`, `deliveries`, `branches`, `customers`, modifier tables) have primary keys, expected FKs, and status/money CHECKs including `users_phone_e164_check` and order type/status checks. Timestamps present on foundation tables per migrations (not re-dumped here).

---

## PHASE 3 — Security / RLS / grants

Read-only production checks:

| Check | Result |
|---|---|
| Any public table with RLS off | **none** |
| `anon` INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on public tables | **none** |
| `authenticated` TRUNCATE/REFERENCES/TRIGGER | **none** |
| `anon` EXECUTE on SECURITY DEFINER functions | **none** |
| `profiles` / dead `handle_new_user` | **absent** |

Conclusion: **R0 hardening still holds** for the applied surface. R3–R6 security model cannot be production-verified until migrations land.

Branch isolation for orders remains the Slice 2D / helper-function model (`current_user_has_branch_access`, etc.) already on remote.

---

## PHASE 4 — Data quality & indexes

### Anonymized counts (no PII)

| Entity | n |
|---|---|
| branches | 2 |
| menu_categories | 15 |
| menu_items | 67 |
| menu_item_variants | 40 |
| modifier_groups | 8 |
| modifier_options | 27 |
| item_modifier_groups | 105 |
| branch_modifier_options | 0 |
| orders | 1 |
| order_items | 1 |
| order_item_modifiers | 0 |
| payments | 0 |
| deliveries | 1 |
| riders | 0 |
| customers | 0 |
| staff | 0 |
| users | 1 |

**Observation:** Prior freeze/docs copy cited catalog **13 / 58** categories/items; production now shows **15 / 67**. Not mutated in this audit; flag for catalog-governance follow-up (P2), not an R3–R6 apply substitute.

### Indexes present (sample)

`uq_orders_idempotency_key`, `idx_orders_contact_phone_e164`, `users_phone_e164_uidx`, `idx_orders_branch_status`, `idx_orders_auth_user_id`, `idx_order_items_order_id`, `idx_payments_order_id`, `idx_users_auth_user_id`

### Orphans / E.164

| Check | n |
|---|---|
| orders without branch | 0 |
| orphan order_items / payments / deliveries | 0 |
| users phone non-E.164 | 0 |
| orders contact_phone_e164 non-E.164 | 0 |

No P0 data-quality blockers on the applied surface.

---

## PHASE 5 — Roadmap readiness

| Surface | Schema foundation | Gap class | Freeze blocker? |
|---|---|---|---|
| Admin identity / RBAC / branches | Present | UI = P2 | No |
| Customer catalog / modifiers | Present | UI polish = P3 | No |
| Restaurant tables + QR | **Missing (R3)** | **P0** | **Yes** |
| Dine-in sessions | **Missing (R4)** | **P0** | **Yes** |
| Kitchen tickets | **Missing (R5)** | **P0** | **Yes** |
| POS / table bills | **Missing (R6)** | **P0** | **Yes** |
| Rider delivery ops UI | Stub `riders`/`deliveries` present | UI = P2 | No |
| Inventory | Out of V1 schema | P3 deferred | No |

Rule applied: UI gaps are not freeze blockers when foundations exist. Missing R3–R6 foundations **are** blockers.

---

## PHASE 6 — Freeze declaration

Artifacts created/updated on this docs PR:

| Path | Content |
|---|---|
| `docs/database/DATABASE-V1-FREEZE-DECLARATION.md` | BLOCKED declaration (not LOCKED) |
| `docs/database/DATABASE-FREEZE-CHECKLIST.md` | INCOMPLETE — NOT FROZEN |
| `_documentation-audit/reports/DATABASE-V1-FREEZE-REAUDIT.md` | This report |

**Not done (correctly):** marking freeze COMPLETE/FROZEN; claiming OFFICIALLY DECLARED.

### Change-control (binding once PASS is possible)

1. Human Owner approval before any production migration apply  
2. Forward-only migrations only  
3. `migration list --linked` + `db push --linked --dry-run` before apply  
4. SSOT = `supabase/migrations/`

---

## Exact gaps / remediation list

1. **P0:** Merge and owner-approve apply of DB-R3 (`restaurant_tables` + hashed QR) — PR #69  
2. **P0:** Merge and apply DB-R4 (`dine_in_sessions`) — PR #70  
3. **P0:** Merge and apply DB-R5 (`kitchen_tickets`, `kitchen_ticket_items`) — PR #71  
4. **P0:** Merge and apply DB-R6 (`restaurant_bills`, `bill_orders`) — PR #72  
5. **P1:** Close or supersede stale open PRs #65/#66 after confirming no unique unmerged content  
6. **P2:** Refresh `docs/database/production-schema-snapshot.sql` (still documents `profiles`) after R3–R6 land  
7. **P2:** Reconcile catalog count docs (13/58 vs live 15/67) without mutating pricing in freeze window  
8. Re-run DB-R7; only then emit `OFFICIALLY DECLARED AND LOCKED`

---

## Safety confirmations (this engagement)

- No new feature code  
- No migration apply / deploy  
- No Admin/POS/Kitchen/Rider/Inventory UI started  
- No menu/pricing/catalog/branch business-data mutation  
- No auth/OTP changes  
- Docs-only PR; **do not merge until owner approves**

---

## Final line

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```
