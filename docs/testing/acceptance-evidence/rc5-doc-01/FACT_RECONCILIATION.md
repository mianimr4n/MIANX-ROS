# RC5-DOC-01 — Fact Reconciliation

**Baseline SHA:** `c1859117b24d6adbe2fb0633ea518538047cc120`
**Date:** 2026-08-02

## Canonical fact matrix

| Concept | Canonical value | Evidence |
| --- | --- | --- |
| Repository main | `c1859117b24d6adbe2fb0633ea518538047cc120` | `git rev-parse origin/main` |
| Released tag | `v1.3.0` | `git rev-list -n 1 v1.3.0` |
| Tag commit | `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` | peeled tag |
| Production app | `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291` | RC4 release notes / cutover evidence (no newer deploy claimed) |
| Migration tip | `20260801180000` | RC4 cutover / baseline |
| Release mechanism | Annotated git tag only | `gh release view v1.3.0` → not found; tag exists |
| RC4 status | Certified, security-closeout complete, release complete | RC4 evidence packs + notes |
| RC5 merged | OPS-01, A11Y-01 | PR #168, PR #169 → main |
| RC5 current | DOC-01 | This slice |
| RC5 next | TEST-01 | `RC5_ROADMAP.md` order 4 |

## Distinctions enforced in docs

1. **Repository main** may include post-tag merges (OPS-01, A11Y-01) without implying Production deploy.
2. **`v1.3.0` tag commit** is the released baseline (`74b6b8e…`), not current main.
3. **Production application SHA** remains `e5c6daf…` until newer deployment evidence.
4. **Production migration tip** is independent of application SHA and of repository main.

## Exact files changed

| File | Change type |
| --- | --- |
| `docs/17-releases/RELEASE_HISTORY.md` | Rewrite of tip/status/next-action sections |
| `docs/00-governance/REPOSITORY_STATUS.md` | Focused reconciliation + tip anchors + migration tip honesty |
| `docs/planning/RC5_BASELINE.md` | Anchor/slice-status update; remove unpushed-tag claim |
| `docs/releases/RC4_RELEASE_NOTES.md` | Narrow subsequent-status / tag-gate honesty |
| `docs/testing/acceptance-evidence/rc5-doc-01/*` | Evidence pack |
