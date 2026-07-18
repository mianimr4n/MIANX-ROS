# Database V1 Freeze Declaration

**Status:** BLOCKED — NOT DECLARED  
**Audit:** DB-R7 Full Database Re-Audit  
**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Branch base:** `main` @ `9c1d21c` (PR #68)  
**Docs PR:** `audit/db-r7-v1-freeze-declaration`

---

## Verdict

Owner claim that **DB-R0 through DB-R6 are CLOSED & APPLIED** is **false**.

Independent verification against linked production shows:

| Rem | Migration(s) | On `main` | On linked remote | PR gate |
|---|---|---|---|---|
| DB-R0 | `20260718130000_p0_harden_grants_and_definer_execute` | Yes (via #67) | Yes | #65 still OPEN (superseded content landed in #67) |
| DB-R1 | `20260718130100_p1_retire_unmanaged_profiles` | Yes (via #67) | Yes | #66 still OPEN (superseded content landed in #67) |
| DB-R2 | `20260718120000` + `20260718130200` | Yes (#67 / #68) | Yes | MERGED |
| DB-R3 | `20260718140000_db_r3_restaurant_tables` | **No** | **No** | [#69](https://github.com/mianimr4n/telepizza/pull/69) **OPEN** |
| DB-R4 | `20260718150000_db_r4_dine_in_sessions` | **No** | **No** | [#70](https://github.com/mianimr4n/telepizza/pull/70) **OPEN** |
| DB-R5 | `20260718160000_db_r5_kitchen_tickets` | **No** | **No** | [#71](https://github.com/mianimr4n/telepizza/pull/71) **OPEN** |
| DB-R6 | `20260718170000_db_r6_pos_bill_foundation` | **No** | **No** | [#72](https://github.com/mianimr4n/telepizza/pull/72) **OPEN** |

**Freeze may not be officially declared** until R3–R6 are merged to `main`, applied to linked production with owner approval, and re-audited.

---

## Alignment evidence (PHASE 1)

Commands run 2026-07-18 against project `pyeowxvacgypohrbvgee`:

```text
npx supabase migration list --linked
# From clean main: local ≡ remote for all 20 migrations through 20260718130200
# R3–R6 absent from both main and remote

npx supabase db push --linked --dry-run
# From clean main: "Remote database is up to date."
# From feature/db-r6 stack: would push R3–R6 (not applied)
```

No unmanaged remote-only migrations detected on the `main` baseline. Gap is **missing foundation migrations**, not history drift.

---

## What is frozen today (partial baseline only)

These tables exist on production with RLS enabled (read-only inventory). They are **not** a complete V1 freeze surface because restaurant ops foundations are absent.

### Identity / RBAC
`users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `customers`, `staff`, `staff_invites`, `staff_invite_events`

### Branches / catalog
`branches`, `menu_categories`, `menu_items`, `menu_item_variants`, `modifier_groups`, `modifier_options`, `item_modifier_groups` (canonical junction; **not** `menu_item_modifier_groups`), `branch_modifier_options`

### Orders / kitchen-adjacent / payments / delivery
`orders`, `order_items`, `order_item_modifiers`, `order_status_logs`, `payments`, `riders`, `deliveries`

### Confirmed absent (required for freeze PASS)
`restaurant_tables`, `dine_in_sessions`, `kitchen_tickets`, `kitchen_ticket_items`, `restaurant_bills`, `bill_orders`

### Confirmed retired
`public.profiles` — **gone**; `public.handle_new_user()` — **gone**

---

## Applied migrations (R0–R2 only)

Through `20260718130200` on both `main` and linked remote. Full ordered list matches `supabase/migrations/` on `main` (20 files). R3–R6 files exist only on open feature PR branches and must not be treated as applied.

---

## Security summary (production spot-check)

| Check | Result |
|---|---|
| RLS on all public base tables | PASS — none with `rowsecurity = false` |
| `anon` table write grants (INSERT/UPDATE/DELETE/…) | PASS — none |
| `authenticated` TRUNCATE/REFERENCES/TRIGGER | PASS — none |
| `anon` EXECUTE on SECURITY DEFINER | PASS — none |
| `public.profiles` | PASS — retired |
| R3–R6 RLS/grants | **N/A — tables not present** |

R0 hardening migrations are applied and spot-checks hold for the current table set. Freeze still blocked on missing domains.

---

## Deferred features (explicit)

UI for Admin / POS / Kitchen / Rider / Inventory remains out of freeze scope. Schema foundations for restaurant tables, dine-in sessions, kitchen tickets, and POS bills are **not deferred** — they are **required and currently missing** (P0 blockers).

---

## Change-control policy (applies once freeze can PASS)

1. **Owner Approval** — no production schema apply without Human Owner sign-off.
2. **Forward-Only Migration** — no edit of already-applied migration files; repair via new forward migration.
3. Canonical SSOT remains `supabase/migrations/` per `DATABASE-MIGRATION-WORKFLOW.md`.
4. Always verify with `migration list --linked` + `db push --linked --dry-run` before apply.

---

## Required remediation before re-declaration

1. Owner-review and merge PRs **#69 → #70 → #71 → #72** (or equivalent stacked merge) onto `main`.
2. Owner-approve production apply of R3–R6 only.
3. `npx supabase db push --linked --dry-run` must show only those reviewed files; then apply.
4. Re-run DB-R7 audit; only then may declaration flip to LOCKED.

---

## Final line

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```

This document does **not** constitute an official freeze. Do not treat schema as locked for Kitchen/POS/Ops UI build-out until a follow-up DB-R7 PASS replaces this declaration.
