# Phase 1.1 — Public website audit

**Method:** Repository review + Production read-only smoke/a11y/perf (`telepizza-website.vercel.app` @ `830dbc8…` / `dpl_BtPH8…`)  
**Mutations:** none

## Production sampled results

| Check | Result |
| --- | --- |
| `/` desktop+mobile smoke | PASS |
| `/menu` desktop+mobile smoke | PASS |
| `/admin/login` smoke | PASS |
| `/reset-password` smoke | PASS |
| Public a11y critical/serious | 0 / 0 |
| Entry gzip | ~251.58 kB |
| Admin eager import from public | **false** |

## Findings

| ID | Severity | Route | Issue |
| --- | --- | --- | --- |
| P11-PUB-01 | P2 | `/loyalty` | Registered Coming Soon route with no in-app nav (DEAD_ROUTE) |
| P11-PUB-02 | P2 | `/account` `/favorites` | Dead/alias routes confuse inventory; prefer canonical `/my-telepizza/*` |
| P11-PUB-03 | P2 | `/checkout` | Promo redeem still Planned; ensure UI does not imply live coupons on checkout |
| P11-PUB-04 | P3 | Marketing images | Large JPG hero assets — review CLS/weight in POLISH-07 |
| P11-PUB-05 | P3 | `/book` | Public booking exists; parity with admin reservations maturity needs copy clarity |

## Assessment

Public marketing + menu path is **professionally usable** at release baseline. Checkout remains **PARTIAL_LIVE**. No P0 public defects observed in read-only Production smoke. Admin bundles are not eagerly loaded from public entry.
