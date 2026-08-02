# RC6 Baseline

**Status:** Living baseline — honesty wave + DASH-00 merged; **RC6-DASH-01** Exception Center next/runtime
**Date:** 2026-08-02
**Authority:** Repository evidence after annotated tag `v1.4.0`, RC5 certification, and RC6 honesty/contracts slices

> Planning documents do **not** determine repository status. This baseline records verified anchors for RC6 discovery only.

---

## Canonical instruction hierarchy

```text
README.md
 ↓
AGENTS.md
 ↓
docs/README.md
 ↓
docs/00-governance/
 ↓
Architecture / ADRs
 ↓
Requirements
 ↓
Repository Evidence
 ↓
Acceptance Gates
 ↓
Verified Delivery
```

No planning document, roadmap, or UI label overrides repository evidence.

---

## Anchors (do not conflate)

| Anchor | Value | Notes |
| --- | --- | --- |
| Released baseline tag | `v1.4.0` (annotated) | Message: RC5 certified closeout |
| Tag target / certified closeout commit | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | = merge of PR #175 |
| Current repository main (DASH-04 baseline) | `08ca0e413d8863f835cf21aa0c14736b61f39dc1` | Post–PR #184 (RC6-DASH-03) merge |
| Post–DASH-02 tip (historical) | `80cd2c4f6d554c805d4e72973c83311242c5a242` | Superseded by DASH-03 |
| Post–PR #176 planning tip (historical) | `25960eb2b69d2c390fe0ce364458c9cb3feeac0c` | Superseded by honesty/CI/a11y/contracts merges |
| `v1.4.0` tag peel | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | Distinct from current tip when docs advance |
| Production website runtime SHA | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | Evidenced cutover; **docs-only delta** after this SHA to tip |
| Production website Vercel deployment | `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` | Rollback target `dpl_FriiC2Ps…` not executed |
| Production API SHA (observed at RC5 cutover) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | `/healthz`/`/readyz`; **not** intentionally redeployed by RC5 website cutover |
| Production migration tip | `20260801180000` | Latest local migration on main matches tip |
| GitHub Release object for `v1.4.0` | **Does not exist** | Tag-only SemVer (same convention as `v1.3.0`) |
| Prior released tag | `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` | Unchanged |

### Separation rules

1. Repository tip ≠ Production website runtime (tip includes certification docs after runtime SHA).
2. Production website deploy ≠ Production API deploy.
3. Migration tip is independent of application SHAs.
4. Tag `v1.4.0` ≠ GitHub Release UI object.
5. RC5 planning language is historical; RC6 truth starts from this baseline.

---

## RC5 completion (repository)

| Slice | PR | Merge SHA | Acceptance |
| --- | --- | --- | --- |
| RC5-OPS-01 | #168 | `e5963a659a961d8e856ddc9eb5e6a9addf807d4d` | PASS |
| RC5-A11Y-01 | #169 | `c1859117b24d6adbe2fb0633ea518538047cc120` | PASS |
| RC5-DOC-01 | #170 | `cb13f39170f6e3cb2b49938b073aff7fac39d83c` | PASS |
| RC5-TEST-01 | #171 | `11aa195361364d1e48b3f1f589acbb9ca8bd173f` | PASS |
| RC5-PERF-01 | #172 | `fb7737c76f8a9127456ce7149d23620cec6e1d58` | PASS |
| RC5-OBS-01 | #173 | `795efeeba4d2eb776e0853742479ea13d9645956` | PASS |
| RC5-QA-01 | #174 | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | PASS WITH DOCUMENTED LIMITATION |
| RC5 final closeout | #175 | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | Docs/evidence only |
| Production website cutover | — | Live `152ce40…` / `dpl_7xaV34uy…` | PASS |

Evidence: `docs/testing/acceptance-evidence/rc5-*/`, `rc5-production-cutover/`, `rc5-final-closeout/`.

**RC5 status:** CERTIFIED, PRODUCTION-VERIFIED (website smoke + Owner attestation), RELEASED as `v1.4.0`.

---

## Residual limitations carried into RC6

From `docs/testing/acceptance-evidence/rc5-final-closeout/RESIDUAL_LIMITATIONS.md` (non-blocking unless Founder redesignates):

| Residual | Status |
| --- | --- |
| Production alerts | `PROPOSED_NOT_ENABLED` |
| Bulk log export | `NOT_CLAIMED` |
| APM / paging | NOT IMPLEMENTED |
| `/admin/reports` CI Playwright | Deferred |
| Branch protection requiring Owner Playwright | Unchanged |
| Moderate accessibility advisories | **Addressed RC6-A11Y-02**; residual cart-drawer targets / full admin cert not claimed |
| Phase 2 product depth | Deferred / Founder-gated |
| GitHub Release object | Absent (tag-only) — residual text about “proposed `v1.4.0`” is now **stale** |
| Package.json SemVer vs `v*` | TD-3 |
| Live-DB privilege CI job | Not added |
| Lighthouse / RUM / CWV | Not claimed |
| Northern Bypass go-live | Not authorized |

**Additional discovery finding (RC6):** living status docs still contain superseded claims (e.g. “GRN does not post stock”, “HR lacks deactivate”, “`v1.4.0` not created”). These are **documentation honesty gaps**, not Product absence — see `RC6_CAPABILITY_TRUTH.md`.

---

## Deferred Phase 2 / Founder-gated work (carry-forward)

| Area | Classification |
| --- | --- |
| WhatsApp provider send / conversation webhooks | Provider-dependent |
| Loyalty / marketing provider execution | Provider-dependent |
| Finance bank transfers / year-end / VAT filing depth | Founder-gated product depth |
| Payroll bank settlement / PDF payslips | Founder-gated |
| Analytics scheduled background worker | Product + ops |
| Documents virus scanning | Security ADR |
| Supabase PITR | Commercial / Founder |
| Northern Bypass operating go-live | Founder-gated |
| AI Command Center / agent runtime | Foundation only today |
| Integrations workspace | Planned placeholder |
| Support workflow module | Planned placeholder |
| Printer configuration | Planned |
| Tax settings UI depth | Partial (API foundation) |
| Security-policy / MFA admin UI | Foundation |
| Alert enablement | Ops + Founder thresholds |
| Branch-protection change | Founder GitHub admin |

---

## Database tip state

| Item | Value |
| --- | --- |
| Latest migration on main | `20260801180000_rc4_loyalty_marketing_depth.sql` |
| Production tip | `20260801180000` |
| Unapplied migrations on main | **NONE** |
| Pending Production operation | **NONE** for RC6 planning start |

---

## Open GitHub issues (discovery)

`gh issue list --state open` at discovery time: **empty**.
RC6 candidates are evidence-driven slice IDs, not linked issue numbers.

---

## Explicit non-claims

- Tip `96f1e803` is **not** a new Production website runtime cutover.
- No RC6 feature is LIVE solely because a sidebar entry exists.
- No migration, deploy, tag move, or GitHub Release is authorized by this planning pack.

## RC6 delivery status

| Item | Status |
| --- | --- |
| Planning PR #176 | **Merged** → `25960eb2…` |
| RC6-DOC-01 | **Merged** #177 |
| RC6-UI-01 | **Merged** #178 |
| RC6-QA-02 | **Merged** #179 |
| RC6-A11Y-02 | **Merged** #180 → `da99875…` |
| RC6-DASH-00 | **Merged** #181 → `cc09e239…` |
| RC6-DASH-01 | **Merged** #182 → `b913eca…` |
| RC6-DASH-02 | **Merged** #183 → `80cd2c4…` |
| RC6-DASH-03 | **Merged** #184 → `08ca0e413d8863f835cf21aa0c14736b61f39dc1` |
| Current runtime slice | **RC6-DASH-04** — Approval Inbox (repository; **not** Production-verified; DRILL_DOWN) |
| Next runtime after DASH-04 | **RC6-DASH-05** |
| Pending Production operation | **NONE** |
