# RC5-OPS-01 Final Report

**Status:** Ready for PR review
**Slice:** Local privilege contract / AGENTS truth
**Branch:** `feature/rc5-ops-01-agents-truth`
**Baseline SHA:** `1a3e61ff08d8dd521158c765f3867b89136d0b1e`
**Fresh-local:** `FRESH_LOCAL_PRIVILEGE_CONTRACT_PASS`
**New privilege migration:** none (not required)

## Contradiction resolved

| Before | After |
| --- | --- |
| `AGENTS.md` claimed migrations never GRANT and required manual docker `GRANT` after every start/reset | Documents migration-managed baseline + harden contract |
| `scripts/local-up.mjs` said “Grants (known repo gap…)” | Points to migration-managed privileges + investigate `42501` |
| `LOCAL_DATABASE_GUIDE.md` partially correct but still framed as AGENTS lag | Aligned with empirical contract |

## Migrations establishing the contract

- `20260714120000_grant_public_access.sql`
- `20260718130000_p0_harden_grants_and_definer_execute.sql`
- Tip observed locally: `20260801180000`

## Changed files (implementation)

- `AGENTS.md`
- `scripts/local-up.mjs`
- `docs/infrastructure/LOCAL_DATABASE_GUIDE.md`
- `tests/database/rc5-ops-01-privilege-contract.test.mjs`
- `docs/testing/acceptance-evidence/rc5-ops-01/*`
- `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md` (OPS-2)
- `docs/planning/RC5_BASELINE.md` (TD-1)

## Validation

| Gate | Result |
| --- | --- |
| Focused privilege-contract tests | PASS (6) |
| `pnpm check` | PASS |
| `pnpm test` | PASS |
| `pnpm test:db` | PASS |
| `pnpm rc1:gate` | PASS |
| `git diff --check` | PASS |

## Known limitations

1. No live-DB privilege job in GitHub CI (static SQL intent only).
2. PostgREST HTTP probe returned 401 in the verification session (not `42501`); Postgres `SET ROLE` probes established privilege success.
3. Production privilege posture unchanged by this slice.

## Rollback

Revert the PR. No Production migration to reverse. Local: `pnpm local:reset` if needed.

## Production

No Production mutation, SQL, deploy, or secret rotation.
