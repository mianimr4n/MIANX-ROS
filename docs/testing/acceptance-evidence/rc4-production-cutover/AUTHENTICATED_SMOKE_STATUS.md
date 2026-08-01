# Authenticated smoke status

**Status:** **PASS**
**Evidence:** `post-migrate-smoke-auth.json` + `targeted-cutover-verification.json`

| Field | Value |
| --- | --- |
| authOk | true |
| meOk | true |
| refreshOk | true |
| logoutClears | true |
| probes | 26/26 acceptable |
| drift42703 | empty |
| missingRelation | empty |
| HR employees | 200, no `employee_number` 42703 |
| Supplier invoices | 200, no `due_date` 42703 |

Decision: `PRODUCTION_MIGRATION_AND_SMOKE_COMPLETE`
