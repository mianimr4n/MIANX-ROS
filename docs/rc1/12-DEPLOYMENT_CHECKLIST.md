# RC1 Deployment Checklist

**Scope:** Local / controlled staging evaluation. Production cloud go-live requires a separate Founder authorization beyond Commit G.

## Pre-flight

- [ ] Docker Desktop running (`docker info` OK)  
- [ ] `pnpm local:guard` → PASS, `cloudBindings: []`  
- [ ] Supabase local started (`pnpm local:start`)  
- [ ] Migrations applied; **do not** apply obsolete blanket anon write GRANTs  
- [ ] `backend/api/.env.local` and `apps/website/.env.local` point to `127.0.0.1`  
- [ ] Staff handover fixture present for harnesses (gitignored)  

## Services

- [ ] API: `node --env-file=.env.local --import tsx src/main.ts` (cwd `backend/api`)  
- [ ] `GET /healthz` → 200  
- [ ] `GET /readyz` → `ok: true`  
- [ ] Website: `pnpm dev:website` → `/` and `/admin/login` → 200  

## Verification

- [ ] `pnpm rc1:gate` → EXIT 0, BLOCKING FAILURES: 0  
- [ ] Spot-check Owner login → dashboard  
- [ ] Spot-check BM → `/admin/branch`  
- [ ] Spot-check Kitchen → `/admin/kitchen-dashboard`  
- [ ] Spot-check Cashier cannot open KDS  
- [ ] Spot-check foreign branch API → 403  

## Release governance

- [ ] Commit Register A–F SHAs verified  
- [ ] Release Notes reviewed against Known Limitations  
- [ ] No product files changed in docs-only G commit  
- [ ] Push / PR / production deploy **only** with explicit Founder order  

## Explicitly not in this checklist

- App Store / Play Store  
- Production DNS cutover  
- Penetration test sign-off  
- Multi-tenant customer onboarding  
