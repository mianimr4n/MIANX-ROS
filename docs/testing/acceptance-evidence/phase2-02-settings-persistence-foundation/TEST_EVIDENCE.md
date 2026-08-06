# PHASE2-02 Test Evidence

**Status:** PASS
**Environment:** local workspace only
**Remote database:** not used

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | Lockfile unchanged; pinned pnpm 10.15.1 |
| `pnpm local:guard` | PASS | Both bindings loopback; no cloud binding |
| Clean local Supabase bootstrap | PASS | All migrations through `20260806150140` applied |
| PHASE2-01 tip → `migration up --local` | PASS | Exactly PHASE2-02 migration applied |
| Live local SQL persistence | PASS | `create` → `replayed` → `update`; audit mutation blocked |
| Focused configuration backend | PASS | 8/8 |
| Focused migration contract | PASS | 5/5 |
| `pnpm check` | PASS | Website and backend TypeScript |
| `pnpm test` | PASS | 1,043 static/database/menu/website + 630 backend = 1,673 |
| `pnpm test:db` | PASS | 1,043/1,043 |
| `pnpm rc1:gate` | PASS | 0 blocking failures; 0 known debt |
| Website production build | PASS | Included in RC1 gate |

RC1's optional BM browser acceptance remains skipped by the canonical gate itself. Its required auth/branch and KDS browser authorization checks passed against local seeded fixtures.

## Live database assertions

- migration history contains `20260806150140`;
- no branch has a null `organization_id`;
- all three configuration tables have RLS enabled;
- service-role RPC produced deterministic create/replay/update outcomes;
- idempotency replay retained the original value;
- change log stored only data-type/redaction metadata;
- direct change-log UPDATE raised the append-only exception.

No Production system, Supabase cloud project, deployment, or remote database was contacted or mutated.
