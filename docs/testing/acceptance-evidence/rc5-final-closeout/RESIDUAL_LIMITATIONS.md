# RC5 residual limitations (non-blocking)

These items remain after RC5 closeout. They are **not** designated RC5 release blockers unless separately marked.

| Residual | Status | Notes |
| --- | --- | --- |
| Production alerts | `PROPOSED_NOT_ENABLED` | OBS-01 |
| Bulk log export | `NOT_CLAIMED` / not proven | OBS-01 |
| APM / paging | **NOT IMPLEMENTED** | OBS-01 |
| `/admin/reports` in CI Playwright | Deferred | QA-01 |
| Branch protection requiring Owner Playwright | Unchanged | QA-01 G-02 limitation |
| Moderate accessibility advisories | Residual | Accessible-name consistency; touch-target sizing/spacing; heading hierarchy; menu contrast where observed |
| Phase 2 product depth (finance/loyalty send/Analytics worker/PITR/etc.) | Deferred / Founder-gated | Roadmap deferred ideas |
| GitHub Release object | Does not exist for `v1.3.0`; not created for proposed `v1.4.0` | Tag-only SemVer to date |
| Package.json SemVer vs `v*` tags | TD-3 | website `1.0.0` / api `0.1.0` |
| Live-DB privilege CI job | Not added | OPS-01 residual |
| Lighthouse / RUM / CWV certification | Not claimed | PERF-01 + cutover |
| Northern Bypass go-live | Not authorized | Branch `coming-soon` |

## Explicit non-claims

Residuals above must not be rewritten as “RC5 incomplete” unless Founder designates them as blockers.
