# RC5-QA-01 — Local and CI run results

## Local self-test (three consecutive greens)

Stack: existing local Supabase + API `:4000` + website `:3000` (CORS-aligned `http://localhost:3000`).

Command:

```text
pnpm exec playwright test --config=playwright.rc5-qa-01.config.ts
```

Env: `D3_E2E_BASE_URL=http://localhost:3000`, `D3_E2E_API_URL=http://127.0.0.1:4000`

| Run | Login | Dashboard | Guard | Duration (s) | Retry | Result |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | PASS | PASS | 14.8 | 0 | PASS |
| 2 | PASS | PASS | PASS | 13.4 | 0 | PASS |
| 3 | PASS | PASS | PASS | 14.6 | 0 | PASS |

## CI

Recorded after PR push (update this section with workflow run URL / duration).

| Field | Value |
| --- | --- |
| Workflow | `CI` / job `owner-playwright` |
| Run | _pending push_ |
| Duration | _pending_ |
| Result | _pending_ |
