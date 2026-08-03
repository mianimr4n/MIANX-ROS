# RC6 Phase 1 — Production anchor reconciliation

**Status:** `COMPLETE` — active Production is closeout/release commit
**QA-04 historical window UTC:** `2026-08-03T00:44:05Z` (first Owner-smoke-green)
**Release anchors:** `v1.5.0` / `830dbc8…` / `dpl_BtPH8…`

## Auth / team / project

| Field | Result |
| --- | --- |
| Authenticated user | `mianimr4n` |
| Active team | `mianimr4n-5543s-projects` |
| Project name | `telepizza-website` |
| Project ID | `prj_WCCIzQ6HB0HST7DFNM5tja579Kof` |
| Root directory | `apps/website` |
| Framework | Vite |
| Build | `pnpm build` / output `dist/public` |
| Production alias | `https://telepizza-website.vercel.app` |

## Current authoritative Production chain

| Field | Result |
| --- | --- |
| Active deployment ID | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` |
| Active deployment Git SHA | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Deployment state | `READY` / target `production` |
| Feature/runtime tip | `b14163ccbc82fca0b2856ea137bddb746ed5716b` (`apps/website` ≡ active commit) |
| Prior QA-04 deployment ID | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` |
| Prior QA-04 deployment Git SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Earlier rollback candidate | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` (`bf5912c…`) |
| Rollback executed | No |

Commit message for active: Merge pull request #192 … (Phase 1 final closeout). Docs-only vs QA-04 for `apps/website`.

## Historical QA-04 reconciliation (retain)

At Owner smoke first-green, Case A `ALREADY_ACTIVE` pointed alias → `dpl_Hi35GY…` → `b14163c…`. That record remains historically accurate for that window; it is **not** the current active deployment.

## Cross-surface anchor alignment (current)

| Surface | SHA / tip | Aligned |
| --- | --- | --- |
| Production website commit | `830dbc8…` / `dpl_BtPH8…` | YES |
| Feature/runtime tip | `b14163c…` | YES (zero `apps/website` delta) |
| Render API `/healthz` gitSha | `830dbc8…` (observed) | YES (transitive; no intentional backend deploy) |
| Migration tip | `20260801180000` | YES |
| Released tag | `v1.5.0` @ `830dbc8…` (object `d52f3a47…`) | YES |
| Prior tag | `v1.4.0` @ `96f1e80…` | unchanged |
| GitHub Release | none | YES |
