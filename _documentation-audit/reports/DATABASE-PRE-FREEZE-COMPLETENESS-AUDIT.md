# DATABASE PRE-FREEZE COMPLETENESS AUDIT

**Repository:** Telepizza (`D:\projects\telepizza`)  
**Branch:** `audit/database-pre-freeze-completeness`  
**Base:** latest `main` @ `076f89d`  
**Linked Supabase project:** `pyeowxvacgypohrbvgee` (Telepizza)  
**Audit date:** 2026-07-18  
**Mode:** Docs / governance / read-only inspection — **no production mutation, no applied remediation migrations**

---

## Executive summary

Migration history is **aligned** and dry-run is **clean** (same posture as PR #61 unblocked history work). Freeze is still **BLOCKED** by privilege drift and unmanaged `public.profiles`.

| Area | Verdict |
|---|---|
| Migration history | PASS (16/16 local ≡ remote) |
| Dry-run push | PASS (up to date) |
| Schema completeness for V1 domains | PASS (core tables present) |
| `public.profiles` | **UNMANAGED PRODUCTION DRIFT** — P1 retire |
| Grants / DEFINER EXECUTE | **FAIL — P0** |
| Indexes for current volume | PASS with P2 follow-ups |
| Roadmap future modules | Intentionally absent — OK |
| Freeze | **BLOCKED — REMEDIATION REQUIRED** |

---

## Phase 0 — Safety

| Step | Result |
|---|---|
| Fetch/pull latest `main` | Done; clean tree; branch created from `076f89d` |
| Linked project | `pyeowxvacgypohrbvgee` confirmed (`.temp/project-ref` + `linked-project.json`) |
| `npx supabase migration list --linked` | All 16 versions present on local and remote |
| `npx supabase db push --linked --dry-run` | `Remote database is up to date.` |
| Stop on history mismatch | N/A — no mismatch |

Hard rules respected: no executable snapshot apply, no drop/truncate of production tables, no history repair, no credential exposure, no SQL Editor mutations, no feature work.

---

## Phase 1 — Complete schema inventory

**Public base tables:** **20**  
**Managed (in migrations):** **19**  
**Unmanaged:** **1** (`profiles`)

| # | Table | Managed? |
|---|---|---|
| 1–19 | users, roles, permissions, role_permissions, user_roles, branches, customers, menu_categories, menu_items, menu_item_variants, orders, order_items, order_status_logs, payments, riders, deliveries, staff, staff_invites, staff_invite_events | Yes |
| 20 | profiles | **No** |

**Other objects (prod):** 15 public functions; RLS enabled on all 20 tables; 18 policies; indexes/constraints as inventoried in `docs/database/DATABASE-SCHEMA-INVENTORY.md`.

**Row counts (anonymized)**

| Snapshot | users | profiles | customers | orders | order_items | deliveries | menu_items | branches |
|---|---|---|---|---|---|---|---|---|
| T0 (first inventory) | 1 | 0 | 0 | 5 | 5 | 5 | 67 | 2 |
| T1 (later re-check) | 1 | 0 | 0 | 0 | 0 | 0 | *(not re-polled)* | *(not re-polled)* |

T1 shows operational order/delivery rows cleared during the audit window (test volatility). **No PII dumped.**

Schema-only artifact: `docs/database/production-schema-snapshot.sql` (header: DO NOT EXECUTE).

---

## Phase 2 — `public.users` vs `public.profiles`

### Classification (exactly one)

**UNMANAGED PRODUCTION DRIFT**

### Evidence

| Question | Finding |
|---|---|
| In migration chain? | **No** — Sprint 3 explicitly: “Profile model: `public.users` (no parallel profiles table)” |
| Creation source | Legacy dashboard / early Auth template (`handle_new_user` inserts into profiles) |
| Columns | `id` (PK/FK→auth.users), email, full_name, phone, **address**, created_at |
| Constraints | PK + FK CASCADE to auth.users |
| Indexes | PK only |
| Policies | SELECT/UPDATE own profile (`roles={public}`) |
| Grants | Full DML+TRUNCATE to anon/authenticated/service_role |
| Row count | **0** |
| Overlap with users | None (empty). Canonical app identity is `users` with separate UUID + `auth_user_id` |
| Code refs to table | No `.from('profiles')` in API/website; “profile” wording maps to `users` |
| Auth bootstrap live path | `on_auth_user_created` → `handle_auth_user_created` → **`public.users`** |
| Dead path | `handle_new_user()` still exists (DEFINER), **not attached** to any trigger |
| Unique info not in users | `address` column only — unused (0 rows) |

### Retirement design (not applied)

`docs/database/remediation/P1_retire_unmanaged_profiles.sql`  
Preconditions → revoke/policies → drop `handle_new_user` → drop `profiles` → verification + rollback notes.

**Do not drop without owner approval.** Safe to retire after P0 grant work and zero-row guard.

---

## Phase 3 — Grant and privilege audit

### Locked expected model

Documented in `docs/database/DATABASE-RLS-AND-GRANTS-MATRIX.md` (Slice 2D + auth foundation + invite lockdown).

### Drift summary

1. **P0:** `anon`/`authenticated` retain **TRUNCATE** (and often REFERENCES/TRIGGER) on sensitive tables. **TRUNCATE bypasses RLS.**
2. **P0:** `anon` retains INSERT/UPDATE/DELETE on identity/RBAC/staff/customers/menu/branches/riders/`profiles`.
3. **P0:** `anon` has **EXECUTE** on SECURITY DEFINER helpers that migrations intended for `service_role` and/or `authenticated` only (`finalize_staff_invite_acceptance`, `ensure_customer_profile_for_auth_user`, `auth_user_email_exists`, `current_*`, etc.).
4. **P0/P1 residue:** Slice 2D correctly removed anon from orders family and revoked authenticated writes, but left TRUNCATE residue on authenticated for those tables.
5. **Good:** `payments` and staff invite tables locked to service_role; RLS ON everywhere; order SELECT policies present.

Remediation design (not applied): `docs/database/remediation/P0_harden_grants_and_definer_execute.sql`.

---

## Phase 4 — Table completeness / roadmap readiness

| Domain | Status | Gap class |
|---|---|---|
| Customer identity / auth | `users` + bootstrap | Ready after grant harden |
| Staff / RBAC / invites | roles, permissions, staff, invites | Ready after grant harden |
| Branches | Present (2) | Ready |
| Menu (+ toppings as `product_type`) | Present | Ready |
| Orders / items / status logs / snapshots / idempotency | Present | Ready |
| Delivery / riders | Skeleton tables | **SAFE TO ADD IN FEATURE PHASE** (ops APIs) |
| Payments | Skeleton + locked grants | **SAFE TO ADD IN FEATURE PHASE** (provider integration) |
| Admin / POS / Kitchen capability | No extra tables required for freeze | **SAFE TO ADD IN FEATURE PHASE** |
| Inventory / BOM / suppliers / finance | Absent | **NOT REQUIRED FOR V1** |
| Loyalty / coupons | Absent | **NOT REQUIRED FOR V1** |
| Notifications / devices / push tokens | Absent | **NOT REQUIRED FOR V1** |

**Do not add future tables now.**

---

## Phase 5 — Data quality (read-only)

| Check | T0 result |
|---|---|
| Orphan order_items / deliveries / variants | 0 |
| Auth users vs linked `users.auth_user_id` | 1 auth / 1 linked / 0 orphan links |
| `profiles` rows | 0 |
| Negative money on orders | 0 |
| Orders without items | 0 |
| Topping SKUs | 3 |
| Duplicate emails/phones | Not expanded (single user row) |
| E.164 constraint | Present on `users.phone` |
| Idempotency unique index | Present |
| Status log consistency | 4 logs @ T0 vs 5 orders (sample volume only) |

No PII published.

---

## Phase 6 — Performance / indexes

**Present and adequate for current volume:**  
`orders(branch_id,status)`, `orders(customer_id)`, partial `auth_user_id` / `contact_phone_e164` / `idempotency_key`, `order_items(order_id)`, `order_status_logs(order_id,created_at)`, staff invite indexes, menu slug uniques, `users` auth/phone uniques.

| Finding | Severity | Note |
|---|---|---|
| Duplicate phone uniqueness (`users_phone_key` + `users_phone_e164_uidx`) | P3 | Redundant; clean in housekeeping migration later |
| Missing `orders(created_at desc)` / admin list helpers | P2 | Add before admin/order volume — not freeze-blocking after P0/P1 |
| Unused index hunt | N/A | Production volume too low for reliable unused detection |

---

## Phase 7 — Audit and retention

| Stream | Immutable? | Actor | Timestamp | Reason | Recommendation |
|---|---|---|---|---|---|
| `order_status_logs` | Append-only by convention (API) | actor_type + actor_user_id | created_at | reason_code + note | Retain ≥ 24 months; no secrets in note |
| `staff_invite_events` | Append-only | actor_user_id | created_at | event_type (+ metadata without raw tokens) | Retain ≥ 24 months; never log raw invite tokens |
| General `audit_events` | Absent | — | — | — | **SAFE TO ADD IN FEATURE PHASE** (P2) |

No secret logging in designed remediations.

---

## Phase 8 — Remediation decision table

| ID | Sev | Finding | Current risk | Recommended fix | Migration? | Data mig? | Blocks freeze? | Owner decision? |
|---|---|---|---|---|---|---|---|---|
| P0-GRANT-001 | P0 | Client TRUNCATE + over-broad anon DML | RLS bypass / wipe / mutation | Apply designed grant harden SQL | Yes | No | **Yes** | Yes — approve apply |
| P0-DEFINER-001 | P0 | anon EXECUTE on DEFINER helpers | Escalation / invite abuse | Revoke PUBLIC/anon; grant least privilege | Yes (same as above) | No | **Yes** | Yes — approve apply |
| P1-PROFILES-001 | P1 | Unmanaged `profiles` + dead `handle_new_user` | Schema drift / confusion / future Auth footgun | Retire per design after zero-row guard | Yes | Only if rows>0 | **Yes** | Yes — approve drop |
| P1-DEFAULT-PRIV-001 | P1 | Default privileges still grant broad DML to anon | Future tables inherit danger | Alter default privileges in P0 migration | Yes | No | Yes (bundle w/ P0) | Covered by P0 approve |
| P2-IDX-001 | P2 | Admin volume indexes (`orders.created_at`) | Slow admin lists later | Add in ops/admin feature migration | Yes later | No | No | Optional timing |
| P2-AUDIT-001 | P2 | No platform-wide audit_events | Incomplete enterprise audit story | Feature-phase table | Yes later | No | No | Roadmap timing |
| P2-CUSTOMERS-POL | P2 | `customers` RLS ON, zero policies | Only service_role effective | Add policies when customer CRM UI needs direct reads | Yes later | No | No | Product timing |
| P3-PHONE-IDX | P3 | Duplicate phone unique indexes | Catalog noise | Consolidate later | Yes later | No | No | No |
| P3-FUTURE-MOD | P3 | Missing inventory/loyalty/etc. | None for V1 | Do not add now | No | No | No | Already decided |

### Proposed remediation migrations (design only)

1. `docs/database/remediation/P0_harden_grants_and_definer_execute.sql`  
2. `docs/database/remediation/P1_retire_unmanaged_profiles.sql`

---

## Phase 9 — Documentation delivered

| Doc | Path |
|---|---|
| Workflow | `docs/database/DATABASE-MIGRATION-WORKFLOW.md` |
| Inventory | `docs/database/DATABASE-SCHEMA-INVENTORY.md` |
| Relationships | `docs/database/DATABASE-RELATIONSHIP-MATRIX.md` |
| RLS/grants | `docs/database/DATABASE-RLS-AND-GRANTS-MATRIX.md` |
| Freeze checklist | `docs/database/DATABASE-FREEZE-CHECKLIST.md` |
| Schema snapshot | `docs/database/production-schema-snapshot.sql` |
| This report | `_documentation-audit/reports/DATABASE-PRE-FREEZE-COMPLETENESS-AUDIT.md` |

---

## Phase 10 — Validation

Run on audit branch after docs commit (no production mutation):

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

---

## Owner decisions required (exact)

1. **Approve apply** of P0 grant + DEFINER EXECUTE hardening migration (design in `docs/database/remediation/P0_harden_grants_and_definer_execute.sql`).
2. **Approve retirement** of unmanaged `public.profiles` + drop dead `handle_new_user` (design in `docs/database/remediation/P1_retire_unmanaged_profiles.sql`), confirming canonical profile model remains `public.users` only.
3. **Confirm locked expected grant model** in `DATABASE-RLS-AND-GRANTS-MATRIX.md` (especially: never TRUNCATE for anon/authenticated; payments/invites service_role-only; orders family authenticated SELECT-only).
4. **Accept retention** recommendation: ≥24 months for `order_status_logs` and `staff_invite_events`; defer general `audit_events` to feature phase.
5. **Confirm** future modules (inventory/loyalty/notifications/devices/etc.) remain out of freeze scope.

---

## Freeze recommendation

**DATABASE PRE-FREEZE AUDIT: BLOCKED — REMEDIATION REQUIRED**

History/dry-run are green; apply P0 (+ P1 profiles disposition) before declaring the database frozen.
