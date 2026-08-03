# RC6 Phase 1 — Release recommendation

## Recommendation

Create an **annotated git tag `v1.5.0`** at the closeout merge SHA (after this documentation PR merges to `main`).

Do **not** create a GitHub Release object at this time.

## Rationale

| Factor | Assessment |
| --- | --- |
| Production website verified | YES — `b14163c…` |
| Owner Command Center smoke | PASS |
| Backend / DB unchanged intent | YES |
| Residual limitations documented | YES — `RESIDUAL_LIMITATIONS.md` |
| SemVer increment | Minor (`v1.4.0` → `v1.5.0`) — new verified Owner Command Center capability |

## Tag anchor options

| Option | SHA | Notes |
| --- | --- | --- |
| Production runtime (minimum) | `b14163ccbc82fca0b2856ea137bddb746ed5716b` | QA-04 verified |
| Closeout docs merge (preferred) | closeout PR merge SHA | Includes evidence pack |

## Not recommended as release claims

- Complete ERP / Delivery / Settings
- Full admin WCAG
- Alerting / APM / paging enabled
- GitHub Release notes with marketing scope beyond verified delivery

## Prior release

`v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` (annotated tag; no GitHub Release).

**Stance:** Recommend `v1.5.0` tag after docs merge; acceptance is **PASS WITH LIMITATIONS**.
