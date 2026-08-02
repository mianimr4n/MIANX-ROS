# RC5-DOC-01 — Document Contradictions

**Baseline SHA:** `c1859117b24d6adbe2fb0633ea518538047cc120`
**Branch:** `docs/rc5-doc-01-release-status-sync`
**Date:** 2026-08-02

## Files reviewed

- `docs/17-releases/RELEASE_HISTORY.md`
- `docs/00-governance/REPOSITORY_STATUS.md`
- `docs/planning/RC5_BASELINE.md`
- `docs/releases/RC4_RELEASE_NOTES.md`
- Cross-check: `docs/planning/RC5_ROADMAP.md`, `docs/planning/RC5_ACCEPTANCE_CRITERIA.md` (read-only)

## Stale / contradictory claims found

| File / section | Claim before | Repository evidence | Resolution in this slice |
| --- | --- | --- | --- |
| `RELEASE_HISTORY.md` current verified state | main `17cc5e9…`; last verified 2026-07-28 | `origin/main` = `c185911…`; tag `v1.3.0` @ `74b6b8e…` | Replaced with canonical anchors table |
| `RELEASE_HISTORY.md` next action / “This branch” | Opening-readiness on `feature/opening-readiness-final` | RC4 released; RC5 roadmap active | Next = DOC-01 then TEST-01; opening-readiness framing removed as current task |
| `REPOSITORY_STATUS.md` header / Current Delivery | Reconciled 2026-07-30 / PR #133; focus = release certification | RC4 certified + `v1.3.0` tagged; RC5 slices merged | Reconciled 2026-08-02; RC5-DOC-01 current; tip anchors added |
| `REPOSITORY_STATUS.md` Production migrations tip | Implied tip through `20260730210000` as post-push state | Production tip `20260801180000` | Current tip called out; July-30 table retained as historical |
| `RC5_BASELINE.md` Anchors | “Recommended unpushed release tag `v1.3.0` @ `e40351b`” | Tag pushed; peels to `74b6b8e…` | Tag created/pushed @ `74b6b8e…`; main later (`c185911…`) |
| `RC4_RELEASE_NOTES.md` tag gate | Recommendation only; tag not created by that PR | Tag later created at closeout tip | Historical recommendation preserved; subsequent-status note added |

## Explicit non-changes

- No claim that a GitHub Release exists
- No invented Production redeploy of RC5 merges
- ERP capability tables left intact except tip/focus honesty
- `RC5_ROADMAP.md` / acceptance criteria not rewritten (already aligned)
