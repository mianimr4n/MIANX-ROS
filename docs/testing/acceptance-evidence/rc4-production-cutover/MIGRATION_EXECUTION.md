# Migration execution

| Field | Value |
| --- | --- |
| Command | `npx supabase db push --linked --yes` |
| CLI | 2.111.0 |
| Start | 2026-08-01 22:01:53 Asia/Karachi |
| End | 2026-08-01 22:03:51 Asia/Karachi |
| Exit code | **0** |
| Applied count | **23** |

## Applied (ordered)

1. `20260731010000_finance_account_mappings.sql`
2. `20260731020000_cash_reconciliations.sql`
3. `20260731030000_expense_claims.sql`
4. `20260731040000_finance_posting_and_ap_idempotency.sql`
5. `20260731050000_hr_employee_lifecycle.sql`
6. `20260731060000_hr_shift_scheduling.sql`
7. `20260731070000_hr_attendance_leave_hardening.sql`
8. `20260731080000_hr_payroll_foundation.sql`
9. `20260731090000_loyalty_ledger_complete.sql`
10. `20260731100000_coupon_redemptions.sql`
11. `20260731110000_marketing_campaigns_consent.sql`
12. `20260731120000_supplier_portal_foundation.sql`
13. `20260731130000_supplier_portal_hardening.sql`
14. `20260731140000_loyalty_schema_compatibility.sql`
15. `20260731150000_rc3_deployment_schema_compatibility.sql`
16. `20260731170000_rc4_documents_binary_uploads.sql`
17. `20260731171000_rc4_documents_archive_status.sql`
18. `20260731180000_rc4_inventory_recipes_cogs.sql`
19. `20260731190000_rc4_finance_phase2_foundation.sql`
20. `20260731200000_rc4_payroll_calculation_foundation.sql`
21. `20260731210000_rc4_payroll_finance_mapping_purposes.sql`
22. `20260801120000_rc4_analytics_bi_foundation.sql`
23. `20260801180000_rc4_loyalty_marketing_depth.sql`

CLI message: `Finished supabase db push.`
Warnings: npm `devdir` env warn only (non-blocking).
Errors: none.
Secrets: not recorded in this evidence.
