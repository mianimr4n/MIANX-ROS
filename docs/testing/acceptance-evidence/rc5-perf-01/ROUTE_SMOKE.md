# RC5-PERF-01 — Route smoke & accessibility

## Commands

```bash
pnpm exec playwright test -c playwright.rc5-perf-01.config.ts
pnpm exec playwright test -c playwright.rc5-a11y-01.config.ts
```

Website: `http://localhost:3000` (local `pnpm --filter telepizza-pakistan dev`).  
No Production credentials.

## Critical-route smoke (`entry-bundle-smoke.spec.ts`)

| Check | Result |
| --- | --- |
| `/` renders; banner/footer; no pageerror; no chunk crash UI | PASS |
| `/menu` direct load + refresh | PASS |
| `/admin/login` form + axe critical/serious = 0 | PASS |
| `/reset-password` lazy route honest expired-link surface | PASS |
| Nav `/` → `/menu` → `/admin/login` | PASS |

Artifacts: `playwright-smoke.log`, `playwright-smoke-results.json`.

## Accessibility (RC5-A11Y-01 keep-green)

| Check | Result |
| --- | --- |
| Public home desktop axe critical/serious | **0** |
| Public home mobile axe critical/serious | **0** |
| Admin login axe spot-check (in smoke) | **0** critical/serious |

Artifacts: `playwright-a11y.log` (and existing `rc5-a11y-01` suite config).

## Manual visual spot-check (local)

| Surface | Notes |
| --- | --- |
| `/` desktop/mobile | Hero Suspense placeholder then slider; header/footer intact |
| `/menu` | Catalog/search usable; no FOUC of chrome |
| `/admin/login` | Form paints; no marketing navbar |

## Chunk failure / cache safety

- `ErrorBoundary` detects chunk/dynamic-import failures, shows honest copy (no stack dump for chunk failures).
- Reload is **user-initiated**; `sessionStorage` flag avoids treating a repeated failure as a silent infinite auto-reload loop.
- Vite hashed asset names unchanged in approach; lazy imports use static specifiers analyzable by Vite.
- No service worker added.
