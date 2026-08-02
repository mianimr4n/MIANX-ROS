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

| Field | Value |
| --- | --- |
| Workflow | `CI` / job `Owner Playwright` (`owner-playwright`) |
| Implementation green | https://github.com/mianimr4n/telepizza/actions/runs/30740745027 (~3m 58s Owner job) |
| Post-evidence green | https://github.com/mianimr4n/telepizza/actions/runs/30740917419 (Owner ~4m 12s; tip SHA includes evidence update) |
| Conclusion | **success** (both runs) |
| Production credentials | Not used |
| Cleanup | `if: always()` stop step present |
