# RC4-9 Test Results

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | **PASS** | Lockfile up to date |
| `pnpm check` | **PASS** | Website + backend tsc |
| `pnpm test` | **PASS** | Node static 769 + Vitest 553 |
| `pnpm test:db` | **PASS** | Included in `pnpm test` |
| `pnpm rc1:gate` | **FAIL** | Live auth/KDS scripts → `ECONNREFUSED :4000` |
| `git diff --check` | **PASS** | |

## Added coverage

| Layer | Artifact |
| --- | --- |
| Unit | `inventory-units.test.ts` |
| API | `inventory-recipes.test.ts` (RBAC list + migration contracts) |
| DB static | `rc4-inventory-recipes.test.mjs` |
| Website static | `rc4-inventory-recipes.test.mjs` + inventory honesty updates |
| Playwright | `e2e/rc4/inventory-recipes.spec.ts` scaffold — **not executed** |

## Accessibility

Axe scaffolded; 0 critical / 0 serious **not claimed** without run.
