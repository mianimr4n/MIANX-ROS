# RC6 Phase 1 — Production cutover final report

**Verdict:** **PASS WITH LIMITATIONS** — website Production verified; residual scope honestly deferred.

## Anchors

| Field | Value |
| --- | --- |
| Current Production website SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Deployment | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` |
| Alias | `https://telepizza-website.vercel.app` |
| Rollback | `dpl_HhvEuM…` / `bf5912c…` |
| Migration tip | `20260801180000` |
| Previous release | `v1.4.0` @ `96f1e80…` |
| Target release | `v1.5.0` annotated tag (pending closeout merge) |

## Verification summary

| Gate | Result |
| --- | --- |
| Anchor reconciliation | PASS — `ALREADY_ACTIVE` |
| Public route smoke | PASS — 8/8 |
| Owner smoke | PASS — `failCount: 0` |
| Public a11y | PASS — 0 critical / 0 serious |
| Owner a11y (all modes) | PASS — 0 critical / 0 serious |
| Performance sanity | PASS — entry gzip ~251.58 kB |
| API healthz/readyz | PASS — 200, `issues: []` |
| Backend deploy by Phase 1 | none |
| Database action | none |
| Post-merge CI (QA-04) | `30775027483` success |
| Local validation (prior candidate) | PASS on `bf5912c…` |

## Not claimed

- Full admin WCAG certification
- Complete ERP / Delivery / Settings modules
- Alerting / APM / paging
- Universal org event store
- GitHub Release object (tag only recommended at closeout)

## Evidence index

See sibling files in this directory; phase1 closeout pack at `../rc6-phase1-closeout/`.
