# RC6 Phase 1 — API / backend compatibility

## Transitive-impact matrix (`v1.4.0` → feature tip `b14163c…` / release `830dbc8…`)

| Changed path/package | Backend consumer | Runtime impact | Deploy needed | Evidence |
| --- | --- | --- | --- | --- |
| `backend/api/**` | n/a | none | no | empty diff in RC6 range |
| `pnpm-lock.yaml` | n/a | none | no | empty diff |
| `supabase/migrations/**` | n/a | none | no | empty diff |
| `apps/website/**` | API contracts unchanged | website-only | no (website deploy only) | QA-04 logout guard; closeout docs-only |
| `package.json` / CI | scripts/CI only | none (dev/CI) | no | owner smoke contract |

**Conclusion:** `BACKEND_RUNTIME_UNCHANGED` for RC6 Phase 1 intent.

## Production API anchor (read-only)

| Field | Value |
| --- | --- |
| Platform / service | Render `telepizza-api` (`https://telepizza-api.onrender.com`) |
| `/healthz` | HTTP 200, `ok: true`, `envClass: production`, `database.connectivity: ok` |
| `/readyz` | HTTP 200, `ok: true`, `issues: []` |
| Observed `gitSha` (at release) | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Observed `gitSha` (QA-04 window; historical) | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Migrations tip via API | `unavailable` (by design) |
| Backend deploy by Phase 1 | **none intentional** |
| Compatibility | `WEBSITE_API_COMPATIBLE_NO_BACKEND_DEPLOY_REQUIRED` |

Note: Render observed SHA tracks `main` transitively even though `backend/api` content was unchanged in the RC6 range. No additional backend promotion required for Phase 1.
