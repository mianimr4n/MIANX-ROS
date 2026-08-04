# Phase 1.1 — Release candidate and QA merge

| Field | Value |
| --- | --- |
| PR | https://github.com/mianimr4n/telepizza/pull/202 |
| Final head | `6347bfb8fcab945a285bdc46311737828803b90a` |
| Merge SHA / RC | `bfe60cc6a3074e08e61f85b458b19e724325eba4` |
| Merged at | `2026-08-03T23:59:28Z` |
| Pre-merge CI | https://github.com/mianimr4n/telepizza/actions/runs/30862770401 — SUCCESS |
| Post-merge CI | https://github.com/mianimr4n/telepizza/actions/runs/30864106177 — SUCCESS |

## Release-candidate gates (at merge SHA)

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` | PASS (website 1036 / backend 622) |
| `pnpm test:db` | PASS (via website suite orchestration) |
| `pnpm rc1:gate` | PASS |
| POLISH-QA + POLISH-07 static | PASS |

`PHASE1_1_RELEASE_CANDIDATE_SHA` = `bfe60cc6a3074e08e61f85b458b19e724325eba4`
