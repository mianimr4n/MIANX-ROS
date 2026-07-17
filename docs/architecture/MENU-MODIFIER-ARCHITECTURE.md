# Menu Modifier Architecture

**Status:** Canonical design (aligned with merged PR #63)  
**Date:** 2026-07-18  
**Freeze class:** **REQUIRED BEFORE DATABASE FREEZE** (schema shipped in `main`; production apply + branch-availability gap still open)  
**Related:** PR #63 `feature/menu-modifier-system` · `supabase/migrations/20260718120000_product_modifier_system.sql`

---

## 1. Purpose

Relational modifiers let Admin configure crust, extras, drinks, and sides without code changes. Server-side quote/create resolves prices; historical orders keep immutable snapshots.

## 2. Naming reconciliation (locked)

| Spec / informal name | Canonical table (PR #63) | Decision |
|---|---|---|
| `modifier_groups` | `modifier_groups` | Keep |
| `modifier_options` | `modifier_options` | Keep |
| `menu_item_modifier_groups` | **`item_modifier_groups`** | **Do not rename.** Docs and future migrations use `item_modifier_groups`. |
| `order_item_modifiers` | `order_item_modifiers` | Keep |

Any new design that invents `menu_item_modifier_groups` is **rejected** as conflicting with shipped schema.

## 3. Tables (shipped)

### `modifier_groups`

Reusable groups: `code`, `name`, `selection_type` (`single`|`multi`), `min_select` / `max_select`, `is_required`, `sort_order`, `is_active`.

Seeded codes: `size`, `crust`, `extra-chicken`, `extra-cheese`, `extra-vegetables`, `extra-toppings`, `add-drinks`, `add-sides`.

### `modifier_options`

Options under a group: `price_delta`, optional `price_delta_by_size` jsonb, optional `size_code`, optional `linked_menu_item_id`, `is_default`, `is_active`.

### `item_modifier_groups`

Attach groups to `menu_items` with optional per-item overrides of required/min/max.

### `order_item_modifiers`

Per line-item snapshots: group/option codes + names + `price_delta` + quantity. Nullable FK `modifier_option_id` (`ON DELETE SET NULL`) so catalog deletes do not rewrite history.

## 4. Size vs crust vs toppings

| Concern | Model |
|---|---|
| Pizza **size** pricing | Remains on `menu_item_variants` (Small/Medium/Large) |
| Reusable `size` modifier group | Seeded for future non-variant items; **not** attached to pizzas today |
| Crust / extras / drinks / sides | Modifier groups attached via `item_modifier_groups` |
| Legacy topping SKUs (`product_type = topping`) | Remain as menu items; options may `linked_menu_item_id` to them |

## 5. Pricing & quote binding

1. Client sends selected modifier option IDs (not money).
2. API resolves live options + size tier → `price_delta` (or `price_delta_by_size[size]`).
3. Line unit = variant/base price + Σ modifier deltas.
4. Quote token binds item + variant + modifier set; create rejects stale quotes.
5. Persist `order_item_modifiers` rows + keep `order_items.extras_snapshot` for backward-compatible Admin/WhatsApp display.

## 6. Historical stability

- Never mutate past `order_item_modifiers` when catalog prices change.
- Reorder copies **snapshot** names/prices into a new quote, then re-prices against live catalog (or fails if options inactive).
- WhatsApp / track / receipt read snapshots, not live option rows.

## 7. Branch availability (gap — pre-freeze)

PR #63 has **global** active flags only. Owner requirement for per-branch option availability needs a forward-only extension before freeze:

**Recommended (additive):**

```text
branch_modifier_options (
  branch_id, modifier_option_id,
  is_available boolean not null default true,
  unique (branch_id, modifier_option_id)
)
```

Semantics: absent row ⇒ available (default-open); explicit `false` hides/disables for that branch. Quote/create must filter by order `branch_id`.

Alternative (defer if owner rejects): branch availability inherited from linked `menu_items` / future branch-menu matrix only — document owner decision in remediation plan.

## 8. RLS / grants (target)

| Table | anon/auth | service_role |
|---|---|---|
| `modifier_groups`, `modifier_options`, `item_modifier_groups` | SELECT active | full DML |
| `order_item_modifiers` | SELECT own/branch orders | full DML |
| `branch_modifier_options` (planned) | SELECT | full DML |

Align with P0 grant hardening (no TRUNCATE / no anon writes).

## 9. Backward compatibility

| Channel | Behavior |
|---|---|
| Delivery / pickup / dine-in without modifiers | Unchanged; empty modifier list |
| Orders with only `extras_snapshot` | Still readable |
| Website static fallback catalog | Present until remote migration applied |
| Topping product_type SKUs | Unchanged |

## 10. Freeze checklist items

- [x] Relational tables designed and migrated in repo (`20260718120000`)
- [ ] Migration applied to linked production (verify via migration list)
- [ ] Branch availability table designed + migrated **or** owner defers with written sign-off
- [ ] Static tests + pricing tests remain green
- [ ] No rename of `item_modifier_groups`
