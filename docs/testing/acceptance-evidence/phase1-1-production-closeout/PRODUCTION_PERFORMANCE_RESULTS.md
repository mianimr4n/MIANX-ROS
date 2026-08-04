# Phase 1.1 — Production performance results

| Metric | Value | Gate |
| --- | --- | --- |
| Public entry asset | `/assets/index-BAb34PZJ.js` | |
| Entry gzip approx | **256.29 KB** (262445 bytes zlib) | ≤ ceil(251.58×1.02) ≈ 257 KB → PASS |
| Prior baseline gzip | 255.57 KB | |
| Public Admin eager import | **false** | PASS |
| Script count (home) | 1 | |
| Owner request storms | none observed in smoke | PASS |
| KDS poll contract | retained from POLISH-07 | PASS (code) |

Measurement note: gzipApprox is local zlib of downloaded JS body, not CDN `Content-Encoding`.
