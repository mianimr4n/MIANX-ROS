# RC6-DOC-01 — fact reconciliation

## Anchors after DOC-01 (living docs)

| Concept | Canonical value |
| --- | --- |
| DOC-01 branch baseline / post–PR #176 main | `25960eb2b69d2c390fe0ce364458c9cb3feeac0c` |
| Released tag | `v1.4.0` (annotated) |
| Tag peel | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` |
| Production website SHA | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Production website deployment | `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` |
| Production API SHA (RC5 cutover observed) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Production migration tip | `20260801180000` |
| GitHub Release for `v1.4.0` | **Does not exist** |
| RC5 status | CERTIFIED · PRODUCTION-VERIFIED · RELEASED |
| RC6 status | Planning merged (#176); DOC-01 active |

## Disposition

### GRN

- **Repository:** atomic GRN→stock posting implemented and unit-tested.
- **Production:** not claimed verified by RC5/RC6 DOC-01.
- **Residual:** invoice matching / payables depth; Prod smoke for GRN not performed.

### HR

- **Repository:** employee deactivate route present.
- **Not claimed:** full update lifecycle completion; Production HR smoke.
- **UI:** Phase-2 banners deferred to RC6-UI-01.

### Finance

- **Classification:** `PARTIAL_LIVE` per `RC6_CAPABILITY_TRUTH.md`.
- **Not claimed:** fully LIVE GL/reporting UX.
- **Follow-on:** RC6-FIN-01 / RC6-UI-01 for badge honesty or bounded wire-up.

## Files reviewed

- `docs/00-governance/REPOSITORY_STATUS.md`
- `docs/00-governance/PROJECT_STATUS.md`
- `docs/17-releases/RELEASE_HISTORY.md`
- `docs/planning/RC5_BASELINE.md`
- `docs/planning/RC5_RISK_REGISTER.md`
- `docs/planning/RC6_BASELINE.md`
- `docs/planning/RC6_CAPABILITY_TRUTH.md`
- `docs/planning/RC6_ROADMAP.md`
- `docs/testing/acceptance-evidence/rc5-final-closeout/RESIDUAL_LIMITATIONS.md`
- Evidence: `backend/api/src/services/purchasing/management.ts`, `backend/api/src/modules/admin/hr.ts`, `backend/api/tests/grn-stock-posting-atomic.test.ts`
