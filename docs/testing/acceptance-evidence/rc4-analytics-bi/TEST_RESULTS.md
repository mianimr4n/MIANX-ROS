# RC4-2 Test Results

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` (backend 592) | PASS |
| `pnpm test:db` | PASS (791 static DB/website assertions incl. analytics schema) |
| `pnpm rc1:gate` | PASS |
| `git diff --check` | PASS |
| Playwright `playwright.rc4-analytics-bi.config.ts` | PASS (2/2) |

Unit / API:

- `backend/api/tests/analytics-registry.test.ts`
- `backend/api/tests/analytics-api.test.ts`
- `tests/database/rc4-analytics-bi.test.mjs`
- `tests/website/admin-reports-business-intelligence-v1.test.mjs`
