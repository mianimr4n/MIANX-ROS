# Dependency Reproducibility

**Date:** 2026-07-22  
**Package manager:** pnpm 10.15.1  

## Verification executed

| Check | Result |
| --- | --- |
| `pnpm check` (website + API tsc) | PASS |
| `pnpm build:website` | PASS (chunk size warning only) |
| `pnpm --filter @telepizza/api test` | PASS — 235 tests |
| Kitchen Manager static tests | PASS — 5/5 |
| Playwright in `apps/website/package.json` | **Not declared** — browser E2E classified PASS WITH LIMITATION / NOT APPLICABLE for pixel matrix |

## Dependency posture

- Root `package.json` intentionally lean (scripts + pnpm overrides only).
- API deps: express, supabase-js, zod, helmet, cors, vitest/tsx.
- Website deps managed in `apps/website/package.json`.
- Override present: `tailwindcss>nanoid` → `3.3.7`.
- No unrelated package upgrades performed in this stabilization pass.

## Install guidance

```bash
pnpm install
# Prefer frozen CI installs when lockfile is the release artifact:
pnpm install --frozen-lockfile
```

## Known warnings (non-blocking)

- pnpm warns that root `package.json` `pnpm.overrides` field placement is legacy — functional override still applied; migrate to `pnpm-workspace` settings later if desired.
- Vite production chunk >500kB warning.

## Changes in this phase (infra-related)

- Backend env safety module expanded (`env.ts`) — no new runtime dependencies.
- New Node scripts under `scripts/` using existing Node + supabase-js from API package via `createRequire`.
