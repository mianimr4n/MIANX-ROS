# RC6 Phase 1 — Release recommendation (executed)

## Recommendation (historical)

Create an **annotated git tag `v1.5.0`** at the closeout merge SHA after documentation PR #192 merges to `main`.

Do **not** create a GitHub Release object.

## Execution status

| Item | Status |
| --- | --- |
| Annotated tag `v1.5.0` | **Created** |
| Tag object | `d52f3a4729f398143463e72e8147e4cb0ada1faa` |
| Peeled target | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Production deploy | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` @ `830dbc8…` |
| Feature/runtime tip | `b14163c…` (`apps/website` ≡ release commit) |
| GitHub Release | **none** |

## Rationale (unchanged)

| Factor | Assessment |
| --- | --- |
| Production website verified | YES — deploy `830dbc8…`; files ≡ `b14163c…` |
| Owner Command Center smoke | PASS (`failCount: 0`) |
| Backend / DB unchanged intent | YES |
| Residual limitations documented | YES — `RESIDUAL_LIMITATIONS.md` |
| SemVer increment | Minor (`v1.4.0` → `v1.5.0`) |

## Prior release

`v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` (annotated tag; no GitHub Release) — **unchanged**.

**Stance:** Recommendation **executed**; acceptance remains **PASS WITH LIMITATIONS**.
