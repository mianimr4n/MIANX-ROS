# PHASE2-03 Test Evidence

**Status:** PASS
**Environment:** local workspace and local Docker Supabase only
**Remote database:** not used

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | Lockfile unchanged; pnpm 10.15.1 |
| `pnpm local:guard` | PASS | Loopback bindings only |
| Clean local Supabase reset | PASS | Migration `20260806170223` applied from the full chain |
| Live transactional lifecycle probe | PASS | Create, activate, duplicate, stale reject, rollback copy, immutability, RLS and audit |
| Supabase advisors | PASS WITH EXISTING WARNINGS | No error-level finding; warnings predate PHASE2-03 |
| Focused backend configuration suite | PASS | 15/15 |
| Focused PHASE2-03 database suite | PASS | 6/6 |
| `pnpm check` | PASS | Website and backend TypeScript |
| `pnpm test` | PASS | 1,049 static/database/menu/website + 637 backend = 1,686 |
| `pnpm test:db` | PASS | 1,049/1,049 |
| `pnpm rc1:gate` | PASS | 0 blocking failures; 0 known debt |
| `pnpm build:website` | PASS | Existing chunk-size advisory only |

No test was weakened or suppressed. No broad TypeScript cast or ignore comment was introduced to bypass correctness.
