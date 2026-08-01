# RC4 Production Cutover — Pending Migration Review

**Reviewed:** 2026-08-01 Asia/Karachi
**Project ref:** `pyeowxvacgypohrbvgee`
**Remote tip:** `20260730290000`
**Local tip:** `20260801180000`
**Pending range:** `20260731010000` → `20260801180000` (**23 files**)
**History class:** simply **behind** (not divergent)
**Destructive scan:** no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DISABLE ROW LEVEL SECURITY`
**Verdict:** `SAFE_TO_APPLY_ORDERED`

## History notes

| Check | Result |
| --- | --- |
| Duplicate timestamps | None |
| Missing local files for listed pending | None |
| Remote-only orphans | None |
| Slot gap `20260731160000` | Absent locally and remotely (intentional unused slot — not divergence) |
| `20260731040000` pending | **Yes** (adds `supplier_invoices.due_date`) |
| `20260731050000` pending | **Yes** (adds `hr_employees.employee_number`) |
| Later RC4 migrations pending | **Yes** through `20260801180000` |

## Per-file review

| Timestamp | File | Module | Primary changes | Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| 20260731010000 | `finance_account_mappings.sql` | Finance | New mappings table + RLS/grants | Low | Additive |
| 20260731020000 | `cash_reconciliations.sql` | Finance | Cash recon tables/indexes/RPCs | Low–Med | New tables; unique indexes |
| 20260731030000 | `expense_claims.sql` | Finance | Expense claims foundation | Low | Additive |
| 20260731040000 | `finance_posting_and_ap_idempotency.sql` | Finance | `finance_postings`; `due_date` on `supplier_invoices`; reverse/idempotency RPCs | Med | Closes Production `42703` for `due_date`; CHECK/index work |
| 20260731050000 | `hr_employee_lifecycle.sql` | HR | `employee_number` + lifecycle cols; `hr_employee_events` | Med | Closes Production `42703` for `employee_number` |
| 20260731060000 | `hr_shift_scheduling.sql` | HR | Shifts; **`CREATE EXTENSION btree_gist`** | Med | Extension + exclusion-style constraints possible lock |
| 20260731070000 | `hr_attendance_leave_hardening.sql` | HR | Attendance corrections / leave hardening | Low–Med | Additive + indexes |
| 20260731080000 | `hr_payroll_foundation.sql` | HR | Payroll foundation tables | Low | Additive |
| 20260731090000 | `loyalty_ledger_complete.sql` | Loyalty | Ledger completeness / reverse / expiry | Med | RPCs + indexes; no DROP |
| 20260731100000 | `coupon_redemptions.sql` | Loyalty | Coupon redemptions | Low | Additive |
| 20260731110000 | `marketing_campaigns_consent.sql` | Marketing | Campaigns + consent | Low | Additive |
| 20260731120000 | `supplier_portal_foundation.sql` | Purchasing | Portal foundation | Low–Med | Additive |
| 20260731130000 | `supplier_portal_hardening.sql` | Purchasing | Portal hardening | Low–Med | Additive |
| 20260731140000 | `loyalty_schema_compatibility.sql` | Loyalty | Compatibility shims | Med | Idempotent re-asserts |
| 20260731150000 | `rc3_deployment_schema_compatibility.sql` | Cross | Large idempotent drift-close shim | Med | `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`; no drops |
| 20260731170000 | `rc4_documents_binary_uploads.sql` | Documents | Binary upload columns/storage hooks | Low–Med | Additive |
| 20260731171000 | `rc4_documents_archive_status.sql` | Documents | Archive status | Low | Additive |
| 20260731180000 | `rc4_inventory_recipes_cogs.sql` | Inventory | Recipes / COGS | Med | New structures + indexes |
| 20260731190000 | `rc4_finance_phase2_foundation.sql` | Finance | Phase-2 finance foundation | Med | Additive |
| 20260731200000 | `rc4_payroll_calculation_foundation.sql` | HR/Finance | Payroll calculation foundation | Med | Additive |
| 20260731210000 | `rc4_payroll_finance_mapping_purposes.sql` | Finance | Mapping purposes | Low | Additive |
| 20260801120000 | `rc4_analytics_bi_foundation.sql` | Analytics | Scheduled reports / exceptions (execution deferred) | Low | Additive |
| 20260801180000 | `rc4_loyalty_marketing_depth.sql` | Loyalty | Rewards/tiers/segments/templates | Low–Med | Additive |

## Checklist (all pending files)

| Concern | Finding |
| --- | --- |
| DROP TABLE / DROP COLUMN / TRUNCATE | **None** |
| Destructive type conversion | **None** observed |
| Unbounded table rewrite | No full-table rewrite patterns; indexes/constraints on new or additive columns |
| DISABLE RLS | **None** |
| Unsafe policy weakening (`USING (true)` on sensitive writes) | No broad public write-open patterns flagged; policies use branch-access helpers where reviewed |
| Non-idempotent data mutation | No seed/mass UPDATE/DELETE of production rows in pending set |
| Long lock risk | **MEDIUM** on `btree_gist`, unique indexes, CHECK adds — prefer maintenance window |
| Duplicate timestamps | **None** |
| Dependency ordering | Ordered by timestamp; compat shims after foundations |
| Required extensions | `btree_gist` in `20260731060000` |
| Grants / RPC ownership | `REVOKE`/`GRANT` + `security definer` RPCs with `search_path = public` pattern |

## Blockers

**None.** Highest residual risks are MEDIUM (extension, indexes, large compat shim) — acceptable under maintenance window with verified backup.

## Stop condition

Stop before apply if any pending file is later edited to introduce DROP TABLE/COLUMN, TRUNCATE, DISABLE RLS, or destructive type casts without a new reviewed approval.
