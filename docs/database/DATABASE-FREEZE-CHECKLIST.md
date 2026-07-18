# Database Freeze Checklist

**Status:** INCOMPLETE — NOT FROZEN  
**Audit:** DB-R7 (2026-07-18)  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Companion declaration:** [`DATABASE-V1-FREEZE-DECLARATION.md`](./DATABASE-V1-FREEZE-DECLARATION.md)  
**Full report:** [`../../_documentation-audit/reports/DATABASE-V1-FREEZE-REAUDIT.md`](../../_documentation-audit/reports/DATABASE-V1-FREEZE-REAUDIT.md)

---

## Legend

| Symbol | Meaning |
|---|---|
| `[x]` | Verified with evidence |
| `[~]` | Partial |
| `[ ]` | Failed / not started |
| `N/A` | Not applicable (justify) |

---

## A. Claim vs reality

- [ ] Owner claim “DB-R0–R6 CLOSED & APPLIED” independently verified as true
- [x] `npx supabase migration list --linked` executed on `pyeowxvacgypohrbvgee`
- [x] `npx supabase db push --linked --dry-run` executed
- [x] PRs #69–#72 merge state checked — **all OPEN, not merged**
- [x] R0–R2 present on `main` and remote
- [ ] R3–R6 present on `main` and remote

**Blockers:** R3–R6 missing from `main` and linked production.

---

## B. Schema baseline (production)

- [x] Identity/RBAC tables present + RLS
- [x] Branches / catalog / modifiers present (`item_modifier_groups` junction confirmed)
- [x] Orders / payments / deliveries / riders present + PKs/FKs/checks spot-checked
- [x] `public.profiles` absent
- [ ] `restaurant_tables` present
- [ ] `dine_in_sessions` present
- [ ] `kitchen_tickets` / `kitchen_ticket_items` present
- [ ] `restaurant_bills` / `bill_orders` present
- [~] Production schema snapshot exists but is **stale** (still references `profiles`) — refresh after R3–R6 apply

---

## C. Security & RLS

- [x] RLS enabled on all current public tables
- [x] No `anon` table write grants
- [x] No `authenticated` TRUNCATE/REFERENCES/TRIGGER grants
- [x] No `anon` EXECUTE on SECURITY DEFINER routines
- [ ] R3–R6 branch-isolation RLS verified on production (tables absent)

---

## D. Data quality & indexes (read-only)

- [x] Idempotency unique index `uq_orders_idempotency_key` present
- [x] E.164 indexes/constraints present (`users_phone_e164_uidx`, `idx_orders_contact_phone_e164`)
- [x] Hot-path indexes present (`idx_orders_branch_status`, `idx_orders_auth_user_id`, …)
- [x] Orphan spot-checks zero (orders/items/payments/deliveries)
- [x] Non-E.164 phone counts zero (users + order contact)
- [~] Catalog row counts differ from historical freeze copy (15/67 categories/items vs prior 13/58 docs) — observe only; no catalog mutation in this audit

---

## E. Roadmap readiness (schema foundations)

| Domain | Schema foundation | Priority if missing | Freeze blocker? |
|---|---|---|---|
| Admin (identity/RBAC/branches) | Present | — | No |
| Catalog / modifiers | Present | — | No |
| POS / dine-in bills | Missing R3–R6 | **P0** | **Yes** |
| Kitchen tickets | Missing R5 | **P0** | **Yes** |
| Rider / deliveries | Stub tables present | P2 (UI later) | No (UI not required) |
| Inventory | Not in V1 schema | P3 deferred | No |

UI gaps are **not** freeze blockers when schema foundations exist. Missing R3–R6 schema **is** a freeze blocker.

---

## F. Governance docs

- [x] Migration workflow documented (`DATABASE-MIGRATION-WORKFLOW.md`)
- [x] Freeze declaration written (BLOCKED wording)
- [ ] Checklist marked COMPLETE/FROZEN — **forbidden until PASS**
- [ ] Sign-off table completed by Owner

---

## Sign-off

| Role | Sign-off | Date | Notes |
|---|---|---|---|
| Database | BLOCKED | 2026-07-18 | R3–R6 not applied |
| Solution Architect | | | |
| Security | | | R0 spot-check PASS; freeze still blocked |
| QA | | | |
| DevOps | | | |
| Documentation | DRAFT | 2026-07-18 | Docs-only PR |
| AI Project Manager | BLOCKED | 2026-07-18 | Cannot declare LOCKED |
| Human Owner | | | Required before any R3–R6 apply |

---

## Completion gate

**COMPLETE/FROZEN** requires:

1. R3–R6 merged + applied on linked prod  
2. `migration list` + dry-run perfect alignment including R3–R6  
3. Re-audit PASS  
4. Owner sign-off  

Until then this checklist remains **INCOMPLETE — NOT FROZEN**.

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```
