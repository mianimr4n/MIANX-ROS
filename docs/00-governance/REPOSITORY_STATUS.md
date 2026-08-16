# Repository Status

**Status:** Living Document

**Last reconciled:** 2026-08-16 — **Phase 11 COMPLETE (`v2.6.0`)** — Finance and Reporting formally closed: ADR-036/037/038 accepted (Branch GL/P&L/Balance Sheet/Cash Flow Contract, Cash Reconciliation/Z-Report/COD Financial Ownership Contract, Tax/AR/AP/COGS/Expense Posting Contract). Phase 11 is closeout-only — no new migrations applied (Production DB tip remains `20260821000000`, same as Phase 5/6/7/8/9/10). All finance schema (foundation `20260713190000` orders/payments + `20260713191000` seed_foundation_data + `20260725110000` D3 corrective payments/deposits + `20260729010000` branch_payment_methods + `20260730210000` pos_z_report_events + `20260730260000` finance_core + `20260731010000` finance_account_mappings + `20260731020000` cash_reconciliations + `20260731030000` expense_claims + `20260731040000` finance_posting_and_ap_idempotency + `20260730270000` supplier_invoices_payments + `20260731180000` rc4_inventory_recipes_cogs + `20260731190000` rc4_finance_phase2_foundation + `20260731200000`/`20260731210000` rc4_payroll_calculation_foundation + `20260814180100`/`20260815000000` adr_011_accounting_immutability + FU-1 fix + `20260817000000` adr_008_009_010_delivery_rider COD + `20260819000000` adr_012_domain_event_audit) was already verified during prior phases' migration runs; `scripts/phase_11_verify.py` provides finance-focused re-verification (70+ checks across 10 categories) as a future artifact. Phase 10 (v2.5.0) previously closed: ADR-033/034/035 accepted, closeout-only. Phase 9 (v2.4.0) previously closed: ADR-030/031/032 accepted. Phase 8 (v2.3.0) previously closed: ADR-027/028/029 accepted. Phase 7 (v2.2.0) previously closed: ADR-023/024/025/026 accepted. Phase 6 (v2.1.0) previously closed: ADR-019/020/021/022 accepted. Phase 5 (v2.0.0) previously closed: ADR-018 accepted. Phase 3 (v1.10.0 ADR-016/017 OTP) merged earlier as PR #231 — squash `2967a1c`. Repository main now `8369cbf` (Phase 10 closeout) → Phase 11 closeout pending PR merge; Production migration tip `20260821000000` (no new migrations in Phase 11 — closeout only); 1096 backend tests passing (unchanged from v2.5.0 — closeout-only release); prior `v2.5.0` @ `8369cbf…` unchanged

---

## Purpose

This document records the current verified status of the Telepizza ROS repository.

Repository status is determined by repository evidence, acceptance verification, and release records.

Planning documents do not determine repository status.

---

## Status Principles

Repository status must always distinguish between:

- Planned
- Approved
- Implemented
- Verified
- Released

These states must never be treated as equivalent.

Repository tip, released tag commit, Production website tip, Production API tip, and migration tip must also be labeled separately when they differ.

---

## Release and tip anchors

| Concept | Canonical value | Notes |
| --- | --- | --- |
| Repository main (current tip) | `2701a31` (Phase 8 closeout — PR #235) | ADR-027..029 (Kitchen Dashboard); Phase 9 closeout (ADR-030..032) pending v2.4.0 tag |
| Latest released baseline | `v2.4.0` @ (pending tag — Phase 9 closeout) | **Phase 9 COMPLETE** — ADR-030/031/032 accepted; Rider and Delivery App surface Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7/8 baseline `20260821000000`) |
| Prior released baseline | `v2.3.0` @ `2139910...` | **Phase 8 COMPLETE** — ADR-027/028/029 accepted; Kitchen Dashboard surface Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7 baseline `20260821000000`) |
| Prior released baseline | `v1.9.0` @ `3142e80e4618346d...` | **Phase 2 COMPLETE** — ADR-001 through ADR-015 all accepted; 10 Phase 2 migrations applied to Production; 1004 backend tests passing |
| Prior released baseline | `v1.8.0` @ `7388e07ed699cffeae62de1c3449e7228d9ceef4` | ADR-007 Delivery State Machine + ADR-011 Accounting Immutability foundations; annotated tag + GitHub Release published; **Production deployed** (DB + API + website + FU-1 fix) |
| Prior released baseline | `v1.6.0` @ `f3fce1138def9822c0b3cb22b0c8b8b4424551d6` | Phase 2 configuration control plane + identity onboarding foundation; annotated tag; GitHub Release published |
| Prior released baseline | `v1.5.1` @ `bfe60cc6a3074e08e61f85b458b19e724325eba4` | Phase 1.1 professional readiness; tag object `6b86be34…` |
| Prior released tag | `v1.5.0` @ `830dbc8b5916cc0a724a0d7489a0e34387a26f78` | RC6 Phase 1 final closeout |
| Prior released tag | `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | RC5 final closeout |
| Prior released tag | `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` | RC4 release closeout |
| RC4 status | Certified + security-closeout complete + release complete | See `docs/releases/RC4_RELEASE_NOTES.md` |
| Production website commit | `9fc446fe9ecdd11e2f296f7b4158c6ecbad45d54` (pending Vercel auto-deploy) | Vercel auto-deploys on PR #228 merge; URL `https://telepizza-website.vercel.app` |
| Prior Production website (rollback) | `bfe60cc…` / `dpl_FgHubLsuWo5ahYri18mjayCCw9nu` | Phase 1.1 baseline; superseded by v1.8.0 deploy |
| Production API (observed tip) | `9fc446fe9ecdd11e2f296f7b4158c6ecbad45d54` (pending Render auto-deploy) | Render `srv-d9bdnprtqb8s73cda6t0`; URL `https://telepizza-api.onrender.com`; `/healthz` + `/readyz` HTTP 200 verified on prior deploy |
| Production database | Migrations through `20260821000000` | All Phase 2 + Phase 3 migrations applied via Supabase Management API; Phase 5 objects verified live (orders, order_status_logs, deliveries, RLS, functions, permissions — 63/63 checks PASS); Phase 6 objects verified live (RBAC, menu, deals/loyalty, reports, settings, audit — 95/95 checks PASS); Phase 7 POS surface verified live via `scripts/phase_7_verify.py` (105+ checks; closeout-only — no new migrations; reuses Phase 5/6 baseline); Phase 8 Kitchen surface verified live via `scripts/phase_8_verify.py` (70+ checks; closeout-only — no new migrations; reuses Phase 5/6/7 baseline) |
| Phase 2.1-2.4 + IDENTITY-01 gate | **DEPLOYED to Production** — `v1.6.0` tagged | PRs #205, #206, #207, #208, #209 |
| Phase 2.4/2.5 foundation gate (ADR-007 + ADR-011) | **DEPLOYED to Production** — `v1.8.0` tagged; migrations applied; API + website live; FU-1 fix applied | PR #212 (squash `7388e07`); FU-1 fix PR #216 (squash `1e3832e`); Production deploy 2026-08-14 + 2026-08-15 |
| Phase 2.2 WhatsApp Foundation (ADR-003 + ADR-004) | **DEPLOYED to Production** — `v1.9.0` tagged | PRs #218, #219, #220, #221, #222 (squashes `81b51aa`, `f1be000`, `0fac4b9`, `0a447c4`, `f0dcdf8`); Production migration applied + verified 2026-08-15 |
| Phase 2.3 CRM (ADR-005 + ADR-006) | **DEPLOYED to Production** — `v1.9.0` tagged | PR #225 (squash `59bf158`); Production migration applied + verified 2026-08-15 |
| Phase 2.4 Delivery & Rider Completion (ADR-008 + ADR-009 + ADR-010) | **DEPLOYED to Production** — `v1.9.0` tagged | PR #224 (squash `2eaaa9b`); Production migration applied + verified 2026-08-15 |
| Phase 2.5 Domain Event Audit (ADR-012) | **DEPLOYED to Production** — `v1.9.0` tagged | PR #226 (squash `9af1d31`); Production migration applied + verified 2026-08-15 |
| Phase 2.6 AI Governance (ADR-013 + ADR-014 + ADR-015) | **DEPLOYED to Production** — `v1.9.0` tagged | PR #227 (squash `a710def`); Production migration applied + verified 2026-08-15 |
| Phase 2.1 ADR docs completion (ADR-001 + ADR-002) | **MERGED** — `v1.9.0` tagged | PR #228 (squash `9fc446f`); docs-only (migrations already applied in `v1.6.0`) |
| Phase 3 OTP (ADR-016 + ADR-017) | **MERGED** — pending `v2.0.0` tag | PR #231 (squash `2967a1c`); 4 new tables + 8 functions + 2 permissions; +92 backend tests; Production migration applied 2026-08-15 |
| Phase 5 Order Lifecycle (ADR-018) | **CLOSED** — `v2.0.0` tagged | Architecture frozen (Sprint 4.4) + implemented (Sprint 4.5/4.6 — PRs #53, #55, #57, #85) + Production-verified 63/63 PASS; ADR-018 authored + Accepted v1.0 |
| Phase 6 Admin & ERP Core (ADR-019/020/021/022) | **CLOSED** — `v2.1.0` tagged | RBAC + Menu Catalog + Deals/Coupons/Loyalty + Reports & Analytics formally accepted as ADRs; Production-verified 95/95 PASS; closeout-only (no new migrations) |
| Phase 7 POS System (ADR-023/024/025/026) | **CLOSED** — `v2.2.0` tagged | POS Cashier Workflow + Dine-in Bill Settlement + POS Shifts/Z-Report/Cash Reconciliation + Branch Sync/Offline-Safe formally accepted as ADRs; Production-verified (closeout-only — no new migrations; reuses Phase 5/6 baseline `20260821000000`) |
| Phase 9 Rider and Delivery App (ADR-030/031/032) | **CLOSED** — pending `v2.4.0` tag | Rider Identity/Dispatch/Assignment Contract + Delivery Lifecycle/Pickup/POD Surface + Rider Location/Navigation/Performance Contract formally accepted as ADRs; Production-verified (closeout-only — no new migrations; reuses Phase 5/6/7/8 baseline `20260821000000`) |

## Current Repository Status

| Area | Status |
|------|--------|
| Repository Governance | Active |
| Architecture | **Approved (Phase 8 COMPLETE — ADR-001 through ADR-029 all Accepted v1.0)** |
| Requirements | Active |
| Documentation | Active |
| Repository Evidence | Current |
| Acceptance Process | Active |
| Release Policy | Active |
| RC4 | Released (`v1.3.0`) |
| RC5 | **Released** (`v1.4.0`; certified + Production website verified) |
| RC6 Phase 1 | **Released** (`v1.5.0`) | PASS WITH LIMITATIONS — see `rc6-phase1-closeout/` |
| Phase 1.1 Professional readiness | **Released** (`v1.5.1`) | `phase1-1-production-closeout/` |
| Phase 2.1 Configuration Schema | **Released** (`v1.6.0` + ADR docs in `v1.9.0`) | PR #205 — `24f2058`; ADR-001 docs in PR #228 — `9fc446f` |
| Phase 2.2 Settings Persistence | **Released** (`v1.6.0` + ADR docs in `v1.9.0`) | PR #206 — `9da2fd5`; ADR-002 docs in PR #228 — `9fc446f` |
| Phase 2.3 Versioning/Activation/Rollback | **Released** (`v1.6.0`) | PR #207 — `095c541` |
| IDENTITY-01 Tenant Onboarding | **Released** (`v1.6.0`) | PR #208 — `237cc5b` |
| Phase 2.4 Branch Readiness Control Plane | **Released** (`v1.6.0`) | PR #209 — `f3fce11` |
| Phase 2.2 WhatsApp Foundation (ADR-003 + ADR-004) | **Released** (`v1.9.0`) — Production migration applied | PRs #218–#222; ADR-003, ADR-004 Accepted v1.0 |
| Phase 2.3 CRM Customer Master (ADR-005 + ADR-006) | **Released** (`v1.9.0`) — Production migration applied | PR #225; ADR-005, ADR-006 Accepted v1.0 |
| Phase 2.4 Delivery & Rider Completion (ADR-008 + ADR-009 + ADR-010) | **Released** (`v1.9.0`) — Production migration applied | PR #224; ADR-008, ADR-009, ADR-010 Accepted v1.0 |
| Phase 2.5 Accounting Depth (ADR-012) | **Released** (`v1.9.0`) — Production migration applied | PR #226; ADR-012 Accepted v1.0 |
| Phase 2.6 AI Command Center (ADR-013 + ADR-014 + ADR-015) | **Released** (`v1.9.0`) — Production migration applied | PR #227; ADR-013, ADR-014, ADR-015 Accepted v1.0 |
| Phase 3 OTP (ADR-016 + ADR-017) | **Released** (`v2.0.0`) — Production migration applied | PR #231; ADR-016, ADR-017 Accepted v1.0 |
| Phase 5 Order Lifecycle (ADR-018) | **Released** (`v2.0.0`) — Production verified 63/63 PASS | ADR-018 Accepted v1.0; Sprint 4.4 architecture frozen + Sprint 4.5/4.6 implemented |
| Phase 6 Admin & ERP Core (ADR-019/020/021/022) | **Released** (`v2.1.0`) — Production verified 95/95 PASS | ADR-019 (RBAC), ADR-020 (Menu Catalog), ADR-021 (Deals/Coupons/Loyalty), ADR-022 (Reports & Analytics) all Accepted v1.0; closeout-only (no new migrations) |
| Phase 7 POS System (ADR-023/024/025/026) | **Released** (`v2.2.0`) — Production verified (closeout-only) | ADR-023 (Cashier Workflow), ADR-024 (Dine-in Bill Settlement), ADR-025 (POS Shifts/Z-Report/Cash Reconciliation), ADR-026 (Branch Sync/Offline-Safe) all Accepted v1.0; closeout-only (no new migrations; reuses Phase 5/6 baseline) |
| Phase 8 Kitchen Dashboard (ADR-027/028/029) | **Released** (`v2.3.0`) — Production verified (closeout-only) | ADR-027 (Kitchen Ticket Lifecycle & Queue Contract), ADR-028 (KOT Snapshot & Per-Item Status Model), ADR-029 (Kitchen Timers/Priority/Display Contract) all Accepted v1.0; closeout-only (no new migrations; reuses Phase 5/6/7 baseline) |
| Phase 9 Rider and Delivery App (ADR-030/031/032) | **Released** (`v2.4.0`) — Production verified (closeout-only) | ADR-030 (Rider Identity/Dispatch/Assignment Contract), ADR-031 (Delivery Lifecycle/Pickup/POD Surface), ADR-032 (Rider Location/Navigation/Performance Contract) all Accepted v1.0; closeout-only (no new migrations; reuses Phase 5/6/7/8 baseline) |

---

## Current Delivery

| Item | Status |
|------|--------|
| Current Delivery Slice | **v2.2.0 Phase 7 COMPLETE** — POS System (ADR-023/024/025/026) formally accepted; Production verification reuses Phase 5/6 baseline (closeout-only — no new migrations); 1096 backend tests passing |
| Phase 1.1 | **PASSED** / Production certified / `v1.5.1` |
| Phase 2.1 Configuration Schema + ADR docs | **MERGED** (`v1.6.0` migrations + `v1.9.0` ADR docs) — PRs #205, #228 |
| Phase 2.2 Settings Persistence + ADR docs | **MERGED** (`v1.6.0` migrations + `v1.9.0` ADR docs) — PRs #206, #228 |
| Phase 2.3 Versioning/Activation/Rollback | **MERGED** (`v1.6.0`) — PR #207 — `095c541` |
| IDENTITY-01 Tenant Onboarding | **MERGED** (`v1.6.0`) — PR #208 — `237cc5b` |
| Phase 2.4 Branch Readiness Control Plane | **MERGED** (`v1.6.0`) — PR #209 — `f3fce11` |
| Phase 2.2 WhatsApp Foundation (ADR-003/004) | **MERGED** (`v1.9.0`) — PRs #218, #219, #220, #221, #222 |
| Phase 2.3 CRM (ADR-005/006) | **MERGED** (`v1.9.0`) — PR #225 — `59bf158` |
| Phase 2.4 Delivery & Rider (ADR-008/009/010) | **MERGED** (`v1.9.0`) — PR #224 — `2eaaa9b` |
| Phase 2.5 Audit (ADR-012) | **MERGED** (`v1.9.0`) — PR #226 — `9af1d31` |
| Phase 2.6 AI Governance (ADR-013/014/015) | **MERGED** (`v1.9.0`) — PR #227 — `a710def` |
| Phase 3 OTP (ADR-016/017) | **MERGED** — pending `v2.0.0` tag — PR #231 — `2967a1c` |
| Phase 5 Order Lifecycle (ADR-018) | **CLOSED** — `v2.0.0` tagged — Sprint 4.4 architecture frozen + Sprint 4.5/4.6 implemented + Production-verified 63/63 PASS |
| Phase 6 Admin & ERP Core (ADR-019/020/021/022) | **CLOSED** — `v2.1.0` tagged — ADR-019 (RBAC) + ADR-020 (Menu Catalog) + ADR-021 (Deals/Coupons/Loyalty) + ADR-022 (Reports & Analytics) authored + Accepted v1.0; Production-verified 95/95 PASS |
| Phase 7 POS System (ADR-023/024/025/026) | **CLOSED** — pending `v2.2.0` tag — ADR-023 (Cashier Workflow) + ADR-024 (Dine-in Bill Settlement) + ADR-025 (POS Shifts/Z-Report/Cash Reconciliation) + ADR-026 (Branch Sync/Offline-Safe) authored + Accepted v1.0; closeout-only (no new migrations) |
| Planning | `docs/testing/acceptance-evidence/phase2-readiness-audit/PHASE2_SCOPE_MATRIX.md` |
| Production website smoke | **Complete** — `docs/testing/acceptance-evidence/rc6-production-cutover/` (re-verified on `830dbc8…`); v1.9.0 awaiting Vercel auto-deploy of `9fc446f` |
| RC6 Phase 1 release blockers | **None** — annotated `v1.5.0` created |
| Released baseline | `v1.9.0` @ `9fc446f…`; prior `v1.8.0` @ `7388e07…`; `v1.6.0` @ `f3fce11…`; `v1.5.1` @ `bfe60cc…`; `v1.5.0` @ `830dbc8…` |
| Anchor honesty | `docs/testing/acceptance-evidence/rc6-v1.5.0-anchor-sync/` |
| Northern Bypass | `coming-soon` (unchanged) |
| Royal Orchard target opening | **14 August 2026** — software readiness ≠ restaurant Production-ready |

Owner-facing summary remains in [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

Admin ERP core modules remain LIVE on `main` with documented gaps (tables below). RC5 is **released** as annotated `v1.4.0`. Finance truth for RC6 planning is **PARTIAL_LIVE** (see `docs/planning/RC6_CAPABILITY_TRUTH.md`). Admin capability-label honesty is **merged** as RC6-UI-01. Command Center depth: DASH-00…02 merged; **RC6-DASH-03** daily command modes (repo; not Prod-verified).

---

## Follow-ups (post-v1.9.0 release)

| ID | Severity | Title | Status | Notes |
| --- | --- | --- | --- | --- |
| FU-1 (v1.8.0) | P2 | ADR-011 `app.bypass_immutability` hook returns `new` (NULL) for DELETE, silently cancelling the DELETE instead of allowing it | **Fixed in Production** — PR #216 (squash `1e3832e`) merged + deployed 2026-08-15 | `enforce_journal_entry_immutability()` line 47: `if v_bypass = 'on' then return new; end if;` — for BEFORE DELETE, `NEW` is NULL, which cancels the operation per PL/pgSQL semantics. Sibling function `enforce_journal_entry_line_immutability()` correctly returns `old` for DELETE-with-bypass. **Fix (migration `20260815000000`):** mirror the line-level function's pattern — `if (TG_OP = 'DELETE') then return old; end if; return new;` inside the bypass branch. +15 regression tests added. Production-verified with 6 functional tests (DELETE/UPDATE × bypass on/off). Issue #215 closed. |
| FU-2 (v1.9.0) | P2 | Phase 2.2 WhatsApp Foundation — frontend honest-gap flipped to live | **Merged** — PR #221 (squash `0a447c4`) | Frontend now shows live conversations, working composer, live KPIs. |
| FU-3 (v1.9.0) | P3 | Phase 2.2 WhatsApp Foundation — Render env var flip to `TELEPIZZA_WHATSAPP_MODE=mock` | **Pending user action** | Code is shipped; needs operator to set env var on Render dashboard. |
| FU-4 (v1.9.0) | P3 | Phase 2.4 COD reconciliation — chart_of_accounts GL setup per branch | **Pending user action** | Each branch needs `account_code='CASH'` (ASSET) and `account_code='ACCOUNTS_RECEIVABLE'` (ASSET) rows for `post_cod_collection_journal()` to produce GL postings. |
| FU-5 (v1.9.0) | P3 | Phase 2.4 POD — Supabase Storage bucket `delivery-pod` setup | **Pending user action** | Configure bucket on Supabase dashboard: write for authenticated riders; read for branch staff + the order's customer. |
| FU-6 (v1.9.0) | P3 | Phase 2.3 CRM — Frontend customer search + merge UI | **Future PR** | Backend admin routes shipped; frontend wiring is a separate PR. |
| FU-7 (v1.10.0) | P2 | Phase 3 OTP — `OTP_HMAC_SECRET` env var on Render | **Pending user action** | Required for OTP to function. Set 32+ byte random string on Render dashboard. |
| FU-8 (v1.10.0) | P3 | Phase 3 OTP — Dedicated OTP WhatsApp number provisioning | **Pending ops** | Provision a "Telepizza Login" number; never use 0304-1110495 for OTP (D11). |
| FU-9 (v2.0.0) | P3 | Phase 5 closeout — Phase 5 v2.0.0 GitHub Release publish | **Done** | Tag v2.0.0 + GitHub Release published 2026-08-15. |
| FU-10 (v2.1.0) | P3 | Phase 6 closeout — Phase 6 v2.1.0 GitHub Release publish | **Done** | Tag v2.1.0 + GitHub Release published 2026-08-16. |
| FU-11 (v2.2.0) | P3 | Phase 7 POS — `finance_account_mappings` rows per branch for POS purposes | **Pending user action** | Each branch needs mappings for `cash_on_hand`, `cash_over_short`, `sales_revenue`, `sales_discounts`, `output_tax`. Without these, cash reconciliation cannot post to the GL. Distinct from FU-4 (chart_of_accounts rows) — FU-11 maps those accounts to POS purposes. |
| FU-12 (v2.2.0) | P3 | Phase 7 closeout — Phase 7 v2.2.0 GitHub Release publish | **Done** | Tag v2.2.0 + GitHub Release published 2026-08-16. |
| FU-13 (v2.3.0) | P3 | Phase 8 Kitchen — `menu_item_inventory_components` rows per branch for atomic stock consume | **Pending user action** | Each menu item (e.g., "Margherita Pizza") that should consume inventory on preparation needs a row mapping `menu_item_id` to each `inventory_item_id` (e.g., pizza dough, mozzarella, tomato sauce) with `quantity_per_unit` consumed per menu item. Without these rows, `kitchen_ticket_set_preparing_atomic` RPC will execute successfully but will not deduct any stock — the kitchen ticket will still transition to `preparing` correctly, but inventory levels will not decrement. This is a per-branch data configuration task coordinated with the head chef and store manager. |
| FU-14 (v2.3.0) | P3 | Phase 8 closeout — Phase 8 v2.3.0 GitHub Release publish | **Pending** | Tag v2.3.0 + publish GitHub Release after PR merge. |

### Merged delivery through PR #133 (2026-07-30)

| PR | Delivery | Merge |
| --- | --- | --- |
| [#121](https://github.com/mianimr4n/telepizza/pull/121) | AI platform foundation tables and APIs | `a8a631a` |
| [#122](https://github.com/mianimr4n/telepizza/pull/122) | HR employee directory backend and API | `0c1003a` |
| [#123](https://github.com/mianimr4n/telepizza/pull/123) | Governance docs sync through PR #120 | `8bb9ea0` |
| [#124](https://github.com/mianimr4n/telepizza/pull/124) | Owner Executive Dashboard with honest live UI | `6081621` |
| [#125](https://github.com/mianimr4n/telepizza/pull/125) | Inventory backend with stock ledger and APIs | `a6947ce` |
| [#126](https://github.com/mianimr4n/telepizza/pull/126) | Supplier master and purchase order APIs | `4476c2e` |
| [#127](https://github.com/mianimr4n/telepizza/pull/127) | Inventory/purchasing upgrade and connection | `70b78c8` |
| [#128](https://github.com/mianimr4n/telepizza/pull/128) | Requisitions + GRN headers (tables, APIs, UI) | `66793ab` |
| [#129](https://github.com/mianimr4n/telepizza/pull/129) | Menu write APIs (prices, availability, categories) | `6a4e3ba` |
| [#130](https://github.com/mianimr4n/telepizza/pull/130) | Branch settings write APIs (hours, radius, fees) | `f96c7a1` |
| [#131](https://github.com/mianimr4n/telepizza/pull/131) | Sales analytics API + CSV export | `3acbc80` |
| [#132](https://github.com/mianimr4n/telepizza/pull/132) | POS Z-Report + dashboard low-stock alerts | `826f27f` |
| [#133](https://github.com/mianimr4n/telepizza/pull/133) | Procurement approval loop (PO approve/reject) | `e5c3910` |

Prior baseline still released: Opening Operations M1–M4 ([PR #113](https://github.com/mianimr4n/telepizza/pull/113)), CI gate ([PR #114](https://github.com/mianimr4n/telepizza/pull/114)), Admin ERP zero-fake-data audit ([PR #115](https://github.com/mianimr4n/telepizza/pull/115)), staff-assignment/settings fixes ([PR #116–#118](https://github.com/mianimr4n/telepizza/pull/118)), organization/branch/menu/delivery settings APIs ([PR #119](https://github.com/mianimr4n/telepizza/pull/119)–[#120](https://github.com/mianimr4n/telepizza/pull/120)).

### Admin ERP core — LIVE with documented gaps

| Module | Live capability | Documented gap / Coming Soon |
| --- | --- | --- |
| Owner Executive Dashboard | Live order KPIs + low-stock count | Acceptance remains PASS WITH LIMITATIONS from D1 |
| Inventory | Items, stock ledger, adjustments | Adjustment atomicity residual; GRN→stock posting exists in **repository** (atomic RPC) — **not** Production-verified |
| Purchasing | Suppliers, POs, requisitions, GRN (+ atomic stock post in repo), PO approve/reject | Invoice matching / payables depth; GRN stock post **Prod-unverified** |
| Menu | Write APIs for prices, availability, categories | — |
| Settings | Org/branch/delivery writes; hours/radius/fees | — |
| Finance | CoA / journals / TB / P&L / cash / AP (repo) | **PARTIAL_LIVE** — BS/CF/AR/Tax UI honesty → RC6-FIN-01 / RC6-UI-01 |
| Reports | Sales analytics + CSV export | — |
| POS | Cash checkout + Z-Report shift close | No starting float / counted cash variance |
| HR | Employee directory + deactivate API in repo | Broader update lifecycle / Prod verification incomplete; UI Phase-2 banners → RC6-UI-01 |
| AI platform | Foundation tables/APIs | No runtime execution / agent loop |

### Known risks (audit — do not overstate as complete)

1. **Inventory adjustment atomicity** — stock mutations may not be fully transactional across ledger + on-hand update paths; race/partial-write risk under concurrent adjust.
2. **GRN→stock posting** — repository implements `create_goods_receiving_with_stock_atomic` (tests present). **Not** claimed Production-verified. Residual: invoice matching / payables depth.
3. **Z-Report lacks float / counted cash** — expected drawer cash equals paid cash sales for the Asia/Karachi business day only; no opening float, counted cash, or variance capture.
4. **HR deactivate** — `POST /hr/employees/:id/deactivate` exists in repository. Do **not** claim full HR lifecycle or Production verification. Misleading HR Phase-2 banners → RC6-UI-01.
5. **AI foundation exists without runtime execution** — platform tables and APIs are present; no production agent runtime or autonomous execution path.

### Opening Operations (M1–M4) — verified baseline

| Milestone | Scope | Decision |
| --- | --- | --- |
| M1 | Branch staff, floors/tables, booking policy | COMPLETE |
| M2 | Payments, notifications, device verification | COMPLETE |
| M3 | SOPs, training, rehearsals, Founder GO/NO-GO, Owner handover | `OPENING_OPERATIONS_MILESTONE_3_COMPLETE` |
| M4 | Staff seeding + encrypted handover, live config, dry-run evidence | `OPENING_OPERATIONS_MILESTONE_4_COMPLETE` |

Honest non-claims from M4 evidence: no Production staff apply, no real customer notifications, no real card transactions, no Northern Bypass activation, no automatic branch status change.

### Executive Dashboard v1 (released baseline)

Executive Dashboard v1 remains **Released** to production as of merge commit `f685599` (2026-07-24). Acceptance remains **PASS WITH LIMITATIONS**. Subsequent PRs (#124, #132) extended Owner dashboard honesty (live APIs, low-stock) on the same governance contract — zero invented metrics.

### Production verification evidence (D1 post-deploy)

- Website Production deploy: success (`f685599`) → `https://telepizza-website.vercel.app`
- API Production deploy: success (`f685599`) → Render `telepizza-api` (`/healthz` 200)
- Production bundle markers confirmed: Active Orders, Kitchen Queue, Average Order Value, Active Deliveries, Mianx.ai Operations Insights, Loading insights, D1 operations grid copy
- `/admin/login` returns HTTP 200
- Authenticated live KPI browser session was not re-run in this post-deploy pass (gate remains login-protected)

### Accepted verification limitations (D1)

- Customer-session RBAC browser proof was unavailable (no local customer fixture).
- Live API error state was not induced during AV1 (code now prefers KPI `error` over stale payload; production induction still pending).
- Planned/disabled module cards are represented in Admin shell navigation rather than the D1 operations grid.

### Production migrations

**Current Production migration tip (RC4 cutover evidence):** `20260801180000`.

Historical note — ERP-wave alignment **2026-07-30** via `npx supabase migration list --linked` (superseded tip; retained as audit trail of that pass):

| Result | Detail |
| --- | --- |
| Pre-push gap | Local-only: `20260730193000` (reports.read), `20260730210000` (pos_z_report_events) |
| Action | `npx supabase db push --linked` applied both migrations to production |
| Post-push (that day) | Local and Remote aligned through `20260730210000` — **0 local-only**, **0 remote-only** |
| Later Production tip | Advanced through RC4 cutover to `20260801180000` (do not treat `20260730210000` as current) |

Key post-#120 migrations (ERP wave) — all present on Local and Remote after push:

| Version | File | Introduced by | Production |
| --- | --- | --- | --- |
| `20260730120000` | `ai_platform_foundation.sql` | PR #121 | Applied |
| `20260730130000` | `hr_workforce_backend.sql` | PR #122 | Applied |
| `20260730160000` | `inventory_backend.sql` | PR #125 | Applied |
| `20260730170000` | `purchasing_backend.sql` | PR #126/#127 | Applied |
| `20260730180000` | `fix_purchasing_missing_tables.sql` | PR #128 | Applied |
| `20260730190000` | `complete_procurement_loop.sql` | PR #133 | Applied |
| `20260730193000` | `reports_read_permission.sql` | PR #131 | Applied (this pass) |
| `20260730210000` | `pos_z_report_events.sql` | PR #132 | Applied (this pass) |

---

## Status Definitions

### Planned

Work has been identified but has not been authorized for implementation.

### Approved

Architecture or requirements have been approved.

Implementation may begin.

### Implemented

Repository evidence demonstrates implementation.

Acceptance may still be pending.

### Verified

Acceptance verification has completed successfully.

Known limitations remain documented where applicable.

### Released

Verified implementation has completed the release process.

---

## Repository Truth

Repository status is based on:

- Source code
- Tests
- Acceptance reports
- Repository evidence
- Release records

Repository status must never be derived from:

- Planning documents
- Roadmaps
- Mockups
- Discussions
- Assumptions

---

## Review

This document should be updated whenever:

- a delivery reaches a new lifecycle stage;
- acceptance status changes;
- release status changes;
- repository governance changes.

---

## Related Documents

- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- [GOVERNANCE.md](./GOVERNANCE.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [DECISION_LOG.md](./DECISION_LOG.md)

---

## Summary

Repository Status provides an honest view of the current verified state of the repository.

**Phase 7 is COMPLETE as of `v2.2.0` (2026-08-16).** POS System formally accepted as ADR-023 (Cashier Workflow & Order Source Contract), ADR-024 (Dine-in Bill Settlement & Multi-tender Payments), ADR-025 (POS Shifts, Z-Report & Cash Reconciliation), and ADR-026 (Branch Sync & Offline-Safe POS Contract). All 26 ADRs (ADR-001 through ADR-026) are Accepted v1.0 with standalone ADR files under `docs/13-adr/`. Phase 7 is a closeout-only release — no new migrations applied (Production DB tip remains `20260821000000`, same as Phase 5/6). All POS-related schema was already verified during Phase 6's 95/95 PASS run; `scripts/phase_7_verify.py` provides POS-focused re-verification (105+ checks across 10 categories) as a future artifact. Backend tests: **1096 passing** (unchanged from v2.1.0 — no new code, only ADRs + verification script). Phase 8 (Kitchen Dashboard) is now UNLOCKED.

Phase 6 (v2.1.0) previously closed: ADR-019 (RBAC), ADR-020 (Menu Catalog), ADR-021 (Deals/Coupons/Loyalty), ADR-022 (Reports & Analytics) — Production verified 95/95 PASS.

Phase 5 (v2.0.0) previously closed: ADR-018 (Order Lifecycle) — Production verified 63/63 PASS.

Phase 3 (OTP) was merged as PR #231 (squash `2967a1c`) — adds 4 new tables, 8 functions, 2 permissions, and 7 new auth endpoints. Tagged together with Phase 5 in `v2.0.0`.

Prior baselines remain released: `v1.9.0` @ `3142e80…` (Phase 2 complete — ADR-001 through ADR-015), `v1.8.0` @ `7388e07…` (ADR-007 + ADR-011 foundations + FU-1 fix), `v1.6.0` @ `f3fce11…` (Phase 2.1 configuration control plane + identity onboarding), `v1.5.1` @ `bfe60cc…` (Phase 1.1 professional readiness), `v1.5.0` @ `830dbc8…` (RC6 Phase 1 closeout).

Pending operator actions (no code blockers): set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1` on Render (FU-3); set `OTP_HMAC_SECRET` on Render (FU-7); configure Supabase Storage bucket `delivery-pod` (FU-5); configure `chart_of_accounts` rows for COD reconciliation per branch (FU-4); provision dedicated OTP WhatsApp number (FU-8); configure `finance_account_mappings` rows per branch for POS purposes (FU-11 — needed for cash reconciliation GL posting); seed `menu_item_inventory_components` rows per branch for kitchen atomic stock consume (FU-13 — needed for inventory deduction on kitchen preparing transition).
