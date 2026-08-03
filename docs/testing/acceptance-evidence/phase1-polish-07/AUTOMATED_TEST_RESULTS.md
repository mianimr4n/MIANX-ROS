# Automated test results

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` | PASS — 1029 website static + 622 backend |
| `pnpm test:db` | PASS (included in `pnpm test`) |
| `git diff --check` | PASS |
| POLISH-07 focused | PASS — `perf-security-polish-07.test.mjs` |
| POLISH-01…06 / DASH / QA / D2 | PASS (in website suite) |
| `rc1:gate` | **Not claimed PASS** — local live Supabase/API stack unavailable |

## Limitations

- Required PR CI is the authoritative Owner Playwright path
- No Production screenshots; synthetic/static contracts only
