# RC5-OPS-01 — Static test coverage

**Suite:** `tests/database/rc5-ops-01-privilege-contract.test.mjs`  
**Runner:** Node test (`pnpm test:db` includes `tests/database/**/*.test.mjs`)

## What is covered

| Assertion | Intent |
| --- | --- |
| Baseline migration filename/version present | Fail if `20260714120000_grant_public_access.sql` disappears |
| Harden migration filename/version present | Fail if `20260718130000_p0_harden_grants_and_definer_execute.sql` disappears |
| Baseline SQL intent | Schema USAGE, ALL TABLES grants, sequences, default privileges |
| Harden revoke intent | Dangerous client privileges revoked; catalog write revoke; users/orders anon lockdown; default privilege tighten |
| Harden selective GRANT intent | Catalog SELECT; users authenticated SELECT/UPDATE; orders SELECT; service_role DML; helper EXECUTE |

Patterns use case-insensitive regex with flexible whitespace so harmless formatting changes do not flake.

## Explicit limitation

These tests verify **migration presence and SQL intent in the repository only**.  
They **do not** prove live database privilege behavior. CI has no live Supabase privilege job.

Live proof: `FRESH_LOCAL_PRIVILEGE_VERIFICATION.md`.
