# RC6-UI-01 — route verification

**Method:** Static source review + deterministic website tests. Local ephemeral Owner smoke for labels is optional; no Production credentials; no business mutations.

| Route | Label check |
| --- | --- |
| `/admin/hr` | Banner Partial LIVE; deactivate/shifts/payroll not Phase 2 |
| `/admin/finance` | Banner Partial LIVE; BS/CF/AR/Tax Foundation |
| `/admin/loyalty` | Module already honest; unused banner corrected |
| `/admin/settings` | Loyalty/finance settings copy corrected |
| `/admin/dashboard` | Operations grid Partial LIVE wording |
| `/admin/branch` | Inventory/Staff Partial; attendance CTA honest |
| Support / Integrations / AI Command Center | Planned (`AdminComingSoon`) |
| Inventory / Purchasing GRN | No “stock posting unavailable” claim |

Console/chunk-load: not observed in static change set (label/copy only).
