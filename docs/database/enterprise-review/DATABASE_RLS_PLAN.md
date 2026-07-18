# Database RLS Plan

**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Mode:** Design / audit documentation only

---

## 1. Locked privilege model (all environments)

| Role | Catalog (branches/menu/modifiers) | Identity / RBAC | Orders family | Payments / invites | Restaurant ops (tables/sessions/kitchen/bills) |
|---|---|---|---|---|---|
| `anon` | SELECT active only | **none** | **none** | **none** | **none** |
| `authenticated` | SELECT active | own `users` R/W guarded; own roles R | SELECT own / branch | **none** | SELECT (and limited UPDATE) per role helpers — **no** hash columns |
| `service_role` | DML | DML | DML | DML | DML (API path) |

Hard rules:

- **Never** grant `TRUNCATE` / `REFERENCES` / `TRIGGER` to `anon` or `authenticated`.  
- **Never** grant `anon` EXECUTE on SECURITY DEFINER helpers.  
- QR / session **hashes never** readable by clients.  
- Guests never settle bills; kitchen never mutates payments.

---

## 2. Live production posture (post R0–R2)

Per DB-R7 re-audit (read-only):

| Check | Result |
|---|---|
| Any public table RLS off | none |
| anon INSERT/UPDATE/DELETE/TRUNCATE on public tables | none |
| authenticated TRUNCATE/REFERENCES/TRIGGER | none |
| anon EXECUTE on DEFINER functions | none |
| `profiles` / dead `handle_new_user` | absent |

**Conclusion:** R0 hardening **holds** on the applied surface. R3–R6 policies are **not** production-verifiable until those migrations land.

Order branch isolation remains Slice 2D helpers (`current_user_has_branch_access`, etc.).

---

## 3. Designed RLS for freeze foundations

### DB-R3 `restaurant_tables`

| Actor | Access |
|---|---|
| anon / customer | none |
| authenticated staff w/ branch access | SELECT; **REVOKE SELECT (qr_token_hash)** |
| service_role | full DML |

### DB-R4 `dine_in_sessions`

| Actor | Access |
|---|---|
| anon | none (resolve via API) |
| branch staff | SELECT / UPDATE |
| service_role | DML; hash column revoked from clients |

### DB-R5 kitchen

| Actor | Access |
|---|---|
| kitchen / branch-manager / super-admin | SELECT + UPDATE on own branch via `current_user_can_access_kitchen_tickets` |
| cashier / rider / customer | **denied** |
| service_role | create tickets on confirm; cancel mirror |

### DB-R6 bills

| Actor | Access |
|---|---|
| cashier / branch-manager / super-admin | SELECT + UPDATE bills; SELECT `bill_orders` |
| kitchen / rider / customer / anon | **denied** |
| service_role | create / link / close orchestration |

---

## 4. Permission seed gaps (REQUIRED with foundations)

Existing role catalog is LIVE. Freeze still needs explicit product permissions (or documented reliance on role codes in helpers) for:

| Code family | Intended roles | Class |
|---|---|---|
| `table.manage` / `table.read` | branch-manager, admin | REQUIRED BEFORE V1 FREEZE |
| `kitchen.read` / `kitchen.update` | kitchen, branch-manager | REQUIRED BEFORE V1 FREEZE |
| `pos.bill.read` / `pos.bill.close` | cashier, branch-manager | REQUIRED BEFORE V1 FREEZE |
| `session.resolve` (API rate-limited) | service path only | REQUIRED BEFORE V1 FREEZE |

PR #71/#72 helpers currently key off **role codes** (`kitchen`, `cashier`, …). That is acceptable for V1 if owner accepts role-code authz; permission-table seed remains recommended for Admin UI later (**SAFE FOR FEATURE PHASE** if helpers stay authoritative).

---

## 5. Feature-phase RLS

| Domain | Intent | Class |
|---|---|---|
| Waiter assignment | Waiter SELECT/UPDATE own sessions; BM override | SAFE FOR FEATURE PHASE |
| `payment_splits` | Cashier only; immutable after capture | SAFE FOR FEATURE PHASE |
| `pos_sessions` | Opener/closer + BM | SAFE FOR FEATURE PHASE |
| Inventory / finance | Staff by module permission | V2 / NOT REQUIRED FOR V1 |
| Loyalty / wallet | Customer own row only | V2 / NOT REQUIRED FOR V1 |

---

## 6. Verification checklist (after future apply — not now)

- [ ] RLS ON for every new table  
- [ ] No anon policies on restaurant ops  
- [ ] Hash columns revoked from `authenticated`  
- [ ] Negative tests: wrong branch denied; QR guest cannot close bill; rider cannot update kitchen ticket  
- [ ] `migration list` + dry-run clean  
- [ ] Grant matrix matches this plan  

---

## 7. Non-actions for this PR

No policy changes, no GRANT/REVOKE execution, no production SQL Editor commands.
