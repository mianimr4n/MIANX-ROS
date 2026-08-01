# Final cutover report

## Decisions

| Decision | Status |
| --- | --- |
| Schema + smoke cutover | `PRODUCTION_MIGRATION_AND_SMOKE_COMPLETE` |
| RC4 final certification | `RC4_NOT_CERTIFIED` — `SECURITY_ROTATION_PENDING` |

## Delivery chain

| Step | Result |
| --- | --- |
| Production migrations 23/23 | Applied; remote tip `20260801180000` |
| Backup / history / precheck | Passed prior to apply |
| Public health + T+60 | Passed |
| Authenticated smoke (`post-migrate-smoke-auth.json`) | **PASS** |
| Targeted HR `employee_number` 42703 check | **PASS** |
| Targeted supplier invoice `due_date` 42703 check | **PASS** |
| Health-probe fix PR #162 | Merged + live on `2f0e432` |
| Analytics hotfix PR #163 | Merged + deployed `dep-d9n75v15efls73a4j5hg` |
| Analytics Production smoke | **PASS** (`analytics-hotfix-prod-smoke.json`) |

## Live Production facts

| Fact | Value |
| --- | --- |
| Migration tip | `20260801180000` |
| Live SHA | `2f0e4326310e1036cc23a94d5573dd4d774eaf0f` |
| Render deploy | `dep-d9n75v15efls73a4j5hg` |
| `/healthz` / `/readyz` | PASS |

## Evidence index

- Authorization, backup, migration, schema, RLS notes in this folder
- `ANALYTICS_HOTFIX.md`, `POST_DEPLOY_SMOKE_RESULTS.md`, `LOG_MONITORING.md`
- Final certification pack: `../rc4-final-certification/` (includes `SECURITY_CLOSEOUT.md`)

## Residual blocker for RC4 certify

Security rotation closeout not evidenced — see `../rc4-final-certification/SECURITY_CLOSEOUT.md`.
