# Telepizza ROS → Mianx ROS: Multi-Tenant Migration Plan

**Goal:** Convert the mature, production-tested Telepizza ROS platform into **Mianx ROS** — a multi-tenant Restaurant Operating System — where Telepizza becomes the **first tenant**, not the product identity.

**Guiding principle:** This codebase is proven (Phase 0–12 closed, v2.7.0, 1096 backend tests, 41 ADRs). We do **not** rewrite it. We add a tenant layer above it, additive-only, matching the existing migration discipline already used in this repo.

---

## 0. Current State (as found)

- Backend scoping today: `branches` table is the top-level entity. One business (Telepizza), N branches.
- 101 forward-only SQL migrations, ADR-linked, RLS-aware, additive-only philosophy — **keep following this pattern**.
- Frontend branding centralized in `apps/website/client/src/lib/brand.ts` (`BRAND` object) — this is the single seam the whole UI reads from. This is the biggest asset for this migration.
- Backend package: `@telepizza/api`. Website package: `telepizza-pakistan`.
- No `tenant_id` concept anywhere in backend modules or DB schema today.
- A separate Mianx.ai Phase-1 scaffold already exists (Tenant/Brand/Branch Prisma schema, RLS SQL, JWT+RBAC, tenant-context middleware) — built independently, **not yet merged with this codebase**. This plan treats Telepizza ROS as the "business logic" and ports it into a tenant-aware shell.

---

## 1. Target Architecture

```
Mianx ROS (platform)
  └── Tenant  (e.g. "Telepizza Pakistan", future: other restaurants)
        └── Brand   (a tenant can run multiple brands eventually)
              └── Branch  (existing: Royal Orchard, Northern Bypass...)
                    └── Everything that exists today: POS, Kitchen, Inventory,
                        CRM, Finance, HR, Loyalty, Deliveries, Supplier Portal,
                        WhatsApp, AI modules
```

Every table that currently scopes by `branch_id` needs a resolvable path up to `tenant_id` (either directly, or via `branch_id → tenant_id` lookup) so RLS can enforce tenant isolation.

---

## 2. Phased Plan

### Phase A — Schema Foundation (additive, zero downtime)
1. New migration: `tenants` table (id, name, legal_name, slug, status, created_at...)
2. New migration: `brands` table (id, tenant_id, name, slug...)
3. New migration: add `tenant_id` (nullable at first) and `brand_id` to `branches`
4. Backfill: create one `tenants` row for Telepizza, one `brands` row, update existing branches to point to it
5. Once backfilled, make `tenant_id`/`brand_id` `NOT NULL` on `branches`
6. **Do not touch any other table yet** — every other table already scopes via `branch_id`, and `branch_id → tenant_id` is now resolvable via a join. This avoids retrofitting all 100+ existing tables individually.

### Phase B — RLS & Auth
7. Add `tenant_id` claim to JWT/session (super-admin can span tenants, all other roles are pinned to one tenant)
8. Update RLS policies: policies that currently check `branch_id` get a `AND branch.tenant_id = current_tenant_id()` guard, added via a Postgres helper function — not by rewriting every policy from scratch
9. Add a `current_tenant_id()` Postgres function (session-local, set by the API layer per-request) — matches the ADR-linked pattern already used in this repo (see ADR-003 style)

### Phase C — Brand Layer Goes Dynamic
10. Move `BRAND` object out of `client/src/lib/brand.ts` hardcoded values into a `brands` table fetch (API endpoint: `GET /tenant/brand-config`)
11. `brand.ts` becomes a thin client that fetches + caches this at app boot, falling back to Telepizza's current values as the **seed data for the Telepizza tenant** — nothing visually changes for the existing tenant
12. Platform-level chrome (login page, system emails, admin console shell, footer "Powered by") becomes **Mianx ROS** branding — this is separate from any tenant's own brand

### Phase D — Rename Platform Identity
13. `backend/api` package name: `@telepizza/api` → `@mianx/ros-api`
14. `apps/website` → becomes the **tenant-facing app template**; consider renaming to `apps/tenant-app` or similar
15. Root README, docs front matter, repo description → Mianx ROS platform docs; move Telepizza-specific historical docs (588 files in `docs/18-reference`, ADRs, release notes) into an archived `docs/tenants/telepizza/` folder rather than deleting — they're valuable implementation history, just not platform-level anymore

### Phase E — Onboarding Flow
16. Build the "new tenant" onboarding flow (this is where your existing **Discovery Engine** idea plugs in — Google listing → auto-provision tenant/brand/branch)
17. Verify a second, synthetic tenant can be created end-to-end and is fully isolated (data, RLS, brand) from Telepizza — this is the real proof that multi-tenancy works

### Phase F — Resume Product Roadmap
18. Continue into **Phase 13 (AI & Automation)** from the existing roadmap (`docs/14-phases/PHASE-13-PLANNING.md`) — now tenant-aware from the start instead of needing another retrofit later

---

## 3. What NOT to do
- Don't touch the 100+ non-`branches` tables individually to add `tenant_id` directly — resolve tenant via the `branches` join. Only add direct `tenant_id` columns later, if a specific query path proves too slow.
- Don't delete Telepizza-specific docs/tests — archive them. They're your regression baseline.
- Don't break the existing 1096 backend tests — Phase A–B should be verified by running the full suite after each migration, not just at the end.

---

## 4. Why this needs Claude Code, not chat
This is a 101-migration, 40+ module, multi-week engineering migration on a 96MB production codebase with a real test suite. It needs:
- Direct access to your local repo (not a re-uploaded zip each time)
- Incremental git commits per migration step
- Running the actual test suite after each change to catch regressions immediately
- Session continuity across many days of work

This plan is the handoff spec — hand this file + the repo to Claude Code and work through the phases in order, verifying tests after each one.
