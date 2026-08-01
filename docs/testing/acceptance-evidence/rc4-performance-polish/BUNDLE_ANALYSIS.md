# Bundle Analysis

## Before (start SHA `ff0327e`)

| Asset | Raw | Gzip |
| --- | --- | --- |
| Single `index-*.js` | 2,129.50 kB | 524.18 kB |
| CSS | 178.46 kB | 27.56 kB |

No route chunks. Vite warned >500 kB.

## After (RC4-7 lazy routes)

| Asset | Raw | Gzip |
| --- | --- | --- |
| Entry `index-*.js` | **1,019.99 kB** | **294.51 kB** |
| CSS | 175.86 kB | 27.13 kB |

### Representative route chunks (raw ≈)

| Route / module | ~KB |
| --- | --- |
| Admin Dashboard | 62 |
| Admin HR / Payroll | 75 |
| Admin Settings | 86 |
| Admin Finance | 42 |
| Admin Loyalty | 23 |
| Admin Marketing | 21 |
| My Telepizza | 66 |
| Supplier documents (example) | ~4 |

## Changes applied

- `React.lazy` + `Suspense` for admin / ops / supplier / account routes in `App.tsx`
- Eager kept: public marketing, checkout, auth entry, admin login
- Removed unused `recharts` / `streamdown` and dead `ui/chart.tsx`

## Honesty

Entry chunk is still large (shared providers + marketing chrome). Further `manualChunks` deferred — not load-test certified.
