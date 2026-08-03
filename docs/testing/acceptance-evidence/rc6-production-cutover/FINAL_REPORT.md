# RC6 Phase 1 — Production cutover final report

**Verdict:** **PASS WITH LIMITATIONS** — website Production verified; residual scope honestly deferred; released as `v1.5.0`.

## Anchors (current)

| Field | Value |
| --- | --- |
| Production website commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Deployment | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` |
| Feature/runtime tip | `b14163ccbc82fca0b2856ea137bddb746ed5716b` (`apps/website` ≡ commit) |
| Alias | `https://telepizza-website.vercel.app` |
| Rollback (retained) | `dpl_Hi35GY…` / `b14163c…` (not executed) |
| Migration tip | `20260801180000` |
| Released tag | `v1.5.0` (object `d52f3a47…`) |
| Previous release | `v1.4.0` @ `96f1e80…` (unchanged) |
| GitHub Release | none |

## Verification summary

| Gate | Result |
| --- | --- |
| Anchor reconciliation | PASS — active `dpl_BtPH8…` / `830dbc8…` |
| Public route smoke | PASS — 8/8 |
| Owner smoke | PASS — `failCount: 0` |
| Logout / protected route | PASS |
| Public a11y | PASS — 0 critical / 0 serious |
| Owner a11y (all modes) | PASS — 0 critical / 0 serious |
| Performance sanity | PASS — entry gzip ~251.58 kB |
| API healthz/readyz | PASS — 200, `issues: []` |
| Backend deploy by Phase 1 | none intentional |
| Database action | none |
| CI on closeout | `30775599992` success |
| Local validation (prior candidate) | PASS on `bf5912c…` |

## Not claimed

- Full admin WCAG certification
- Complete ERP / Delivery / Settings modules
- Alerting / APM / paging
- Universal org event store
- GitHub Release object (tag only)

## Evidence index

See sibling files in this directory; phase1 closeout pack at `../rc6-phase1-closeout/`; post-tag honesty at `../rc6-v1.5.0-anchor-sync/`.
