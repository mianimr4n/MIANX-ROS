# RC3 Integration & Production Certification — Baseline

| Field | Value |
| --- | --- |
| Local branch (start) | `feature/rc3-integration-certification` |
| PR5 start SHA | `21635fb` (`Merge pull request #148 from mianimr4n/feature/rc3-supplier-portal`) |
| Post-merge `origin/main` | `21635fb6f1f34c6ef5e2e152c0692f7350faf6c0` |
| Supplier Portal PR (foundation) | [#147](https://github.com/mianimr4n/telepizza/pull/147) MERGED @ `1c28d1d` (pre-acceptance tip `d2b6ef7`) |
| Supplier Portal PR (acceptance) | [#148](https://github.com/mianimr4n/telepizza/pull/148) MERGED @ `21635fb` (head `1541ee4`, acceptance `25abbbd`) |
| CI on #148 | Typecheck and test **SUCCESS**; Vercel **SUCCESS** |
| Prior RC3 merges | Finance #143, Workforce #144, Loyalty+Marketing #146 |
| Kitchen RC2 | Already on `main` via #142 — **not mixed as new work** in PR5 |
| Node | v24.18.0 |
| pnpm | 10.15.1 |
| Supabase CLI | 2.110.0 (`npx supabase`) |
| Playwright | 1.52.0 |
| OS | Windows 10 (win32 10.0.26200) |
| DB target | Local Supabase only (`http://127.0.0.1:54321`) |
| Env (no secrets) | `TELEPIZZA_ENV=local`, `SUPABASE_URL=http://127.0.0.1:54321`, `API_CORS_ORIGIN=http://localhost:3000`, integration modes mock/disabled |

## Start-condition confirmations

1. Supplier Portal acceptance tip `1541ee4` / `25abbbd` is ancestor of `origin/main` after #148.
2. PR5 branched **only** from post-merge `origin/main` @ `21635fb`.
3. Not branched from loyalty/workforce/finance/kitchen feature branches.
4. No Production migrate/deploy/mutation in this phase.
