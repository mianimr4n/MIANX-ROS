# RC4 Production Cutover — Pre-Migration App Baseline

**Recorded:** 2026-08-01 ~21:13–21:20 Asia/Karachi
**Linked project:** `pyeowxvacgypohrbvgee`
**Mode:** read-only probes only (no authenticated destructive actions)

## Endpoints

| Probe | Target | Result |
| --- | --- | --- |
| Frontend HTTP | `https://telepizza-website.vercel.app/` | **200** |
| Backend `/healthz` | `https://telepizza-api.onrender.com/healthz` | **200** |
| Backend `/readyz` | `https://telepizza-api.onrender.com/readyz` | **200** |
| Public branches | `GET /api/v1/branches` | **200** (live rows) |
| Public menu | `GET /api/v1/menu/catalog` | **200** (live catalog) |
| Unauthenticated protected route | `GET /api/v1/admin/loyalty/accounts` | **401** Unauthorized |
| Auth health without apikey | `GET https://pyeowxvacgypohrbvgee.supabase.co/auth/v1/health` | **401** (noise signature) |

## Deployed Git SHA (API)

From `/healthz` and `/readyz`:

`gitSha`: **`1d648950a8ea5bfb982713a203bacc6c7dd93ec1`**

Notes:

- Equals `origin/main` (RC4-7 Performance & Polish merge).
- Health-probe authentication fix on certification tip `1c8894d` is **not** deployed yet (by design in this prep).
- `/readyz` reports `database.connectivity: "ok"` under currently deployed probe semantics.

## Known schema-drift signatures (pre-migration)

From prior Production certification / schema dump of this cutover:

| Signature | Evidence |
| --- | --- |
| `42703` — `supplier_invoices.due_date` does not exist | Pending migration `20260731040000`; absent in schema dump |
| `42703` — `hr_employees.employee_number` does not exist | Pending migration `20260731050000`; absent in schema dump |

`/readyz` body does not embed these `42703` strings; failures appear on admin/finance/HR query paths that select the missing columns.

## Auth health 401 signature

Unauthenticated `GET /auth/v1/health` returns **401**. Local fix (not deployed) sends `apikey` + `Bearer` so Production health checks stop treating gateway 401 as the steady-state path when a key is configured.
