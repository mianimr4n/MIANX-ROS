# RC6 Phase 1 — Local release-candidate validation

**Candidate SHA:** `bf5912c91826efce1d097c2ba1a5a0f9c37157ee`  
**UTC window:** 2026-08-02T22:33Z – 2026-08-02T22:52Z (approx)  
**Production access during local testing:** none

## Gate results

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` (954 db/static + 622 backend) | PASS |
| `pnpm test:db` | PASS |
| `pnpm rc1:gate` | PASS (blocking failures: 0) |
| `git diff --check` | PASS |
| RC6 DASH-01…08 + QA-03 + A11Y-02 static suites | PASS (132/132) |
| `pnpm test:e2e:a11y02` | PASS (5/5; critical/serious = 0) |
| `pnpm test:e2e:owner` run 1 | PASS (10/10; 98.6s) |
| `pnpm test:e2e:owner` run 2 | PASS (10/10; 89.8s) |
| `pnpm test:e2e:owner` run 3 | PASS (10/10; 89.0s) |

## Coverage exercised by Owner e2e (local)

- Owner login / session / logout
- Integrated Command Center panels (What Changed, Exception Center, Approval Inbox, Branch Health, Profitability, EOD)
- Pre-open / Live Operations / Closing modes
- Dashboard axe across three command modes (critical/serious = 0)
- Mobile dashboard smoke (no horizontal overflow)
- EOD CSV / JSON / print controls visible
- What Changed reset baseline
- Readonly guard on smoke specs

## Notes

- Local ephemeral Supabase + API `:4000` + website `:3000` used only.
- No retry-only success; three consecutive Owner suite greens.
- No business mutations intended by suite design; readonly guard present.
- No secrets/PII committed in this evidence file.
