# ADR-045: Multi-Tenant Auth Context (JWT Organization Claim) & Catalog Tenancy Model

**Status:** PROPOSED — requires Founder/Owner decision on §2 (Catalog Tenancy Model) before implementation begins
**Version:** 0.1 (draft)
**Date proposed:** 2026-08-20
**Track:** Multi-Tenant Foundation (parallel to the Phase 13 AI/Automation ADR sequence — not renumbering it)

---

## Context

The Multi-Tenant Foundation work began with two migrations, both shipped ahead of this ADR:

- `20260822000000_mianx_ros_01_organizations_brands_foundation.sql` — created `public.organizations` and `public.brands`, seeded Telepizza Pakistan as the first tenant using its existing hardcoded UUID (`00000000-0000-4000-8000-000000000001`), and linked `branches.brand_id`. Applied to production.
- `20260823000000_mianx_ros_02_brand_config_fields.sql` — extended `brands` with `legal_name`/`phone`/`hours`/`city`/`region`, backing the new `GET /api/v1/brand` endpoint and the frontend's additive `fetchBrandConfig()` accessor (`apps/website/client/src/lib/brand.ts`). Not yet applied to production as of this ADR.

Both are structurally additive and have not changed Telepizza's behavior. Neither makes tenant isolation *real* — nothing in the request path today resolves or enforces which tenant is being acted on. This ADR proposes how to close that gap, and surfaces one decision that cannot be made by engineering alone.

Two facts about the existing system constrain the design:

1. **This backend has no persistent Postgres session.** `backend/api` talks to Supabase exclusively via `@supabase/supabase-js` (PostgREST over HTTP) — there is no raw `pg` `Pool`/`Client` anywhere in `src`. A session-variable approach to RLS tenant context (`SET LOCAL`) is not implementable here. Tenant context must travel either in the JWT (for authenticated requests) or as an explicit application-level filter (for service-role and anonymous requests).
2. **Staff/admin routes use the service-role key**, which bypasses RLS by design — the same way branch scoping is enforced today (see ADR-041 §10.1: `AuthPrincipal` + `requirePermission`/`scopeFrom`, not RLS, is the enforcement boundary for admin routes). Tenant isolation on these routes will follow the same pattern: application code, not RLS.

---

## Decision

### 1. JWT organization claim (authenticated requests)

Add a Supabase [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks) — a Postgres function registered in the Supabase Auth configuration — that embeds the caller's organization scope into every issued JWT:

```sql
-- illustrative shape; full function ships in
-- 20260824000000_adr_045_jwt_organization_claim.sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  org_ids uuid[];
  is_platform_super_admin boolean;
begin
  select
    coalesce(array_agg(distinct ur.organization_id) filter (where ur.organization_id is not null), '{}'),
    bool_or(r.code in ('platform_super_admin', 'super-admin'))
  into org_ids, is_platform_super_admin
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{organization_ids}', to_jsonb(org_ids));
  claims := jsonb_set(claims, '{is_platform_super_admin}', to_jsonb(coalesce(is_platform_super_admin, false)));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
```

This mirrors `AuthPrincipal.organizationIds` / `isPlatformSuperAdmin` (`backend/api/src/services/auth/principal.ts`) — the source data already exists, this only makes it visible to Postgres RLS via `auth.jwt()`, for the day RLS-based enforcement is added on customer-authenticated (non-service-role) paths.

**This requires one manual step outside of git/migrations:** registering the function as the project's Access Token Hook in Supabase → Authentication → Hooks. No SQL migration can do this on its own; it's a project-level Auth configuration change. Documented as an explicit operator step in §11.

**Not proposed here:** using this claim to gate staff/admin (service-role) routes — see Context point 2. This claim is for future RLS policies on authenticated (non-service-role) paths and for defense-in-depth, not the primary enforcement mechanism for admin routes.

### 2. Catalog tenancy model — decision needed

`public.menu_categories`, `public.menu_items`, and `public.menu_item_variants` (`supabase/migrations/20260713190000_foundation_schema.sql`) have **no `organization_id` or `branch_id` column**. There is exactly one global catalog for the entire platform today, and `data/catalog/`, `scripts/build-canonical-menu.mjs`, and `scripts/generate-menu-fallback-from-canonical.mjs` all assume that. This is the single largest blocker to a second tenant actually operating on the platform — everything else in Phase A/C is plumbing; this is the product's core sellable data.

Two options:

**Option A — Fully isolated per-tenant catalogs.** Add `organization_id` to `menu_categories` (cascading meaning to `menu_items`/`menu_item_variants` via `category_id`/`menu_item_id`). Each tenant owns and manages their own categories/items/variants independently, same as Telepizza does today. Slugs become unique per-organization instead of globally unique.

- *For:* Simple mental model, matches how a second real restaurant business would actually operate (their own menu, their own prices, no accidental cross-tenant coupling). Matches the isolation model already chosen for `organizations`/`brands`.
- *Against:* No sharing of common items (e.g. "Coca-Cola 500ml") across tenants — each tenant re-creates their own catalog from scratch. More rows, some duplication.

**Option B — Shared base catalog with tenant overrides.** Keep one base catalog; add a `tenant_menu_overrides` (or similar) join table for tenant-specific pricing/availability/additions, resolved at read time.

- *For:* Less duplication if multiple tenants sell overlapping items.
- *Against:* Meaningfully more complex query/resolution logic on every menu read (a hot path — every customer visit hits this), harder to reason about and test, and there is no evidence yet that a second tenant would actually want to share Telepizza's specific pizza/burger catalog. Adds real complexity for a hypothetical benefit.

**Recommendation: Option A.** This platform's tenants are independent restaurant businesses (that's the whole premise — Telepizza was a real, unrelated business relationship before conversion), not franchises of one shared brand with shared SKUs. There's no evidence today that catalog-sharing is a real requirement, and Option A is materially lower-risk to implement on a live, revenue-generating catalog: it's an additive column plus a backfill, not a new resolution layer touching every menu read. If a genuine catalog-sharing need appears later with a real second tenant, that's a narrower, better-informed migration than building the sharing machinery speculatively now.

**This recommendation is not self-approving.** Per this repo's own governance model (README: "does not imply... Founder sign-off"), this ADR stays PROPOSED and Option A's migration is not written until the Founder accepts §2.

---

## 3. DEFERRED items with explicit trigger conditions

| Item | Trigger condition |
| --- | --- |
| Per-service `organizationId` scoping audit across `backend/api/src/services/*` and `backend/api/src/modules/*` (the real Phase B enforcement work) | This ADR's §1 and §2 both being ACCEPTED — auditing services against an undecided catalog model would need redoing |
| Catalog migration implementing §2 | Founder acceptance of Option A (or A with modifications, or Option B) |
| Tenant-isolation acceptance test (second synthetic org, proves cross-org access is rejected on every staff/admin route) | Audit above being complete — the test should assert real enforcement, not be written against partial coverage |
| Tenant resolution strategy for anonymous/public menu browsing (subdomain vs explicit param) | A second tenant actually being onboarded — no second tenant exists yet to make this concrete |

---

## 4. Security & RLS

- No RLS policy changes ship with this ADR. The JWT claim in §1 is additive and unused by any policy until a follow-up ADR adds RLS rules that read it.
- Staff/admin route isolation remains **application-code enforced** (`AuthPrincipal` + `requirePermission`/`scopeFrom`, per ADR-041 §10.1), consistent with how branch scoping already works — this ADR does not change that enforcement boundary, it only adds the audit work item to extend it to `organization_id`.
- The `custom_access_token_hook` function reads `user_roles`/`roles` only — no write access, `stable` not `volatile`, safe to run on every token issuance.

---

## 5. Migration strategy

- `20260824000000_adr_045_jwt_organization_claim.sql` — creates `public.custom_access_token_hook`. Additive, no table changes, safe to apply to production immediately (the function existing has no effect until registered in Supabase Auth Hooks — see §11).
- No catalog migration is written in this ADR. It ships only once §2 is ACCEPTED, as its own migration (`adr_046` or later, depending on what else lands first).

---

## 6. Open questions (for Founder)

1. Accept Option A for catalog tenancy (§2), or a variant, or Option B?
2. Should Telepizza's existing menu slugs be treated as canonical/reserved (no other tenant can reuse `family-deal` etc.) or does per-organization slug uniqueness (Option A) fully resolve this?
3. Priority: is a second real tenant expected soon (making the full Phase B audit + catalog migration urgent), or is Mianx ROS multi-tenancy currently a structural/pitch-readiness goal without a specific second tenant lined up yet? This changes how much to invest in Phase B right now versus continuing Phase 13 (AI/Automation) work in parallel.

---

## 7. References

- `docs/14-phases/MIANX-ROS-MASTER-ROADMAP.md` — platform roadmap
- `MIANX-ROS-MASTER-UPGRADE-PROMPT.md` (repo root) — full multi-tenant upgrade task breakdown, corrected Phase B design
- `docs/14-phases/MULTI-TENANT-PHASE-ACD-CHANGELIST.md` — Phase A/C/D changelist
- ADR-041 §10.1 — existing branch-scoping enforcement pattern this ADR extends to organizations
- `backend/api/src/services/auth/principal.ts` — `AuthPrincipal.organizationIds`/`isPlatformSuperAdmin`, the source data for §1's claim
- Supabase Custom Access Token Hook docs: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
