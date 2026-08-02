# Final cutover report

## Decisions

| Decision | Status |
| --- | --- |
| Schema + smoke cutover | `PRODUCTION_MIGRATION_AND_SMOKE_COMPLETE` |
| Security closeout | `SECURITY_CLOSEOUT_COMPLETE` |
| RC4 certification evidence | `RC4_CERTIFICATION_PR_READY` |

## Live Production facts

| Fact | Value |
| --- | --- |
| Migration tip | `20260801180000` |
| Live SHA | `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291` |
| Password recovery | PR #165 deployed |
| `/healthz` / `/readyz` | PASS |
| Post-rotation Owner smoke | PASS (`security-closeout-smoke.json`) |

Canonical narrative: `../rc4-final-certification/FINAL_CUTOVER_REPORT.md`
