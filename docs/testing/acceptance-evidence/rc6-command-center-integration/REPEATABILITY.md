# Repeatability — RC6-QA-03

Command (local, retries=0 via `CI` unset):

```text
pnpm test:e2e:owner -- e2e/rc5/owner-command-center-integration.spec.ts
```

| Run | Result | Duration | Retries | Errors |
| --- | --- | --- | --- | --- |
| 1 | PASS (3/3) | 61.0s | 0 | none |
| 2 | PASS (3/3) | 48.9s | 0 | none |
| 3 | PASS (3/3) | 51.6s | 0 | none |

Criteria met: three consecutive greens; no retry-only success; local ephemeral stack only; no Production access.

Fixture note: deterministic seeded Owner `admin@telepizza.pk` via gitignored handover JSON.
