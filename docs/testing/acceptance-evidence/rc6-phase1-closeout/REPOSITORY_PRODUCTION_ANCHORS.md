# RC6 Phase 1 — Repository and Production anchors

| Concept | Value | Notes |
| --- | --- | --- |
| PR #190 merge (prior candidate) | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` | Command Center cutover |
| PR #191 merge (feature/runtime tip) | `b14163ccbc82fca0b2856ea137bddb746ed5716b` | QA-04 logout fix; `apps/website` ≡ closeout |
| PR #192 closeout merge / release commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` | Docs/evidence closeout |
| Active Vercel deployment | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` | READY / production @ `830dbc8…` |
| Prior QA-04 Vercel deploy (historical) | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` | First Owner-smoke-green @ `b14163c…` |
| Production alias | `https://telepizza-website.vercel.app` | |
| Vercel project | `telepizza-website` (`prj_WCCIzQ6HB0HST7DFNM5tja579Kof`) | |
| Vercel team | `mianimr4n-5543s-projects` | |
| Rollback deployment (retained) | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` / earlier `dpl_HhvEuM…` | Not executed |
| Render API gitSha (observed) | `830dbc8…` | transitive; Phase 1 did not intentionally deploy backend |
| Migration tip | `20260801180000` | unchanged in RC6 |
| Previous release | `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | unchanged |
| Released tag | `v1.5.0` annotated | tag object `d52f3a4729f398143463e72e8147e4cb0ada1faa` |
| Peeled tag target | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` | |
| GitHub Release | none | tag-only |
| Post-merge CI (closeout) | `30775599992` | success on `830dbc8…` |

**Rule:** Repository tip, released tag, Production website commit, feature/runtime tip, Production API SHA, and migration tip are labeled separately when they differ.

**Runtime equivalence:** `git diff b14163c..830dbc8 -- apps/website` is empty.
