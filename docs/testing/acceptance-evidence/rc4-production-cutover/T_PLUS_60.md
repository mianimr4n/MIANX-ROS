# T+60 monitoring

**Reference migrate end:** 2026-08-01 ~22:03 Asia/Karachi
**On-call:** Mian Imran
**Log file:** `tplus-checkpoints.log`

| Checkpoint | Asia/Karachi | Frontend | `/healthz` | `/readyz` | `issues` | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| T+0 | 22:10 | 200 | 200 | 200 | empty | Post-migrate |
| T+15 | 22:18 | 200 | 200 | 200 | empty | SHA `1d64895` |
| T+30 | 22:33 | 200 | 200 | 200 | empty | |
| T+60 | 23:03 | 200 | 200 | 200 | empty | |

**Public monitoring:** PASS (no restart loop / readiness failure observed at checkpoints).

**Not covered by public probes:** authenticated `42703` regression, Render log search for PostgREST cache errors (no log-platform credentials in session).

**Auth health 401 (no apikey):** still expected on deployed SHA — tracked as observability debt; fix PR #162 not deployed.
