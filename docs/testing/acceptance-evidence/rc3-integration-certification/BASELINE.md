# RC3 Integration & Production Certification — Baseline

| Field | Value |
| --- | --- |
| Local branch | `feature/rc3-release-certification` |
| Certification base SHA | `db6974d` (Merge PR #152 schema audit; includes PR #151 certification) |
| Pre-rebase release tip | `92af0e4` (tree identical to `db6974d`; cherry-pick skipped on rebase) |
| Schema audit commit | `a834951` (ancestor of main via #152) |
| Loyalty compat | `20260731140000` via PR #150 |
| Deployment schema compat | `20260731150000` via PR #152 / release tip |
| Supplier Portal | #147 + #148 MERGED |
| Prior RC3 merges | Finance #143, Workforce #144, Loyalty+Marketing #146 |
| Kitchen RC2 | Already on `main` via #142 — not newly mixed |
| Node | v24.18.0 |
| pnpm | 10.15.1 |
| Supabase CLI | 2.110.0 |
| Playwright | 1.52.0 |
| OS | Windows 10 |
| DB target | Local Supabase only |
| Env (no secrets) | `TELEPIZZA_ENV=local`, `SUPABASE_URL=http://127.0.0.1:54321` |

## Confirmations

1. Rebased onto latest `origin/main` @ `db6974d` (no duplicate cherry-pick of `a834951`).
2. Integration + schema evidence present on branch.
3. No Production migrate/deploy/mutation in this phase.
