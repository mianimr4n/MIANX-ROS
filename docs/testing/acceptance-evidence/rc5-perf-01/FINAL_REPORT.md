# RC5-PERF-01 — Final report

## Verdict

Entry gzip reduced **13.47%** (294.63 → 254.95 kB) via real deferred boundaries (not sync sibling shifts). Critical-route aggregates improved. Gates green. Ready for PR review (do not merge/deploy from this report alone).

## Identity

| Field | Value |
| --- | --- |
| Slice | RC5-PERF-01 — Entry bundle residual reduction |
| Baseline SHA | `11aa195361364d1e48b3f1f589acbb9ca8bd173f` |
| Branch | `feature/rc5-perf-01-entry-bundle` |
| Build | `pnpm --filter telepizza-pakistan build` |
| Node / pnpm | `v24.18.0` / `10.15.1` |

## Files changed (implementation)

- `apps/website/client/src/App.tsx` — lazy non-critical routes; keep Home/Menu/AdminLogin eager
- `apps/website/client/src/pages/Home.tsx` — lazy HeroSlider + accessible fallback
- `apps/website/client/src/contexts/PizzaCustomizerContext.tsx` — lazy dialog when opened
- `apps/website/client/src/components/ErrorBoundary.tsx` — honest chunk-load recovery UX
- `apps/website/vite.config.ts` — `experimentalMinChunkSize: 12000`
- `e2e/rc5/entry-bundle-smoke.spec.ts` + `playwright.rc5-perf-01.config.ts`
- `docs/testing/acceptance-evidence/rc5-perf-01/**`

## Acceptance E-01 … E-04

| ID | Criterion | Result |
| --- | --- | --- |
| E-01 | Before/after measurements in evidence pack | **PASS** |
| E-02 | Critical routes still load (smoke) | **PASS** |
| E-03 | No Production Lighthouse/load-test certification claimed | **PASS** (explicitly not claimed) |
| E-04 | Entry size does not regress beyond budget | **PASS** (−13.5% gzip) |

## Validation run

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` | PASS |
| `pnpm test:db` | PASS |
| `pnpm rc1:gate` | PASS |
| `git diff --check` | PASS |
| Production website build ×2 | PASS, structure deterministic |
| Playwright RC5-PERF-01 smoke | PASS (5/5) |
| Playwright RC5-A11Y-01 | PASS (2/2) |

## Known limitations

1. Entry still triggers Vite’s `>500 kB` warning (~870 kB raw) — residual React + Supabase + Framer Motion + catalog shell.
2. `/` adds one async hero chunk request (acceptable waterfall; aggregate still below before).
3. Public Navbar/Footer/Cart remain in entry even on `/admin/login` (runtime-hidden chrome).
4. Not a RUM / Lighthouse certification.

## Rollback

Revert the PR / reset the feature branch to `11aa195`. No database, migration, secret, or Production changes in this slice.

## Scope confirmation

- No database / migrations / Production SQL / deploy / secrets
- No unrelated product features
- Bytes were not merely moved into synchronous eager sibling chunks (`staticImportCount: 0`)
