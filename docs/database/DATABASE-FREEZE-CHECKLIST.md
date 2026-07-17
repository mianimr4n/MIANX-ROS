# Database Freeze Checklist

**Branch:** `audit/database-pre-freeze-completeness`  
**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`

## Phase 0 — Safety (required every freeze attempt)

- [x] Latest `main` pulled; clean working tree
- [x] Linked project ref = `pyeowxvacgypohrbvgee`
- [x] `npx supabase migration list --linked` — local ≡ remote (16/16)
- [x] `npx supabase db push --linked --dry-run` — Remote database is up to date
- [x] No production mutation during audit
- [x] No credentials exposed in docs

## Schema completeness

- [x] Inventory of all public tables documented
- [x] FKs / checks / indexes inventoried
- [x] Functions + triggers inventoried
- [x] Schema-only snapshot captured with DO NOT EXECUTE header
- [ ] **P0 grant remediation applied** (BLOCKS FREEZE)
- [ ] **P1 profiles retirement applied or explicitly deferred with owner sign-off** (BLOCKS FREEZE if deferred without sign-off)

## `public.profiles` decision

- [x] Classification recorded: **UNMANAGED PRODUCTION DRIFT**
- [ ] Owner approves retirement migration design
- [ ] Retirement migration applied (forward-only) — **not done in this audit**

## Grants / RLS

- [x] Expected model locked in `DATABASE-RLS-AND-GRANTS-MATRIX.md`
- [x] Drift documented (TRUNCATE + DEFINER EXECUTE + over-broad anon DML)
- [ ] P0 hardening migration applied + re-verified

## Roadmap readiness (tables)

| Domain | Freeze status |
|---|---|
| Customer identity (`users`) | Present — grants must harden |
| Staff / RBAC | Present |
| Branches / Menu | Present |
| Orders + status logs + snapshots | Present |
| Delivery / riders skeleton | Present (ops APIs deferred) |
| Payments skeleton | Present (locked) |
| Admin / POS / Kitchen APIs | **Not required for DB freeze** — feature phase |
| Inventory / BOM / suppliers / finance / loyalty / coupons / notifications / devices | **Not required for V1** |

## Data quality (read-only)

- [x] Orphan FK spot-checks (T0): no orphan order items/deliveries/variants; auth↔users link OK
- [x] Monetary negatives: 0
- [x] Topping SKUs present: 3
- [ ] Re-run quality pack after grant remediation

## Performance

- [x] Core indexes present for branch/status, customer, order items, idempotency, phone E.164
- [ ] Optional P2 indexes before admin volume (created_at, status-only) — does not block freeze after P0/P1

## Audit / retention

- [x] `order_status_logs` + `staff_invite_events` exist
- [ ] Owner accepts retention recommendation in audit report
- [ ] Optional general `audit_events` — feature phase (P2/P3)

## Validation commands (docs PR)

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:db
pnpm test:backend
pnpm build:website
git diff --check
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

## Freeze gate

| Gate | Result |
|---|---|
| Migration history aligned | PASS |
| Dry-run clean | PASS |
| P0 remediations applied | **FAIL — not applied (design only)** |
| P1 profiles disposition | **FAIL — owner decision + migration pending** |

**Freeze recommendation:** **BLOCKED — REMEDIATION REQUIRED**
