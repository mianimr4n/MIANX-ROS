# RC6 Phase 1 — Production anchor reconciliation

**Status:** `COMPLETE` — Case A `ALREADY_ACTIVE` (post QA-04)  
**UTC recorded:** `2026-08-03T00:44:05Z` (Owner smoke window)

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

## Authoritative Production chain

Proven via authenticated Vercel alias inspect + deployment API (`meta.githubCommitSha` / `gitSource.sha`).

| Field | Result |
| --- | --- |
| Account/team | `mianimr4n-5543s-projects` |
| Project | `telepizza-website` |
| Project ID | `prj_WCCIzQ6HB0HST7DFNM5tja579Kof` |
| Production alias | `telepizza-website.vercel.app` |
| Active deployment ID | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` |
| Active deployment Git SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Deployment state | `READY` / target `production` |
| Prior deployment ID | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` |
| Prior deployment Git SHA | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` |
| Rollback target | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` (`bf5912c…`) |
| Candidate deployment exists | YES — is the active Production deployment |

Commit message prefix: Merge pull request #191 … (QA-04 Owner smoke fix).

## Decision

**CASE A — `ALREADY_ACTIVE`**

- Production alias points to Ready deployment of exact candidate SHA `b14163c…`.
- No redeploy / promote performed by closeout task.
- Rollback target recorded as prior Production deployment `dpl_HhvEuM…` (`bf5912c…`).

## Cross-surface anchor alignment

| Surface | SHA / tip | Aligned |
| --- | --- | --- |
| Production website | `b14163c…` | YES |
| Render API `/healthz` gitSha | `b14163c…` (observed) | YES (transitive; no backend code delta) |
| Migration tip | `20260801180000` | YES (no new migrations in range) |
| Released tag | `v1.4.0` @ `96f1e80…` | Separate — `v1.5.0` pending closeout |
