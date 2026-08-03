# RC6 Phase 1 — Website deployment

## Current active (post QA-04)

| Field | Value |
| --- | --- |
| Deployment action | `ALREADY_ACTIVE` (Vercel git Production on PR #191 merge) |
| Candidate / runtime SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Vercel deployment ID | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` |
| Production alias | `https://telepizza-website.vercel.app` |
| Project | `telepizza-website` (`prj_WCCIzQ6HB0HST7DFNM5tja579Kof`) |
| Team | `mianimr4n-5543s-projects` |
| State | READY / production |
| Rollback deployment | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` |
| Rollback SHA | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` |

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
| Backend / DB / providers | none |
| Post-merge CI | `30775027483` success |

Proof: authenticated Vercel alias inspect + `/v13/deployments/{id}` git SHA.
