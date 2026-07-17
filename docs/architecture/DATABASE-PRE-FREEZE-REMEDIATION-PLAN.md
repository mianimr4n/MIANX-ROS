# Database Pre-Freeze Remediation Plan

**Status:** Plan only — **do not apply production migrations from this document**  
**Date:** 2026-07-18  
**Branch:** `architecture/core-restaurant-pre-freeze`  
**Prior art:** PR #62 (`audit/database-pre-freeze-completeness`) · PR #63 (modifiers, merged)

---

## Freeze position (locked)

**DATABASE FREEZE MUST REMAIN BLOCKED.**

Verdict string (use everywhere):

```text
DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
```

## Blockers (all must clear before freeze)

### A. Privilege / drift (from PR #62 — still open)

| ID | Item | Class |
|---|---|---|
| P0 | Grant hardening + SECURITY DEFINER EXECUTE revoke | **REQUIRED BEFORE FREEZE** |
| P1 | Retire unmanaged `public.profiles` + dead `handle_new_user` | **REQUIRED BEFORE FREEZE** (or owner written deferral) |

Design SQL remains under `docs/database/remediation/` (not applied in docs PRs).

### B. Core restaurant foundations (owner scope change)

| Domain | Status | Class |
|---|---|---|
| Menu modifiers | Repo migration merged (PR #63); prod apply + branch availability gap | **REQUIRED BEFORE FREEZE** |
| Restaurant tables | Absent | **REQUIRED BEFORE FREEZE** |
| Secure table QR tokens | Absent | **REQUIRED BEFORE FREEZE** |
| Dine-in sessions | Absent | **REQUIRED BEFORE FREEZE** |
| Order nullable extensions | Absent | **REQUIRED BEFORE FREEZE** |
| Kitchen stations/tickets/items | Absent | **REQUIRED BEFORE FREEZE** |
| POS sessions + bills + bill_orders | Absent | **REQUIRED BEFORE FREEZE** |
| Payment splits | Not designed as freeze need | **SAFE FOR POS FEATURE PHASE** |
| Admin / POS / Kitchen / Rider **UI** | Not started | **NOT A FREEZE BLOCKER** |
| Inventory / loyalty / finance / devices | Absent | **NOT REQUIRED FOR V1 FREEZE** |

---

## Implementation slices (ordered)

Each slice: migration → API impact → tests → backward compatibility → rollout → rollback → owner gate.

### DB-R0 — P0 grants + DEFINER EXECUTE

| Field | Detail |
|---|---|
| Migration | Promote `docs/database/remediation/P0_harden_grants_and_definer_execute.sql` to versioned migration after owner approve |
| API | None expected if service_role path unchanged |
| Tests | `test:db` grant assertions; authz regression |
| Compat | Clients relying on over-broad anon DML break (intended) |
| Rollout | Off-peak; verify `/readyz` + catalog SELECT |
| Rollback | Forward-fix restore grants only if emergency (prefer forward) |
| Owner gate | Approve P0 design |

### DB-R1 — P1 profiles retirement

| Field | Detail |
|---|---|
| Migration | `P1_retire_unmanaged_profiles.sql` → versioned |
| API | None |
| Tests | Assert `profiles` absent; `handle_new_user` gone |
| Compat | Zero-row guard mandatory |
| Rollout | After R0 |
| Rollback | Recreate empty table only if Auth dashboard depends (should not) |
| Owner gate | Approve drop |

### DB-R2 — Menu modifiers production apply + branch availability

| Field | Detail |
|---|---|
| Migration | Ensure `20260718120000_product_modifier_system` on remote; add `branch_modifier_options` (or owner-deferred) |
| API | Quote/create already modifier-aware; filter by branch when availability table lands |
| Tests | Existing product-modifier + pricing tests; branch hide cases |
| Compat | `extras_snapshot` retained; delivery/pickup OK |
| Rollout | Catalog-first; website already has fallback |
| Rollback | Do not drop snapshot tables; deactivate groups |
| Owner gate | Confirm crust/topping deltas; branch-availability required vs deferred |

### DB-R3 — Restaurant tables + QR token hash

| Field | Detail |
|---|---|
| Migration | `restaurant_tables` + indexes + RLS |
| API | Internal rotate/issue helpers; public resolve stub OK |
| Tests | Unique (branch, table_number); hash lookup; rotation invalidates |
| Compat | No order impact yet |
| Rollout | Seed tables per branch after owner list |
| Rollback | Drop table only if unused (forward-only prefer deactivate) |
| Owner gate | Table numbering scheme; QR URL domain |

### DB-R4 — Dine-in sessions + order extensions

| Field | Detail |
|---|---|
| Migration | `dine_in_sessions`; nullable FKs on `orders`; partial unique active session |
| API | Session open/close; create order binds session for dine-in |
| Tests | One active session/table; branch match; delivery rejects session IDs |
| Compat | Legacy dine-in without session allowed until cutover |
| Rollout | Feature flag QR path |
| Rollback | Null out FKs; close sessions |
| Owner gate | Require session for all new dine-in? (Y/N) |

### DB-R5 — Kitchen stations + tickets + ticket items

| Field | Detail |
|---|---|
| Migration | `kitchen_stations`, `kitchen_tickets`, `kitchen_ticket_items` |
| API | Create tickets on confirm; status transitions service-side |
| Tests | Branch isolation; unique (order, station); cancel cascades |
| Compat | Orders without tickets still valid until confirm path wires |
| Rollout | Default stations seed per branch |
| Rollback | Stop creating tickets; leave historical rows |
| Owner gate | Default product_type routing OK without per-item map? |

### DB-R6 — POS sessions + restaurant bills + bill_orders

| Field | Detail |
|---|---|
| Migration | `pos_sessions`, `restaurant_bills`, `restaurant_bill_orders` |
| API | Minimal create/settle stubs (no full POS UI) |
| Tests | Bill↔order uniqueness; branch match |
| Compat | Delivery ignores bills |
| Rollout | Staff-only |
| Rollback | Void open bills |
| Owner gate | Bill number format |

### DB-R7 — RBAC permissions seed + RLS policies for new tables

| Field | Detail |
|---|---|
| Migration | Permission codes + role maps + RLS policies (see RLS matrix update) |
| API | AuthPrincipal checks for new codes |
| Tests | Negative: wrong branch denied; QR cannot settle bill |
| Compat | Existing roles keep current powers |
| Rollout | After R3–R6 tables exist |
| Rollback | Revoke new codes |
| Owner gate | Which roles get `kitchen.*` / `pos.*` / `table.*` |

---

## Recommended apply order

```text
DB-R0 → DB-R1 → DB-R2 → DB-R3 → DB-R4 → DB-R5 → DB-R6 → DB-R7
```

Modifiers (R2) may proceed in parallel with R0/R1 **only** if grant hardening still completes before freeze declaration.

## Explicitly out of scope for freeze

- Admin / POS / Kitchen / Rider UI implementation
- Payment provider capture
- `payment_splits`
- Per-branch physical databases or schemas
- Inventory / BOM / loyalty / notifications

## Success criteria for unblocking freeze

1. P0 + P1 applied (or P1 deferred with signed owner waiver).
2. DB-R2…R6 schemas applied on linked production.
3. DB-R7 policies/grants verified against matrix.
4. Delivery/pickup quote/create/track regression green.
5. Migration list aligned; dry-run clean.
6. Owner signs freeze checklist.
