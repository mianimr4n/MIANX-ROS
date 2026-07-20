# DB-R2 — Menu modifiers production close

**Status:** PASS AND CLOSED  
**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee` (Telepizza)  
**PR:** [#67](https://github.com/mianimr4n/telepizza/pull/67) — **MERGED**  
**Merge commit:** `72a232c55a4c0434255e225516889415fffa59d9`  
**Owner gate:** Formally approved for DB-R2 production apply

## Freeze position (unchanged overall)

```text
DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
```

R2 complete does **not** unfreeze. Still **BLOCKED** pending **R3–R7** (restaurant tables/QR, dine-in, kitchen, POS foundations, RLS extensions). Do not start DB-R3/R4 in this close.

## PHASE 1 — Merge

| Check | Result |
|---|---|
| PR #67 draft? | No — already ready |
| Merge strategy | Merge commit (repo standard; matches prior PRs) |
| Merge SHA | `72a232c55a4c0434255e225516889415fffa59d9` |
| Local `main` pulled; clean tree | PASS |

## PHASE 2 — Production migration

| Check | Result |
|---|---|
| Linked project | `pyeowxvacgypohrbvgee` |
| `npx supabase migration list --linked` (pre) | Local-only: `20260718120000`, `20260718130200`; R0/R1 already remote |
| Dry-run | `npx supabase db push --linked --dry-run --include-all` → those two only |
| Apply | `npx supabase db push --linked --include-all` |

### Migrations applied (DB-R2 only)

1. `20260718120000_product_modifier_system.sql`
2. `20260718130200_db_r2_modifier_owner_alignment.sql`

R0 (`…130000`) / R1 (`…130100`) were already on remote; not re-applied. No unrelated future migrations present or applied.

### Post-apply tables

| Table | Present | Notes |
|---|---|---|
| `modifier_groups` | Yes | Catalog |
| `modifier_options` | Yes | Catalog |
| `item_modifier_groups` | Yes | Canonical junction; ≡ informal `menu_item_modifier_groups` (no second table) |
| `order_item_modifiers` | Yes | Order snapshots |
| `branch_modifier_options` | Yes | Part of R2; default-open when row absent |
| `menu_item_modifier_groups` | No | Alias name only — not a physical table |

Seed spot-check (additive; no wipe): `modifier_groups=8`, `modifier_options=27`, `item_modifier_groups=105`, `branch_modifier_options=0`, `order_item_modifiers=0`. Existing `orders=1`, `order_items=1`, `branches=2` unchanged.

### RLS / grants

| Check | Result |
|---|---|
| RLS enabled | All five modifier tables |
| Catalog policies | SELECT-only public read on active/available catalog rows |
| `order_item_modifiers` policies | SELECT-only (customer own / staff branch) — no client write policies |
| `anon` / `authenticated` grants | SELECT on catalog tables; `order_item_modifiers` = authenticated SELECT only (no anon) |
| `service_role` | Full DML on all five |
| Client DML | None |

## PHASE 3 — Regression & smoke

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test:db` | PASS (137) |
| `pnpm test:backend` | PASS (128) |
| `pnpm build:website` | PASS |
| `git diff --check` | PASS |

### Production API (`https://telepizza-api.onrender.com`)

| Check | Result |
|---|---|
| `GET /healthz` | 200 |
| `GET /readyz` | 200, `issues: []`, Supabase URL = `pyeowxvacgypohrbvgee` |
| Catalog | **13 / 58 / 3 / 40 / 7** (categories / items / toppings / variants / deals) |
| Branches | **2** |
| Existing orders | Spot-check: `orders=1`, `order_items=1` — no wipe |

No credentials or PII recorded in this report. No unapproved app deploy performed this turn (API already serving main; schema-only R2).

## Safety confirmation

- Applied DB-R2 migrations only
- Did **not** start DB-R3/R4 or unrelated schema
- Did **not** delete topping SKUs
- No secrets in repo artifacts

## Next step

**DB-R3+** — core restaurant foundations — require separate owner gates. Freeze remains **BLOCKED** until R3–R7 complete.

---

DB-R2 — MENU MODIFIERS: PASS AND CLOSED
