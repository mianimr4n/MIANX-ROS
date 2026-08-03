# RC6 Phase 1 — Repository and Production anchors

| Concept | Value | Notes |
| --- | --- | --- |
| PR #190 merge (prior candidate) | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` | Command Center cutover |
| PR #191 merge (current Production) | `b14163ccbc82fca0b2856ea137bddb746ed5716b` | QA-04 logout fix |
| Active Vercel deployment | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` | READY / production |
| Production alias | `https://telepizza-website.vercel.app` | |
| Vercel project | `telepizza-website` (`prj_WCCIzQ6HB0HST7DFNM5tja579Kof`) | |
| Vercel team | `mianimr4n-5543s-projects` | |
| Rollback deployment | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` | `bf5912c…` |
| Render API gitSha (observed) | `b14163c…` | transitive; no backend code delta |
| Migration tip | `20260801180000` | unchanged in RC6 |
| Previous release | `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | |
| Target release | `v1.5.0` annotated tag | not yet created |
| GitHub Release | none | tag-only recommendation |
| Post-merge CI (QA-04) | `30775027483` | success |

**Rule:** Repository tip, released tag, Production website SHA, Production API SHA, and migration tip are labeled separately when they differ.
