# RC6-QA-03 — Production cutover readiness

**Prepare only — do not execute cutover in this certification slice.**

## Runtime impact

| Layer | Change? | Notes |
| --- | --- | --- |
| Website runtime | **YES** | OCC integration a11y `headingId` fix + Playwright suite wiring; DASH-01…08 already on `main` after PR #189 |
| Backend / API runtime | **NO** | No API contract change required for QA-03 |
| Migrations / Production SQL | **NO** | None |
| Providers / AI | **NO** | None |
| Secrets / env | **NO** | None |
| Tags / GitHub Release | **NO** | Not part of QA-03 |

## Current Production anchors (honest)

| Anchor | Value |
| --- | --- |
| Production website tip (historical) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Repository baseline (DASH-08 merge) | `9fed3b4392015db69ebdc652dd9a693811d335c8` |
| Production-verified for DASH-01…08 / QA-03 | **No** — cutover pending |

## Pre-cutover checklist (when Founder authorizes)

1. Merge certification branch changes (heading fix + tests/evidence) to `main` if not already.
2. Confirm CI green on the authorized website SHA.
3. Deploy website only (Vercel) to authorized SHA — no Render API / Supabase migration step required for this delta.
4. Public smoke + authenticated Owner OCC smoke on Production.
5. Record Production SHA ≠ claim until smoke evidence exists.
6. Keep rollback target = prior Production deployment (currently tip `152ce40…` until superseded).

## Explicit non-actions

- Do **not** mark this pack Production-verified.
- Do **not** run Production SQL or privilege grants.
- Do **not** enable providers/AI as part of OCC cutover.
