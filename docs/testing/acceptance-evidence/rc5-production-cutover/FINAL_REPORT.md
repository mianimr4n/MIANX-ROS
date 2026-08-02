# RC5 Production website cutover — final report

## Verdict

**COMPLETE** — Production website cutover on authorized SHA verified; public, accessibility (0 critical / 0 serious), performance sanity, API health, and authenticated Owner smoke all PASS. No migration/SQL; rollback not executed.

## Record

| Item | Value |
| --- | --- |
| Authorized SHA | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Live website SHA | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Vercel deployment | `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` |
| Prior rollback target | `dpl_FriiC2PsK3bEYrXbXLVuNSXv3G3y` (`795efee…`) |
| Public route smoke | **PASS** |
| Accessibility desktop/mobile | **PASS** — 0 critical / 0 serious (does **not** claim zero total findings) |
| Performance sanity | **PASS** (entry gzip ≈255.57 kB) |
| Authenticated Owner smoke | **PASS** (operator attestation `2026-08-02T10:23:52Z`) |
| API health | `/healthz` 200, `/readyz` 200, `issues: []` |
| Observed API `gitSha` | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| API deployment by this mission | **NOT PERFORMED** |
| Migration / Production SQL | **NONE** |
| Rollback | **Not executed** |

## Predeploy

`pnpm install --frozen-lockfile`, `check`, `test`, `test:db`, `rc1:gate`, `git diff --check`, `pnpm build:website`, local PERF/A11Y/Owner suites — PASS before Production verification.

## Known limitations

1. Accessibility gate is **0 critical / 0 serious** only — not a claim of zero total axe findings; moderate advisories remain (accessible-name, touch-targets, heading hierarchy, menu contrast).
2. Website entry content-hash differs from local build hash (expected cross-host); gzip band consistent with PERF-01 evidence.
3. Authenticated smoke is operator attestation (credential-free); no session material stored in Git.
4. Closeout documentation lives under `docs/testing/acceptance-evidence/rc5-final-closeout/`.
