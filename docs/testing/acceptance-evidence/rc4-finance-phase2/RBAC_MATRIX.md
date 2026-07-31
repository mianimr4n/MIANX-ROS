# RBAC Matrix

| Actor | Finance Phase 2 mutate | Notes |
| --- | --- | --- |
| Owner / super-admin | Yes (`admin.access` / `finance.manage`) | Full |
| Finance / branch-manager with `finance.manage` | Yes | Branch scoped |
| Cashier | No | 403 on finance routes |
| Supplier portal | No | No finance.manage |
| Unauthenticated | No | 401 |
| Read-only auditor | Select via RLS only | No mutate endpoints without permission |
