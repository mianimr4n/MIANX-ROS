# Phase 1.1 — Release baseline

**Audit date:** 2026-08-03  
**Working tree base:** `830dbc8b5916cc0a724a0d7489a0e34387a26f78` (`origin/main`)

| Concept | Value |
| --- | --- |
| Annotated release | `v1.5.0` |
| Tag object | `d52f3a4729f398143463e72e8147e4cb0ada1faa` |
| Peeled / release commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Production website deploy | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` |
| Production website commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Feature/runtime tip (QA-04) | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| `apps/website` tip→release | empty |
| Migration tip | `20260801180000` |
| Previous release | `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` |
| GitHub Release | none |
| Observed API `gitSha` | `830dbc8…` (transitive; no Phase 1.1 backend deploy) |

## Documentation drift

| Item | State |
| --- | --- |
| Anchor-sync PR #193 | **OPEN** (not merged) — living docs on `main` still partially describe pre-tag Production as `b14163c…` / `dpl_Hi35GY…` |
| This audit | Treats **released** anchors above as canonical; records #193 as pending honesty merge |
| Tracked marketing images | Brand/product assets under `apps/website/client/public/images/` — not Production PII screenshots |

## Verification at audit start

- `v1.5.0` annotated; peel matches closeout commit
- `v1.4.0` unchanged
- Production alias Ready on `dpl_BtPH8…`
- Public Production smoke/a11y PASS (8/8; 0 critical/serious on sampled public routes)
- API `/healthz` + `/readyz` ok; `issues: []`
