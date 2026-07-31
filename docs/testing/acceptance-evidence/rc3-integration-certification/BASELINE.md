# RC3 Integration & Production Certification — Baseline

| Field | Value |
| --- | --- |
| Local branch | `feature/rc3-release-certification` |
| Certification base SHA | `ea5e7f8` (Merge PR #150 loyalty schema compatibility) |
| Prior integration package | PR [#149](https://github.com/mianimr4n/telepizza/pull/149) |
| Supplier Portal | [#147](https://github.com/mianimr4n/telepizza/pull/147) + [#148](https://github.com/mianimr4n/telepizza/pull/148) MERGED |
| Loyalty compat migration | `20260731140000_loyalty_schema_compatibility.sql` on main via #150 |
| Prior RC3 merges | Finance #143, Workforce #144, Loyalty+Marketing #146 |
| Kitchen RC2 | Already on `main` via #142 — not newly mixed |
| Node | v24.18.0 |
| pnpm | 10.15.1 |
| Supabase CLI | 2.110.0 (`npx supabase`) |
| Playwright | 1.52.0 |
| OS | Windows 10 (win32 10.0.26200) |
| DB target | Local Supabase only (`http://127.0.0.1:54321`) |
| Env (no secrets) | `TELEPIZZA_ENV=local`, `SUPABASE_URL=http://127.0.0.1:54321`, `API_CORS_ORIGIN=http://localhost:3000`, integration modes mock/disabled |

## Confirmations

1. Branched only from latest `origin/main` @ `ea5e7f8`.
2. Loyalty compatibility migration present and verified (not redesigned).
3. No Production migrate/deploy/mutation in this phase.
