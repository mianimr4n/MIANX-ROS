# RC5 Production — performance sanity

**Not claimed:** Lighthouse, RUM, Core Web Vitals, load-test certification.

| Metric | Live Production | Notes |
| --- | --- | --- |
| Entry file | `index-CtwmS6OY.js` | content-hashed |
| Entry raw | 869,835 B | |
| Entry gzip | 255,572 B (~255.57 kB) | Evidence band ~254.95 kB; local predeploy build ~255.50 kB |
| `/` HeroSlider deferred | **Yes** (HeroSlider chunk observed on `/`) | |
| `/menu` eager AdminDashboard | **No** | |
| `/admin/login` eager AdminDashboard / PizzaCustomizer | **No** | |
| Script requests | `/`: 4 · `/menu`: 1 · `/admin/login`: 1 | |
| Page errors during capture | none | |

Authoritative committed PERF-01 evidence remains entry gzip ≈254.95 kB (−13.5%). Live gzip is consistent (within ~0.6 kB / build-host variance). No material contradiction.

**Verdict:** PASS
