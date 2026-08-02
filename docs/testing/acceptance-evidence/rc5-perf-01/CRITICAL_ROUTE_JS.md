# RC5-PERF-01 — Critical-route initial JavaScript

Methodology (same before/after):

- **Before:** critical routes were served entirely from the monolithic entry (no sync sibling JS). Initial JS = entry only; request count = 1 JS file.
- **After:** initial JS = entry + any **synchronously** imported siblings from entry + route-owned **dynamic** chunks required for first usable render.
- Entry has **zero** sync JS imports after the change.
- For `/`, first usable hero also loads async `HeroSlider-*.js` (Embla). Counted in `/` aggregate.
- For `/menu` and `/admin/login`, Home’s HeroSlider is not executed → not counted.
- Sizes are build-artifact gzip (not network timing / Lighthouse).

## Aggregate table

| Route | Before initial gzip | After initial gzip | Change | Requests (JS) |
| --- | --- | --- | --- | --- |
| `/` | 294.63 kB | 265.45 kB (entry + HeroSlider) | **−9.9%** | 1 → 2 |
| `/menu` | 294.63 kB | 254.95 kB (entry only) | **−13.5%** | 1 → 1 |
| `/admin/login` | 294.63 kB | 254.95 kB (entry only) | **−13.5%** | 1 → 1 |

Guardrail: no critical route aggregate increased >3%. **PASS** (all decreased).

## Per-route notes

### `/`

- Initial entry chunk: `index-*.js`
- Sync dependents: none
- Dynamic for first usable hero: `HeroSlider-*.js`
- Accessible Suspense fallback while hero chunk loads (`role="status"`)

### `/menu`

- Menu page remains eager in entry (critical route)
- No HeroSlider / customizer / AdminShell request on first paint

### `/admin/login`

- AdminLogin remains eager
- AdminShell no longer in entry (was accidental via Unauthorized)
- Ops chrome hides Navbar/Footer at runtime; their JS remains in entry for public shell reuse (documented residual)

## Duplicate libraries

- No measured duplicate of React/Supabase across critical initial sets.
- Admin route chunks share async `AdminShell-*.js` after Unauthorized was deferred (expected Rollup sharing).

## Avoidable eager modules removed

- AdminShell via eager Unauthorized
- Checkout / booking / customer-auth page graphs
- Embla carousel (except async on `/`)
- Pizza configurator / radix select until open
