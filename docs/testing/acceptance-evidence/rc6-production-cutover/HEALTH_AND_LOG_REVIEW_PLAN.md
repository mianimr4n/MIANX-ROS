# Health and log review plan (DRAFT — post-deploy)

## API (read-only)

| Endpoint | Expect |
| --- | --- |
| `/healthz` | HTTP 200 |
| `/readyz` | HTTP 200; issues empty where applicable |

Confirm no migration problem, no auth 5xx spike, no unexpected DB permission errors (`42501` / `42P01` / `42703`).

## Bounded log window

Search deployment/smoke window for: unexpected 5xx, chunk/asset failures, auth failures caused by deploy, safe correlation IDs only.

Known residuals: alerts not enabled; bulk export unproven; APM/paging not implemented.
