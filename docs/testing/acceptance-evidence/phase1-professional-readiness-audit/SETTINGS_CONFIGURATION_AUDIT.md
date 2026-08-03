# Phase 1.1 — Settings & configuration audit

**Source:** `lib/admin-settings.ts` `SETTINGS_CATEGORIES` + Settings panels  
**Route:** `/admin/settings`

## Category classification

| Category | Declared | Audit class | Notes |
| --- | --- | --- | --- |
| Organization | LIVE | EDITABLE_LIVE | Real writes |
| Branches | LIVE | EDITABLE_LIVE | Real writes |
| Restaurant Operations | LIVE | EDITABLE_LIVE / PARTIAL | |
| Orders / POS / Kitchen / Delivery / Menu | LIVE | NAVIGATION_ONLY or PARTIAL | Deep-link panels; nav shows “Available” |
| Inventory / Purchasing / Reports / HR | LIVE | NAVIGATION_ONLY | Misleading Available |
| Finance & Tax | UNAVAILABLE | DEFERRED | Nav collapses to Phase 2 label |
| Payments / Communications / Loyalty | FOUNDATION/LIVE mix | METADATA_ONLY / PARTIAL | Gateway secrets env-managed |
| Access | READ-ONLY | METADATA_ONLY | |
| Localization / Integrations / Security / Privacy / Advanced | FOUNDATION/READ-ONLY | DEFERRED / METADATA_ONLY | |

## Explicit investigations

| Topic | Finding |
| --- | --- |
| Org vs branch selector | Shell branch context + Settings branch editing can confuse |
| Save consistency | Org/branch saves exist; nav-only categories have no save |
| Blank content | Large whitespace on Foundation panels |
| “Use Admin → X” panels | Common for LIVE-classified nav-only categories |
| Phase 2 label clutter | Dense |
| SettingsReadinessBanner | **Not mounted** on `AdminSettings` |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-SET-01 | P1 | Nav “Available” for navigation-only categories (`SettingsNav.tsx`) |
| P11-SET-02 | P1 | Orphan `SettingsReadinessBanner` not rendered |
| P11-SET-03 | P2 | UNAVAILABLE vs FOUNDATION both labeled “Planned for Phase 2” |
| P11-SET-04 | P2 | Payments/Communications LIVE badges vs FOUNDATION matrix |
| P11-SET-05 | P2 | Branch context: settings edit target vs active shell branch |

## Assessment

Settings is **PARTIAL_LIVE** with serious **MISLEADING_STATUS** risk on nav badges. POLISH-04 priority.
