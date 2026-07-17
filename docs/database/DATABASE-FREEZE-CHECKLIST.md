# Database Freeze Checklist

**Branch:** `architecture/core-restaurant-pre-freeze`
**Date:** 2026-07-18
**Linked project:** `pyeowxvacgypohrbvgee`
**Extends:** PR #62 audit checklist · owner scope change 2026-07-18

## Phase 0 — Safety (required every freeze attempt)

- [ ] Latest `main` pulled; clean working tree
- [ ] Linked project ref = `pyeowxvacgypohrbvgee`
- [ ] `npx supabase migration list --linked` — local ≡ remote
- [ ] `npx supabase db push --linked --dry-run` — no unexpected pending apply during docs-only work
- [x] No production mutation during architecture docs PR
- [x] No credentials exposed in docs
- [x] No Admin/POS/Kitchen/Rider UI in this PR
- [x] No per-branch physical SQL tables proposed

## Schema completeness

- [x] Inventory of managed public tables documented (PR #62 + modifiers from PR #63)
- [x] FKs / checks / indexes inventoried
- [x] Functions + triggers inventoried
- [x] Schema-only snapshot captured with DO NOT EXECUTE header
- [ ] **P0 grant remediation applied** (BLOCKS FREEZE)
- [ ] **P1 profiles retirement applied or owner-signed deferral** (BLOCKS FREEZE)
- [ ] **Menu modifiers applied on linked prod + branch-availability disposition** (BLOCKS FREEZE)
- [ ] **`restaurant_tables` + QR hash model applied** (BLOCKS FREEZE)
- [ ] **`dine_in_sessions` + order nullable extensions applied** (BLOCKS FREEZE)
- [ ] **Kitchen stations/tickets/items applied** (BLOCKS FREEZE)
- [ ] **`pos_sessions` + `restaurant_bills` + `restaurant_bill_orders` applied** (BLOCKS FREEZE)
- [ ] **RBAC/RLS for new restaurant domain applied** (BLOCKS FREEZE)

## `public.profiles` decision

- [x] Classification recorded: **UNMANAGED PRODUCTION DRIFT**
- [ ] Owner approves retirement migration design
- [ ] Retirement migration applied (forward-only) — **not done**

## Grants / RLS

- [x] Expected model locked in `DATABASE-RLS-AND-GRANTS-MATRIX.md` (updated for restaurant domain)
- [x] Drift documented (TRUNCATE + DEFINER EXECUTE + over-broad anon DML)
- [ ] P0 hardening migration applied + re-verified

## Roadmap readiness (tables)

| Domain | Freeze status |
|---|---|
| Customer identity (`users`) | Present — grants must harden |
| Staff / RBAC | Present — extend permissions for table/kitchen/POS |
| Branches / Menu | Present |
| Menu modifiers | **In repo (PR #63)** — **local only; NOT on linked remote yet** (dry-run would push `20260718120000`); branch availability gap |
| Orders + status logs + snapshots | Present — needs nullable dine-in FKs |
| Delivery / riders skeleton | Present (ops APIs deferred) |
| Payments skeleton | Present (locked) |
| Restaurant tables + QR | **ABSENT — REQUIRED BEFORE FREEZE** |
| Dine-in sessions | **ABSENT — REQUIRED BEFORE FREEZE** |
| Kitchen tickets | **ABSENT — REQUIRED BEFORE FREEZE** |
| POS sessions + bills | **ABSENT — REQUIRED BEFORE FREEZE** |
| `payment_splits` / offline POS / printers | **SAFE FOR POS FEATURE PHASE** |
| Admin / POS / Kitchen / Rider **UI** | **Not a DB freeze blocker** |
| Inventory / BOM / suppliers / finance / loyalty / coupons / notifications / devices | **Not required for V1 freeze** |

## Data quality (read-only)

- [x] Prior PR #62 orphan/monetary/topping spot-checks recorded
- [ ] Re-run quality pack after grant + restaurant foundation apply

## Performance

- [x] Core indexes present for branch/status, customer, order items, idempotency, phone E.164
- [ ] New indexes for sessions/tickets/bills as designed in architecture docs
- [ ] Optional P2 indexes before admin volume — does not unblock freeze alone

## Audit / retention

- [x] `order_status_logs` + `staff_invite_events` exist
- [ ] Owner accepts retention recommendation
- [ ] Kitchen ticket events — feature phase OK if order_status_logs covers bumps initially

## Validation commands (docs PR)

```bash
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
| Migration history aligned | Re-verify on each attempt |
| Dry-run clean (docs-only) | Re-verify — no prod push |
| P0 remediations applied | **FAIL — not applied** |
| P1 profiles disposition | **FAIL — pending** |
| Core restaurant foundations | **FAIL — not migrated** |
| UI complete | N/A — not required for freeze |

**Freeze recommendation:** **BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**

DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
