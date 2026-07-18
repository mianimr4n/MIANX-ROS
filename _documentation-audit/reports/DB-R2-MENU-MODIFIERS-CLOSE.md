# DB-R2 — Menu modifiers (implementation close)

**Branch:** `feature/db-r2-menu-modifiers`  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Status:** Ready for owner review — **not applied** to production

## Scope

- Refine unapplied `20260718120000_product_modifier_system.sql` (PR #63 base; never on remote)
- Additive `20260718130200_db_r2_modifier_owner_alignment.sql` for locals that already applied the older shape
- Docs + static DB tests + snapshot write of `unit_price` / `total_price`
- Carry R0/R1 migration files for history alignment with prod (already applied remotely via #65/#66 apply path)

## Out of scope

- Production `db push` / apply
- DB-R3+ restaurant tables/sessions
- Website / UI feature work
- Deleting topping SKUs

## Apply note (owner gate)

Remote history has R0 (`…130000`) and R1 (`…130100`) applied while modifiers (`…120000`) are still local-only. Do **not** blind-push; review dry-run and approve DB-R2 explicitly.
