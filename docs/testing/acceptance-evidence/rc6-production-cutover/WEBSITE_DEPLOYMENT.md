# RC6 Phase 1 — Website deployment

## Current active (post closeout / `v1.5.0`)

| Field | Value |
| --- | --- |
| Production website commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Vercel deployment ID | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` |
| Feature/runtime tip | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| `apps/website` delta tip→commit | empty |
| Production alias | `https://telepizza-website.vercel.app` |
| Project | `telepizza-website` (`prj_WCCIzQ6HB0HST7DFNM5tja579Kof`) |
| Team | `mianimr4n-5543s-projects` |
| State | READY / production |
| Released tag | `v1.5.0` |

## Historical QA-04 active (first Owner-smoke-green; retain)

| Field | Value |
| --- | --- |
| Deployment action | `ALREADY_ACTIVE` (Vercel git Production on PR #191 merge) |
| Candidate / runtime SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Vercel deployment ID | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` |
| Rollback deployment then | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` (`bf5912c…`) |

## Prior Phase 1 candidate (pre QA-04)

| Field | Value |
| --- | --- |
| SHA | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` |
| Deployment | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` |
| Action then | `ALREADY_ACTIVE` after PR #190 |

## QA-04 delta

| Item | Detail |
| --- | --- |
| PR | #191 |
| Change | `AdminDashboard` skips staff-home routing when signed out |

## Closeout delta

| Item | Detail |
| --- | --- |
| PR | #192 |
| Change | Phase 1 closeout documentation/evidence only |
| Effect on website files | none (`apps/website` empty vs `b14163c…`) |
| Auto Production deploy | `dpl_BtPH8…` @ `830dbc8…` |
