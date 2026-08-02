# RC6-UI-01 — accessibility check

| Check | Result |
| --- | --- |
| Capability badges expose text + `role="status"` + aria-label | PASS (shared badge + planned module) |
| Status not color-only | PASS |
| HR/Finance banners retain `role="status"` / `aria-live="polite"` | PASS |
| Public-home axe regression | PASS — desktop @1440 + mobile @390 (`e2e/rc5/public-home-a11y.spec.ts`) |
| Admin-login axe spot-check | PASS — `/admin/login` (`e2e/rc5/entry-bundle-smoke.spec.ts`) |
| No empty links/buttons introduced | PASS (copy-only) |

Known residual: moderate public a11y advisories remain RC6-A11Y-02 — not in scope.
