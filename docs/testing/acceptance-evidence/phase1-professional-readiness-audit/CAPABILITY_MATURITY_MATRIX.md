# Phase 1.1 — Capability maturity matrix

Aligned with `docs/planning/RC6_CAPABILITY_TRUTH.md` and repository evidence at `v1.5.0`.  
**Note:** Living capability headers on `main` may lag until PR #193 merges; maturity below uses release-truth + code evidence.

| Capability | Maturity | Production evidence | Phase 1.1 note |
| --- | --- | --- | --- |
| Public website / menu | LIVE | Public smoke + a11y PASS @ `830dbc8…` | Polish residual only |
| Checkout / ordering | PARTIAL_LIVE | Not mutated in Prod audit | Promo/WA checkout gaps |
| Owner Command Center | LIVE | Owner smoke failCount 0 @ release | Hierarchy/density polish |
| Orders / Kitchen / Delivery | PARTIAL_LIVE | Routes observed; mutations not Prod-proven | Phase 2 depth deferred |
| POS / Floor / Reservations | FOUNDATION | Not in Phase 1 Prod smoke | Professional polish + honesty |
| Inventory / Purchasing / Recipes | FOUNDATION | Empty Prod stock common | Onboarding ≠ defect; fix honesty bugs |
| CRM | PARTIAL_LIVE | Order-derived only | Not customer master |
| Loyalty / Marketing | FOUNDATION / PARTIAL_LIVE | Repo APIs; Prod config may be empty | |
| WhatsApp admin | PARTIAL_LIVE | Order-source filter only | No provider inbox |
| HR / Payroll / Finance / Reports | FOUNDATION / PARTIAL_LIVE | Repo LIVE subsets; Prod unverified | Label contradictions |
| Settings | PARTIAL_LIVE | Org/branch writes; many nav-only | “Available” overstates |
| Support / Integrations / AI CC | DEFERRED | Coming Soon pages | Keep out of nav claims |
| Global admin search | DEFERRED | Disabled “Search unavailable” | Decision required (POLISH-01) |

## Summary counts (capability families)

| Maturity | Approx families |
| --- | --- |
| LIVE | Public site, Owner auth/dashboard, Command Center |
| PARTIAL_LIVE | Ops modules, CRM, WhatsApp, Settings core, Finance subset |
| FOUNDATION | Inventory/Purchasing depth, POS, Floor, Loyalty depth, Reports worker |
| DEFERRED / DEAD | Support, Integrations, AI CC, global search, orphan routes |
