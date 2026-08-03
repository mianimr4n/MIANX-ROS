# RC6 Phase 1 — Production performance / network sanity

**Target:** `https://telepizza-website.vercel.app/`  
**UTC:** `2026-08-03T00:44:05Z`

| Metric | Value |
| --- | --- |
| Public entry bundle | hashed `index-*.js` (Vite build) |
| Entry gzip approx | ~251.58 kB |
| Prior baseline gzip | ≈255.57 kB (`bf5912c…` window) |
| Script tags on `/` | 1 |
| Admin eager import on public `/` | **false** |
| Chunk-load errors | none observed in public smoke |

**Verdict:** PASS — no material usability failure; public route does not eagerly load Owner Command Center modules. Not an absolute performance SLA.
