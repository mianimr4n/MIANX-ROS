# POLISH-QA — Responsive viewport matrix

## Viewports

320×568, 360×800, 390×844, 412×915, 768×1024, 820×1180, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080.

## Method

Headed Playwright: navigate once per route, then resize across all 11 viewports; assert `documentElement.scrollWidth <= clientWidth + 2`.

## Routes covered

**Public:** `/`, `/menu`, `/admin/login`  
**Admin:** dashboard, orders, kitchen, delivery, inventory, purchasing, CRM, HR, finance, reports, settings

## Result

| Check | Result |
| --- | --- |
| Page-level horizontal overflow | **0** on covered matrix |
| P1 unusable route | **0** observed |
| Owner attention-first (dashboard) | Preserved (Owner e2e + polish-qa) |

## Additional

| Check | Evidence |
| --- | --- |
| 200% zoom / reduced motion / long labels | POLISH-06 evidence retained; no regression claimed beyond matrix |
| Mobile drawer | POLISH-06 + Owner mobile smoke PASS |

Harness note: earlier full re-navigation caused `ERR_INSUFFICIENT_RESOURCES` (ENVIRONMENT_DEFECT); resized-in-place method is the certified path.
