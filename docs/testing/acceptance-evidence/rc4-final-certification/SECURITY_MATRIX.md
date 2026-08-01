# Security Matrix (certification snapshot)

| Control | Status |
| --- | --- |
| RLS on RC4 tables (local migrations) | Present in SQL (prior slices) |
| Health probe secrets | Anon key used as header only; not logged |
| Production SQL from agent | **Not executed** |
| Production config mutation | **Not executed** |
| Cross-tenant cache | Not introduced |

Full RBAC matrices remain in prior slice evidence (loyalty, payroll, finance, documents).
