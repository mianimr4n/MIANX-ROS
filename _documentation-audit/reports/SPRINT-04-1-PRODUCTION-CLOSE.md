# Sprint 4.1 — PRODUCTION CLOSE

**Date:** 2026-07-16  
**Scope:** Schema / state-machine / idempotency foundation only  
**Architecture:** O1–O12 APPROVED / FROZEN  
**Catalog freeze:** v1.2.0 unchanged (13 categories / 58 items / 3 toppings / 40 variants / 7 deals / 2 branches)

---

## Outcome

Sprint 4.1 production migration applied, API verified on latest `main`, smoke orders cleaned. No Sprint 4.2 features added (`quoteId` / `expiresAt` / `warnings[]` absent).

---

## Preconditions confirmed

| Check | Result |
|---|---|
| Working tree clean on `main` before apply | ✅ |
| PR #35 code present on `main` | ✅ merge `630d0cc` (`d677e0c` feat) |
| Exact Sprint 4.1 migration | ✅ `supabase/migrations/20260716120000_sprint4_1_orders_quote_snapshots.sql` |
| Remote history before apply | ✅ through `20260716103000` only; `20260716120000` pending |
| Docs PR #37 | ✅ already **MERGED** (`85ade8b`, 2026-07-16T05:45:49Z) — docs-only (4.1 vs 4.2 renumber, O1–O12 freeze, idempotency contract, PR #35 inventory). No further merge action required. |
| Sprint 4.2 authorization | ❌ not authorized — not started |

---

## Logical backup (pre-migrate)

Snapshot directory: `/tmp/sprint41-pre-migrate-backup/`

| Artifact | Contents |
|---|---|
| `orders.json` / `orders_rest.json` | 1 existing order (`TP-MRMSVWJG-4784`) |
| `order_items.json` / `order_items_rest.json` | 1 line item |
| `order_status_logs_exists.json` | table absent pre-migrate |
| `customers_referenced.json` / `users_referenced.json` | empty (guest order; no FK links) |
| `migration_history.json` | versions through `20260716103000` |
| `orders_schema_before.json` | pre-4.1 column inventory |
| `orders_constraints_before.json` | status / type / source / payment checks |

---

## Dry-run

Wrapped migration SQL in `BEGIN` … verify … `ROLLBACK` via Supabase Management API `database/query`.

- Inside txn: `order_status_logs` created successfully.
- After rollback: `contact_phone_e164` / `idempotency_key` absent; `order_status_logs` gone.

---

## Production apply

| Step | Detail |
|---|---|
| Migration | `20260716120000_sprint4_1_orders_quote_snapshots` |
| Method | Management API SQL (transactional `BEGIN`/`COMMIT`) |
| Recorded in | `supabase_migrations.schema_migrations` |
| Extra ops grant | `GRANT` on `order_status_logs` to `anon` / `authenticated` / `service_role` (same pattern as `grant_public_access`; not a dashboard edit) |
| PostgREST | `NOTIFY pgrst, 'reload schema'` |
| Sprint 4.2 SQL | **not applied** (none pending / none authorized) |
| Manual dashboard edits | **none** |

### Objects created

**`orders` columns:** `contact_phone_e164`, `idempotency_key`, `idempotency_request_hash`, `pricing_snapshot`, `cancel_reason_code`, `cancel_note`

**`order_items` columns:** `extras_snapshot`, `food_unit_price`

**Table:** `order_status_logs` (+ RLS enabled; index `idx_order_status_logs_order_id`)

**Indexes:** `uq_orders_idempotency_key` (partial unique), `idx_orders_contact_phone_e164`

**Unchanged:** `orders_status_check` enum values  
`pending | confirmed | preparing | ready | dispatched | completed | cancelled`

**Data safety:** pre-existing order `TP-MRMSVWJG-4784` untouched (same totals / phone / status); order count returned to 1 after smoke cleanup.

---

## Deploy

| Surface | Action |
|---|---|
| Render API (`telepizza-api.onrender.com`) | **No manual redeploy required** — already serving PR #35 `main` (Idempotency-Key gate + server pricing). `/healthz` 200, `/readyz` 200. |
| Vercel website | **Skipped** — Sprint 4.1 / PR #35 did not change `apps/website`. Site `/`, `/menu`, `/checkout` return 200; WA `0304-1110495` still in bundle. |

---

## Production verification

### A. Health

| Endpoint | Result |
|---|---|
| `GET /healthz` | ✅ 200 |
| `GET /readyz` | ✅ 200 |

### B. Schema

| Check | Result |
|---|---|
| Snapshot columns / `order_status_logs` exist | ✅ |
| `contact_phone_e164` stores canonical `+923…` | ✅ smoke `03451234567` → `+923451234567` (API `normalizePhoneE164`) |
| Idempotency key + request hash + unique index | ✅ |
| Status history rows on create (`actor_type=guest`) | ✅ |
| Status enums unchanged | ✅ |
| No destructive change to existing order | ✅ |

### C. Order create

| Case | Result |
|---|---|
| POST without `Idempotency-Key` | ✅ 400 `IDEMPOTENCY_KEY_REQUIRED` |
| Same key + same payload | ✅ 201 then 200 replay (`idempotentReplay: true`, same `orderNumber`) |
| Same key + different payload | ✅ 409 `IDEMPOTENCY_CONFLICT` |
| Client `unitPrice: 1` ignored | ✅ server total **549** = 499 food + 50 topping |
| Invalid item / variant / topping | ✅ `MENU_ITEM_NOT_FOUND` / `VARIANT_NOT_FOUND` / `TOPPING_NOT_FOUND` |
| Guest checkout (no auth) | ✅ create + `order_status_logs.actor_type=guest` |

### D. Regression

| Check | Result |
|---|---|
| Catalog 13 / 58 / 3 / 40 / 7 | ✅ (34 item variants + 6 topping variants = 40) |
| Branches = 2 | ✅ |
| `GET /api/v1/auth/me` | ✅ 401 without/invalid token (endpoint live) |
| Staff invites | ✅ `GET /api/v1/admin/staff/invites` still auth-gated (401) |
| WhatsApp ordering number | ✅ `0304-1110495` (API branch + website bundle) |
| Website checkout / cart load | ✅ 200 |

### E. Cleanup

| Check | Result |
|---|---|
| Smoke orders + items + status logs deleted | ✅ |
| No `sprint41-smoke-%` idempotency keys remain | ✅ |
| Remaining production orders | ✅ 1 (`TP-MRMSVWJG-4784`) |

---

## Explicit non-goals (honored)

- Did **not** start Sprint 4.2
- Did **not** add `quoteId` / `expiresAt` / `warnings[]`
- Did **not** merge anything for PR #37 (already merged; docs-only)
- Did **not** modify O1–O12
- Did **not** start kitchen / rider / staff lifecycle
- Did **not** deploy unapproved changes

---

## Meri note — PR #37

PR #37 already meets the merge gate (docs-only: 4.1 vs 4.2 numbering, O1–O12 frozen, idempotency contract, PR #35 inventory) and is on `main`. No further docs merge action in this close.

**Next authorized order (owner):** Sprint 4.2 — Quote + Server Pricing Engine (`quoteId`, `expiresAt`, `warnings[]`).

---

## Evidence pointers

- Migration file: `supabase/migrations/20260716120000_sprint4_1_orders_quote_snapshots.sql`
- Code: PR #35 / `d677e0c` on `main`
- Architecture freeze docs: PR #37 / `1ec82ac`
- Pre-migrate backup: `/tmp/sprint41-pre-migrate-backup/`

---

SPRINT 4.1: PASS AND CLOSED
