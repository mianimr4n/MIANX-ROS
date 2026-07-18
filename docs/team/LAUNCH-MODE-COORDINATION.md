# Launch Mode — AI Agent Coordination Status

**Date:** 2026-07-19
**Coordinator:** Project Manager Agent (Mianx.ai Launch Mode)
**Priority:** Highest — Telepizza Pakistan production launch before **14 August**
**ERP expansion:** Deferred until Telepizza launch complete
**Roadmap SSOT:** `docs/architecture/TELEPIZZA-MASTER-ROADMAP.md`

---

## Rules (enforced)

- Work only on the **current opened sprint**
- Finish existing work before new features
- No placeholder / fake loyalty / fake payment success
- No skipped tests · no broken builds
- No auto-merge · no auto-deploy from agents
- Telepizza-specific config stays separate from platform logic

---

## Sprint board (engineering)

| Sprint | Status |
|---|---|
| 4.5A My Telepizza (PR #82) | ✅ MERGED |
| 4.6 Restaurant Ops Foundation (PR #84) | ✅ MERGED to `main` |
| 4.6 remediation `b345b42` (authz/sync/busy/print/tests) | 🟡 On feature branch — **follow-up PR required** (not yet on `main`) |

---

## Launch success criteria (16)

| # | Criterion | Status | Evidence / gap |
|---|---|---|---|
| 1 | Browse menu | ✅ | Menu + catalog |
| 2 | Search products | ✅ | `Menu.tsx` search |
| 3 | Customize items | ✅ | Product configurator + modifiers |
| 4 | Add to cart | ✅ | Cart |
| 5 | Checkout | ✅ | Quote + create order |
| 6 | Select branch | ✅ | Branch picker (RO operating; NB coming-soon) |
| 7 | Delivery or pickup | ✅ | Checkout modes |
| 8 | Pay (available methods) | 🟡 | COD / pay-on-collect only — JazzCash/EasyPaisa not live |
| 9 | Receive confirmation | 🟡 | Success page; no automated WA/SMS/email order confirm |
| 10 | Track order | ✅ | Tracking UI/API; ops can move through `dispatched`/`completed` |
| 11 | Restaurant receives | ✅ | `/ops/orders` + admin order APIs |
| 12 | Kitchen prepares | ✅ | `/ops/kitchen` + kitchen ticket APIs |
| 13 | Rider dispatches | ✅ | `/ops/dispatch` + riders APIs (needs rider roster data) |
| 14 | Customer receives | ✅ | Delivery `delivered` / admin `complete` closes loop |
| 15 | Order saved in history | 🟡 | Server store yes; customer hub still partly device-local |
| 16 | Customer can reorder | ✅ | Catalog-backed reorder (PR #82) |

**Digital ops loop (platform):** ✅ Foundation shipped (merge remediation to `main` still pending)
**14 Aug business readiness:** still needs staff/rider accounts, Owner GO/NO-GO, Bypass decision, COD acceptance

Northern Bypass remains **`coming-soon`** until approved activation.

---

## Remaining Owner / Ops tasks (not code)

1. Merge Sprint 4.6 remediation follow-up PR to `main` + deploy API/website
2. Create staff invites (BM, kitchen, cashier) + rider roster rows for Royal Orchard
3. Dry-run one live order through `/ops` end-to-end
4. Lock Tier A (COD + RO) vs dual-branch Bypass activation
5. Aug 13 GO/NO-GO with smoke evidence

---

## Definition of Done (task)

Code + backend + DB + UI + responsive + a11y + tests + build + docs + **Ready for review**.
Launch Mode agents do not merge or deploy automatically.
