# RC4 Release Notes

**Status:** `RC4_CERTIFIED` (repository)  
**Date:** 2026-08-02  
**Certified main SHA:** `e40351b2793ffda6a62aec60f817eff3dd0352cf`  
**Production application SHA (live at certification):** `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291`  
**Production migration tip:** `20260801180000`  
**Recommended release tag (not created by this PR):** `v1.3.0` → originally recommended at certification tip `e40351b`

### Subsequent status (post-closeout)

- Annotated tag **`v1.3.0` was later created and pushed**.
- Tag commit: **`74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`** (RC4 closeout tip on `main`, after this notes PR).
- Repository convention: annotated git tag only.
- **No GitHub Release** was created for `v1.3.0`.

## Release convention (inspection)

| Item | Finding |
| --- | --- |
| Latest valid `v*` tag | `v1.2.0` |
| GitHub Releases | none published |
| Package versions | root private; website `1.0.0`; API `0.1.0` (not authoritative for ROS tags) |
| Workflows | `.github/workflows/ci.yml` only (no automated release workflow) |
| SemVer practice | Git `vMAJOR.MINOR.PATCH` tags (see archived `v1.2.0` notes) |
| RC4 bump recommendation | **minor** → **`v1.3.0`** (multi-module feature + ops closeout; no intentional public contract break) |
| Tag target | **`e40351b`** (certified repository tip; includes Production app tip `e5c6daf` + certification evidence) |

Do **not** invent alternate names such as `RC4` or `rc4-final` without Founder approval.

## Summary

RC4 delivers Owner-facing Analytics BI, Payroll foundation, Documents uploads, Inventory recipes/COGS readiness, Finance Phase 2 surfaces, Loyalty & Marketing depth, observability, and performance polish — cut over on Production through migration tip `20260801180000`, with post-cutover hotfixes and security closeout completed before repository certification at `e40351b`.

## Feature slices and merged PR range

RC4 product/ops merges (inclusive):

| PR | Title / slice |
| --- | --- |
| #154 | RC4-6 Observability foundation |
| #155 | RC4-5 Documents binary uploads |
| #156 | RC4-9 Inventory recipes / unit conversion / COGS-ready events |
| #157 | RC4-8 Finance Phase 2 foundation |
| #158 | RC4-3 Payroll foundation |
| #159 | RC4-2 Analytics & Business Intelligence |
| #160 | RC4-11 Loyalty & Marketing Depth |
| #161 | RC4-7 Performance and Production polish |
| #162 | Health-probe Supabase anon headers |
| #163 | Analytics canonical `order_items.product_name` hotfix |
| #165 | Password recovery flow (`/reset-password`) |
| #164 | RC4 Final Production Certification (evidence; merge SHA `e40351b`) |

Canonical evidence: `docs/testing/acceptance-evidence/rc4-final-certification/` and `docs/testing/acceptance-evidence/rc4-production-cutover/`.

## Production cutover & security

| Topic | Result |
| --- | --- |
| Migration alignment | Production tip `20260801180000` (includes loyalty/marketing depth migration) |
| Deployed password recovery | PR #165 at live SHA `e5c6daf` |
| Analytics schema hotfix | PR #163 — select/label `product_name`, aggregate by `menu_item_id` (no SQL/migration) |
| Health-probe correction | PR #162 — anon headers on readiness probe |
| Owner password rotation | Completed via recovery flow; post-rotation Owner smoke PASS |
| Supabase secret refresh / revocation | Names + timestamps only in `supabase-secrets-rotation-metadata.json`; values not in Git |
| API redeploy after secret refresh | `main - telepizza-api` success for `e5c6daf` |
| `/healthz` / `/readyz` | HTTP 200, `issues: []`, DB `ok` at `e5c6daf` |

## Final authenticated smoke (post-rotation)

Artifact: `docs/testing/acceptance-evidence/rc4-production-cutover/security-closeout-smoke.json`

| Check | Result |
| --- | --- |
| Overall | `ok: true` |
| SHA match | `e5c6daf` |
| Probe count | 11 / failed 0 |
| Schema errors (`42703` / `42P01`) | none in accepted probes |
| `order_items.name` / `due_date` / `employee_number` 42703 | false |

Modules exercised in closeout smoke include auth/me, Owner dashboard, Analytics, Finance, Payroll/HR, Inventory, Loyalty, and Documents surfaces (see artifact probes).

## Known limitations (non-blocking)

From `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md`:

- OPS-1: Free-plan Supabase — logical dumps only; no PITR
- OPS-2: Historical local grants guidance — **operator truth closed in RC5-OPS-01** (migration-managed; fresh-local PASS; CI live-DB privilege job still deferred)
- OPS-3: Render log export often unavailable without API key; smokes use authenticated API responses
- OPS-4: Some Analytics modules remain deferred/unavailable by design (honest UI)
- OPS-5: Supplier A/B RLS matrix historically had partial credential coverage

Security rotation (SEC-1) is closed: `SECURITY_CLOSEOUT_COMPLETE`.

## Rollback / reference

| Reference | Location / note |
| --- | --- |
| Rollback runbook | `docs/10-devops/RELEASE_AND_ROLLBACK_RUNBOOK.md` |
| Release policy | `docs/00-governance/RELEASE_POLICY.md` |
| Prior tag | `v1.2.0` |
| App rollback tip (Production) | Redeploy API/website from known-good commit (last certified live app: `e5c6daf`); do not invent schema reverse SQL without ADR |
| Schema tip | Production migrations through `20260801180000` — reverse only via approved ops procedure |
| Evidence packs | `rc4-final-certification/`, `rc4-production-cutover/` |

## Repository hygiene inventory

Reviewed locally; **not deleted** by this closeout.

| Item | Classification | Notes |
| --- | --- | --- |
| `stash@{0}` Playwright / pw-noise before RC4 cert | Worth preserving temporarily | Local-only; may contain noise unrelated to main |
| `stash@{1}` / `stash@{2}` Playwright evidence refresh (RC4-7 / RC4-11) | Worth preserving temporarily | Evidence refresh helpers; do not commit stash contents blindly |
| Older stashes (`stash@{3}`+) | Safe to delete after Owner review | Historical WIP; verify empty of needed patches before `stash drop` |
| Merged local/remote RC3–RC4 feature branches | Safe to delete after Owner review | Already merged into `main` (e.g. `feature/rc4-*`, cutover fixes) |
| `.local-backups/` | Required for audit evidence (local) | Gitignored; keep offline until retention policy says otherwise |
| `.wt-health-probe/` | Safe to delete locally | Worktree/probe scratch; must not be committed |
| Certification evidence under `docs/testing/acceptance-evidence/rc4-*` | Required for audit evidence | In Git; retain |

## Explicit non-inclusions

This document contains **no** passwords, secret keys, JWTs, tokens, cookies, backup dumps, or private environment values.

## Tag approval gate

Creating/pushing `v1.3.0` (or any GitHub Release) required **separate Founder approval** at closeout time. This closeout PR documented the recommendation only and did **not** create the tag.

**Post-approval outcome:** `v1.3.0` exists as an annotated tag at `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`; no GitHub Release object was published.
