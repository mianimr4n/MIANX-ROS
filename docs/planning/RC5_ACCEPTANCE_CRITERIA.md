# RC5 Acceptance Criteria

**Status:** Proposed planning document  
**Date:** 2026-08-02  
**Baseline:** `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`

> Criteria apply to **proposed** slices in `RC5_ROADMAP.md`. A slice is verified only when repository evidence demonstrates the criteria below. Planning alone is not acceptance.

## Universal gates (every RC5 implementation PR)

| # | Criterion |
| --- | --- |
| U-1 | `pnpm check` PASS |
| U-2 | `pnpm test` PASS |
| U-3 | `pnpm test:db` PASS |
| U-4 | `pnpm rc1:gate` PASS |
| U-5 | `git diff --check` PASS |
| U-6 | GitHub CI Typecheck and test SUCCESS on the PR |
| U-7 | No secrets, JWTs, passwords, dumps, or private env values in the diff |
| U-8 | Scope matches the slice “exact scope”; no silent architecture/contract expansion |
| U-9 | Production claims only with evidence; no invented LIVE status |
| U-10 | If Production mutation is involved: separate Founder authorization recorded before execute |

---

## RC5-OPS-01 — Local schema privilege contract & AGENTS truth

| # | Criterion |
| --- | --- |
| A-01 | Fresh-local privilege behavior is **documented from observation** (PASS without manual GRANT, or residual gap listed with exact failure mode) |
| A-02 | `AGENTS.md` runtime grant guidance matches repository migrations (no “never GRANT” claim if grant migrations exist and apply) |
| A-03 | Static DB tests assert presence and intent of grant/harden migrations (`20260714120000_*`, `20260718130000_*`) |
| A-04 | No Production SQL executed in the slice unless Founder-authorized follow-on is separately recorded |
| A-05 | If an additive privilege migration is proposed: it is privilege-only, reviewed, and does not reintroduce blanket unsafe anon writes beyond harden design |

---

## RC5-A11Y-01 — Public marketing home accessibility

| # | Criterion |
| --- | --- |
| B-01 | Public marketing home axe run reports **0 critical / 0 serious** (Chromium), or residual issues are explicitly listed with tickets/limitation IDs |
| B-02 | Evidenced color-contrast debt on public home is resolved or reclassified with measurement |
| B-03 | Icon-only links/buttons on public home expose accessible names |
| B-04 | Admin critical routes remain non-regressed (spot-check or existing axe evidence still valid) |
| B-05 | No Production deploy required for acceptance of the code PR (Vercel preview acceptable) |

---

## RC5-DOC-01 — Release & status documentation sync

| # | Criterion |
| --- | --- |
| C-01 | `RELEASE_HISTORY` (or successor living release doc) cites `v1.3.0` / `74b6b8e` honestly |
| C-02 | `RC5_BASELINE.md` anchors updated so starting SHA / tag status match released tip |
| C-03 | Governance status docs do not claim unimplemented features as LIVE |
| C-04 | Docs-only PR; no `apps/`, `backend/`, or `supabase/migrations` changes |

---

## RC5-TEST-01 — Analytics schema regression guards

| # | Criterion |
| --- | --- |
| D-01 | Automated tests fail if Analytics queries select non-existent `order_items.name` |
| D-02 | Automated tests assert canonical `product_name` (+ aggregation by `menu_item_id` where applicable) |
| D-03 | Existing analytics hotfix tests remain green |
| D-04 | No schema migration required |

---

## RC5-PERF-01 — Entry bundle residual *(optional)*

| # | Criterion |
| --- | --- |
| E-01 | Before/after bundle measurements recorded in evidence pack |
| E-02 | Critical routes still load (smoke or Playwright subset) |
| E-03 | No claim of Production Lighthouse/load-test certification without new evidence |
| E-04 | Entry size does not regress beyond stated budget without justification |

---

## RC5-OBS-01 — Operator log export / alerting *(optional)*

| # | Criterion |
| --- | --- |
| F-01 | Runbook documents how to obtain Render/Supabase logs **without** storing secrets in Git |
| F-02 | OPS-3 limitation updated if a durable path exists; otherwise remains honest |
| F-03 | Secret scan of the PR is clean |

---

## RC5-QA-01 — CI Playwright Owner paths *(optional)*

| # | Criterion |
| --- | --- |
| G-01 | CI job is deterministic on ephemeral/local credentials only (no Production secrets) |
| G-02 | Failure blocks or is explicitly labeled non-blocking per Founder policy |
| G-03 | Flake rate acceptable (engineering judgment + retry policy documented) |
| G-04 | Does not replace `pnpm rc1:gate` required suites |

---

## RC5 release claim (future)

An **RC5 release** (tag/certify) must **not** be claimed until:

1. Founder authorizes the RC5 delivery set  
2. Authorized slices meet their criteria with repository evidence  
3. Known limitations are updated honestly  
4. Universal gates PASS on the release tip  
5. Separate release/tag approval is granted (same discipline as `v1.3.0`)

Planning documents alone never constitute RC5 release completion.
