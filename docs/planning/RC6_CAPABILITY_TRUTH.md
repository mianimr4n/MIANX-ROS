# RC6 Capability Truth

**Status:** Discovery evidence (planning)
**Date:** 2026-08-02
**Baseline tip:** `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` (`v1.4.0`)
**Production website runtime:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`

> Truth statuses use the closed enum below. A route or sidebar entry alone is **not** implementation proof. A migration alone is not E2E proof. A test fixture alone is not Production proof.

## Truth status enum

| Status | Meaning |
| --- | --- |
| `LIVE_VERIFIED` | Repository + Production evidence for the claimed path |
| `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` | Repo UI/API/DB/tests present; no Prod acceptance pack for the capability |
| `PARTIAL_LIVE` | Meaningful subset LIVE; documented gaps remain |
| `FOUNDATION_READ_ONLY` | Schema/API foundation without full product runtime |
| `UI_ONLY` | Screens without sufficient API/persistence |
| `MOCK_ONLY` | Demo/mock paths only |
| `PLANNED` | Placeholder / Coming Soon without implementation |
| `DEFERRED` | Explicitly deferred with honesty |
| `STALE_LABEL` | Labels/docs contradict repository evidence |
| `NOT_PRESENT` | No meaningful implementation found |
| `NEEDS_INVESTIGATION` | Conflicting signals; needs Founder/engineering confirmation |

---

## Capability matrix

| Capability | UI | API | Database | Tests | Production evidence | Truth status |
| --- | --- | --- | --- | --- | --- | --- |
| Public website | Marketing/menu/cart | Optional live API + bundled catalog | Branches/menu | Website/a11y/perf suites | Public smoke + a11y + perf PASS | `LIVE_VERIFIED` |
| Menu browse | `/menu` | `GET /api/v1/menu/catalog` | Menu migrations | Canonical menu tests | `/menu` smoke PASS | `LIVE_VERIFIED` |
| Ordering / checkout | Checkout + WhatsApp path; promo disabled | Order create/quote | Orders | Order/pricing tests | No paid/order mutation in RC5 Prod smoke | `PARTIAL_LIVE` |
| Auth (Owner) | `/admin/login` | Supabase Auth + principal | Profiles/roles | Auth/RBAC tests | Owner login/session PASS | `LIVE_VERIFIED` |
| Auth (customer) | Login/register/reset | Same Auth stack | Profiles | Auth tests | Customer RBAC not re-proven in RC5 | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Admin dashboard | `/admin/dashboard` | Operations KPIs | Ops views | Dashboard tests | Owner dashboard PASS | `LIVE_VERIFIED` |
| Branch management | `/admin/branch`; NB coming-soon | Branch settings/readiness | Branch status | Branch tests | `/admin/branch` observed | `PARTIAL_LIVE` |
| Orders (admin) | `/admin/orders` | Admin order transitions | Orders | Orders authz tests | Read-only observed | `PARTIAL_LIVE` |
| Kitchen / KDS | Kitchen + kitchen-dashboard | Kitchen tickets | Kitchen tickets | Kitchen tests | Routes observed; transitions not Prod-proven | `PARTIAL_LIVE` |
| Delivery | `/admin/delivery` | Deliveries/riders | Delivery assignments | Delivery/rider tests | Route observed | `PARTIAL_LIVE` |
| POS | `/admin/pos` Limited | POS orders + Z-report | POS/orders | POS tests | Not in RC5 smoke | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Floor / reservations | Floor/reservations/waitlist | Dine-in module | Floor sessions | D3 tests | Not in RC5 smoke | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Inventory | `/admin/inventory` | Inventory router + atomic adjust | Inventory + recipes migrations | Inventory tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Recipes | Recipe panels | Recipe CRUD/consume | `20260731180000` | Recipe tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Purchasing | `/admin/purchasing` | PO/requisitions/invoices | Purchasing migrations | Purchasing tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Suppliers / portal | Admin + `/supplier/*` | Supplier portal module | Supplier migrations | Supplier portal tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| GRN / receiving | Purchasing UI | `create_goods_receiving_with_stock_atomic` | GRN tables | `grn-stock-posting-atomic.test.ts` | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Finance | `/admin/finance` mixed panels | Finance router incl. BS/CF/AR/tax APIs | `20260731190000` | Finance tests | None Prod | `PARTIAL_LIVE` |
| Payroll | HR payroll overview | Payroll runs calc/approve | Payroll migrations | Payroll calc tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| HR | Employees/attendance/leave/docs | HR router incl. deactivate | HR migrations | HR/document tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Scheduling | Shift planner on HR | Shift APIs | HR shifts | HR suites | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| CRM | `/admin/crm` order-derived | Orders-backed | Orders | Indirect | None Prod | `PARTIAL_LIVE` |
| Loyalty | `/admin/loyalty` | Loyalty admin router | Loyalty + `20260801180000` | Loyalty depth tests | None Prod | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Marketing | `/admin/marketing` | Marketing router + provider gate | Marketing migrations | Marketing tests | None Prod | `PARTIAL_LIVE` |
| WhatsApp admin | Order-derived view | No conversation provider | Orders only | Indirect | None Prod | `PARTIAL_LIVE` |
| Analytics / reports | `/admin/reports` | Analytics + export; worker deferred | `20260801120000` | Analytics/reports tests | Not smoked; CI path deferred | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Documents | HR/supplier uploads | Document APIs + storage | Documents migrations | Document RBAC tests | None Prod; virus scan deferred | `IMPLEMENTED_NOT_PRODUCTION_VERIFIED` |
| Support | Coming Soon page | No support module | — | — | — | `PLANNED` |
| Integrations | Coming Soon / Settings FOUNDATION | Opening channels only | Opening tables | Opening tests | — | `PLANNED` |
| AI Command Center | Coming Soon | — | — | — | — | `PLANNED` |
| AI / Mianx Team | Deterministic cards | Read-only AI foundation APIs | AI foundation tables | AI foundation tests | None Prod | `FOUNDATION_READ_ONLY` |
| Settings | Mixed LIVE/FOUNDATION | Org/branch writes; many Phase 2 | Org/branch settings | Settings tests | Not smoked | `PARTIAL_LIVE` |
| Tax | Static LIVE badges / Settings UNAVAILABLE | Tax-definitions APIs | Finance phase2 | Finance phase2 tests | None | `FOUNDATION_READ_ONLY` |
| Printers | Phase 2 copy | No printer config API found | — | — | — | `PLANNED` |
| Security policies UI | Settings FOUNDATION | RBAC middleware LIVE | Roles/permissions | AuthZ tests | Owner login verified | `PARTIAL_LIVE` |
| Audit / observability | Runbooks; no APM UI | Logging + health/ready | — | Observability tests | Health PASS; alerts not enabled | `PARTIAL_LIVE` |
| CI / release ops | N/A | `ci.yml` check + Owner Playwright | — | CI itself | Tag `v1.4.0` exists; Release UI absent | `PARTIAL_LIVE` |

---

## Status-label audit

| Route / component / doc | Current label | Repository evidence | Correct label | Action | Classification |
| --- | --- | --- | --- | --- | --- |
| `REPOSITORY_STATUS.md` | GRN does not post stock | Atomic GRN+stock RPC + tests | Repo LIVE; Prod unverified | Update governance | stale |
| `REPOSITORY_STATUS.md` | HR lacks deactivate | `POST /hr/employees/:id/deactivate` | Lifecycle present in repo | Update governance | stale |
| `RELEASE_HISTORY` / residuals | `v1.4.0` not created | Annotated tag on `96f1e803` | Released | Sync living docs | stale |
| Living docs tip | Main = `152ce40` | Tip = `96f1e803` | Tip vs Prod SHA separate | Sync anchors | stale |
| `OperationsModuleGrid` Finance | Ledger arrives later | Finance CoA/journals/TB/P&L UI | Partial LIVE | Retag | overly pessimistic |
| `OperationsModuleGrid` Employees | Payroll arrives later | Payroll UI/API present | Partial LIVE | Retag | stale |
| `HRStatusBanner` | Payroll/shifts Phase 2 | Payroll + ShiftPlanner LIVE in repo | Narrow Phase 2 to reviews/training | Rewrite | misleading |
| `FinanceStatusBanner` / Statements BS/CF | LIVE | API exists; UI not wired to fetch | API foundation / UI unwired | Downgrade or wire | overly optimistic |
| `ReceivablePanel` / `TaxPanel` | LIVE badge | Static copy; no list UI | FOUNDATION | Downgrade or wire | overly optimistic |
| `LoyaltyProgramBanner` / settings loyalty | Ledger absent | Loyalty ledger APIs LIVE | Remove stale ledger claim | Fix copy | stale |
| `WhatsAppIntegrationBanner` | Conversation Phase 2 | Orders-only view | Keep | — | accurate |
| `CartDrawer` promo | Coming soon | Coupons exist; checkout redeem unwired | Keep Planned | — | accurate |
| Support / AI CC / Integrations Coming Soon | Planned | Placeholder pages | Keep | — | accurate |
| Northern Bypass | Coming soon | Branch status | Keep Founder-gated | — | accurate |
| Kitchen stations / delivery GPS / inventory FIFO / COGS GL | Phase 2 | Explicit honesty | Keep | — | accurate |
| Reports scheduled execution | Deferred | Worker not implemented | Keep | — | accurate |
| `SettingsReadinessBanner` Partial LIVE | Partial LIVE | Org/branch writes | Keep | — | accurate |

---

## Deferred Phase 2 classification

| Item | Classification |
| --- | --- |
| Alerts enablement | Still relevant · operational · Founder thresholds |
| Bulk log export | Still relevant · ops proof gap |
| APM/paging | Still relevant · provider/ops · not early RC6 unless scoped |
| `/admin/reports` CI | Still relevant · QA |
| Branch protection Owner Playwright | Founder-gated |
| Moderate a11y advisories | Still relevant |
| Loyalty/marketing provider send | Provider-dependent · Founder-gated |
| WhatsApp conversation/webhooks | Provider-dependent · not present |
| Analytics worker | Still relevant · backend |
| Customer checkout promo redeem | Still relevant · product |
| Documents virus scan | Founder-gated security ADR |
| PITR | Founder-gated commercial |
| Northern Bypass go-live | Founder-gated |
| AI runtime / Command Center | Foundation + Planned |
| Support / Integrations / Printers | Planned |
| GRN stock posting (as gap) | **Already implemented** in repo — governance stale |
| HR deactivate (as gap) | **Already implemented** in repo — governance stale |
| Payroll/shifts (as Phase 2 banners) | **Already implemented** in repo — labels stale |
| Loyalty ledger (as absent) | **Already implemented** in repo — labels stale |
| `v1.4.0` “not created” | **Superseded** — tag exists |
| GitHub Release automation | Still relevant · optional convention |
| package.json SemVer | Still relevant · hygiene |
| Live-DB privilege CI | Still relevant · ops residual |

---

## Screens that appear actionable but incomplete

| Surface | Risk |
| --- | --- |
| Finance BS/CF / AR / Tax panels with LIVE badges | Operators may expect working reports; UI is largely unwired |
| Marketing send actions behind provider gate | May look sendable; delivery not claimed |
| Loyalty settings “ledger absent” vs working loyalty admin | Conflicting operator guidance |
| Settings security / tax / printers FOUNDATION cards | Appear navigable; config writes missing |
| Support / Integrations / AI Command Center | Placeholder only |

Do **not** change labels in discovery. Label correction is proposed as RC6-DOC-01 / follow-on UI honesty slices.
