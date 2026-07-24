# RC1 Release Notes

**Product:** Telepizza Pakistan Platform  
**Powered by:** Mianx.ai  
**Release:** RC1  
**Product + quality tip (Commit F):** `533887cbecda1525ad21f7d5b6b863657d0d2f1c`  
**Documentation / release tip (Commit G):** `4d1297c2190d4bc272563efee83148ad731ff0fd`

## Summary

RC1 delivers a controlled local enterprise foundation for Telepizza as the first flagship of the Mianx.ai Restaurant Operating System: customer ordering surfaces, Admin ERP shell with RBAC, Owner and Branch Manager workspaces, Kitchen Display (PARTIAL), operational APIs, and a permanent quality gate.

## What shipped

### Customer

- Marketing and menu browsing (API catalog with bundled fallback)
- Cart and WhatsApp-centric checkout path
- Customer auth and My Telepizza account surfaces (depth varies by screen)

### Admin & operations

- Admin shell, login, unauthorized handling, role-based home redirect
- Owner ERP modules wired for Orders, Kitchen board, POS, Delivery, CRM, Loyalty, WhatsApp, Menu, Dashboard, Reports, plus Foundation readiness UIs for Inventory, Purchasing, Finance, HR, Settings
- Branch Manager workspace at `/admin/branch`
- Kitchen Manager KDS at `/admin/kitchen-dashboard` (PARTIAL lifecycle)

### Platform quality

- Local infrastructure and environment guard
- Permanent RC1 static admin suites, auth/branch matrix, KDS auth harness, quality gate (`pnpm rc1:gate`)

## What did not ship (honest)

- Full inventory / purchasing / finance / HR ledgers
- Autonomous or Governed AI agent runtime / AI Command Center
- KDS bump, recall, stations, item-level PATCH, kitchen sound
- Menu write/publish APIs
- WhatsApp provider send
- Dedicated Playwright CI project
- Production cloud deployment package (this commit documents readiness only)

## Upgrade / install notes

1. Use branch `feature/admin-erp-foundation-s1`. Runtime/product behavior tips at Commit **F**; RC1 release documentation tips at Commit **G** (and any docs-only follow-ups such as G.1).
2. Local: Docker Desktop → `pnpm local:start` → apply current migration-based grants (do **not** re-apply obsolete blanket anon write grants from stale operator notes).
3. API: prefer `node --env-file=.env.local --import tsx src/main.ts` from `backend/api` so `.env.local` loads.
4. Website: `pnpm dev:website`
5. Verify: `pnpm rc1:gate`

## Breaking / intentional stubs

- `POST /api/v1/auth/login` and `/refresh` return **501** (use Supabase Auth client)
- `POST /api/v1/branches/resolve` returns **501**
- Reserved Admin routes render ComingSoon (Promotions, Support, Branches, AI Command Center, Integrations)
