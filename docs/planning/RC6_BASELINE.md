# RC6 Baseline

**Status:** Living baseline — RC6 Phase 1 **released** (`v1.5.0`) Owner Command Center
**Date:** 2026-08-03
**Authority:** Repository evidence after `v1.4.0`, RC6 DASH/QA slices, Production cutover, closeout #192, and annotated `v1.5.0` at `830dbc8…` / `dpl_BtPH8…` (website files identical to QA-04 tip `b14163c…`)

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

### RC6 Phase 1 released (current)

| Anchor | Value | Notes |
| --- | --- | --- |
| Released tag | `v1.5.0` (annotated) | Tag object `d52f3a4729f398143463e72e8147e4cb0ada1faa` |
| Peeled / closeout commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` | Merge of PR #192 |
| RC6 feature/runtime tip | `b14163ccbc82fca0b2856ea137bddb746ed5716b` | QA-04 #191; `apps/website` delta to `830dbc8…` is empty |
| Production website commit | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` | Active Vercel deploy commit |
| Production Vercel deployment | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` | Do **not** treat `b14163c…` as active deploy commit |
| Prior QA-04 deploy (historical) | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` @ `b14163c…` | First Owner-smoke-green Production |
| Production migration tip | `20260801180000` | Unchanged in RC6 Phase 1 |
| Prior released tag | `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | Unchanged |
| GitHub Release for `v1.5.0` | **Does not exist** | Tag-only SemVer |

### RC5 / early planning rows (historical — retain)

| Anchor | Value | Notes |
| --- | --- | --- |
| Released baseline tag | `v1.4.0` (annotated) | Message: RC5 certified closeout |
| Tag target / certified closeout commit | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | = merge of PR #175 |
| Current repository main (DASH-04 baseline) | `08ca0e413d8863f835cf21aa0c14736b61f39dc1` | Post–PR #184 (RC6-DASH-03) merge — **historical** |
| Post–DASH-02 tip (historical) | `80cd2c4f6d554c805d4e72973c83311242c5a242` | Superseded by DASH-03 |
| Post–PR #176 planning tip (historical) | `25960eb2b69d2c390fe0ce364458c9cb3feeac0c` | Superseded by honesty/CI/a11y/contracts merges |
| `v1.4.0` tag peel | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | Distinct from current tip when docs advance |
| Production website runtime SHA (RC5 cutover) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | Historical RC5 cutover evidence |
| Production website Vercel deployment (RC5) | `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` | Historical; superseded by RC6 cutover |
| Production API SHA (observed at RC5 cutover) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | Historical |
| Production migration tip | `20260801180000` | Latest local migration on main matches tip |
| GitHub Release object for `v1.4.0` | **Does not exist** | Tag-only SemVer (same convention as `v1.3.0`) |
| Prior released tag | `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` | Unchanged |

### Separation rules

1. Repository tip ≠ Production website runtime when docs advance after deploy.
2. Production website deploy commit ≠ RC6 feature tip when closeout is docs-only (`apps/website` may still be identical).
3. Production website deploy ≠ Production API deploy.
4. Migration tip is independent of application SHAs.
5. Tag `v1.5.0` / `v1.4.0` ≠ GitHub Release UI object.
6. RC5 planning language is historical; RC6 Phase 1 released truth starts from the current anchors table above.

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
| RC6-DASH-04 | **Merged** #185 → `1c1fecd4dbfd8a605ddd9995f34fa6470bffd6eb` |
| RC6-DASH-05 | **Merged** #186 → `64d655760fb9564ac841bff05cd797241b2a7743` |
| RC6-DASH-06 | **Merged** #187 → `19fdb0a51f00b646130ca7ec12cc09fe51532366` |
| Current runtime slice | **RC6-QA-03** — Command Center integration certification (repository; **not** Production-verified) |
| Phase 1 features | DASH-01…08 on `main` after #189 (`9fed3b4…`) |
| Next after QA-03 | Phase 1 Production cutover (prepare only until authorized) |
| Pending Production operation | **NONE** |
