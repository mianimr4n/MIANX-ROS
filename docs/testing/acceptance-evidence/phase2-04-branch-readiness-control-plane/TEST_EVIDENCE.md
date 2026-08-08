# Test evidence

## Local safety and database

- Frozen lockfile install: PASS, pnpm 10.15.1.
- `local:guard`: PASS, loopback-only bindings.
- Clean local Supabase reset: PASS through migration `20260807100000_identity_01_tenant_owner_onboarding`.
- Local enterprise seed: PASS, six test accounts and five test orders.
- PHASE2-04 migration: NONE; upgrade from the current repository tip is therefore a no-op.

## Automated gates

- Website typecheck: PASS.
- Backend typecheck: PASS.
- Repository/database/website static tests: 1,065 passed.
- Backend tests: 660 passed across 84 files.
- Combined full tests: 1,725 passed.
- Focused PHASE2-04 backend: 15 passed.
- Focused PHASE2-04 database/UI: 9 passed.
- Focused total: 24 passed.
- Playwright: 6 passed (Owner, Branch Manager isolation, cashier denial × desktop/mobile).
- Website Production build: PASS, 2,491 modules transformed.
- RC1 gate: PASS; 0 blocking failures, 0 known debt, one documented optional BM browser suite skip inside the legacy gate.

## Live-local status matrix

- anonymous list: 401
- platform list: 200
- Branch Manager list: 200
- Branch Manager assigned effective configuration: 200
- malformed UUID: 400
- unknown UUID: 404
- existing foreign branch: 403
- kitchen/cashier/rider list: 403

All browser and role fixtures were loopback-only and gitignored. No credential value was recorded in evidence.
