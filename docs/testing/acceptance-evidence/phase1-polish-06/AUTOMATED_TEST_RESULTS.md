# Automated test results

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` | PASS — 1017 website static + 622 backend |
| `pnpm test:db` | PASS (included in `pnpm test`) |
| `git diff --check` | PASS |
| POLISH-06 focused | PASS — `admin-a11y-responsive-polish-06.test.mjs` |
| POLISH-01…05 / DASH / QA static | PASS (in website suite) |
| `rc1:gate` | **Not claimed PASS** — local live Supabase/API stack unavailable |
| `test:e2e:a11y02` | Not re-run locally this session; suite retained for CI/local website |

## Limitations

- Required PR CI is the authoritative integration path for Owner Playwright
- Headed Admin axe across all families residual when live stack absent
- No Production screenshots; synthetic/static contracts only
