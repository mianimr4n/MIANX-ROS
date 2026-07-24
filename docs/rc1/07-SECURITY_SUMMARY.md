# RC1 Security Summary

## Controls present

| Control | Status |
| --- | --- |
| Local env guard (`pnpm local:guard`) | Blocks cloud Supabase URL bindings in local env |
| Supabase JWT auth for staff/customer | Required for admin/ops APIs |
| Permission + role checks on API | Enforced server-side |
| Branch isolation (orders/kitchen) | Foreign branch → 403; malformed → 400 |
| Cashier kitchen denial | 403 `KITCHEN_ACCESS_DENIED` |
| Anonymous admin denial | 401 / login redirect |
| RLS on Postgres | Enabled (defense in depth) |
| Service-role confined to backend | Expected pattern |
| RC1 secret scan on Commit F | 0 active critical findings in F paths |

## Residual risks

1. Guest order track/cancel by phone + rate limits — enumeration residual risk  
2. UI access gates are not authorization — always verify API  
3. Stale operator GRANT guidance can re-open privileges  
4. Dual models (permission codes vs role sets) increase review cost  
5. Foundation screens can be mistaken for live ledgers  

## RC1 security posture statement

RC1 is suitable for **controlled local / staging evaluation** with seeded staff fixtures. It is **not** a claim of completed production penetration testing, SOC attestation, or multi-tenant isolation for third-party restaurants.
