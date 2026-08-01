# API Performance

## Changes

1. **Shared pagination helper** — `backend/api/src/lib/list-pagination.ts`  
   Defaults: limit 50, max 100 (configurable per route).
2. **Loyalty accounts/transactions** — query `limit`/`offset` with pagination meta; max lowered from 500→100 on list routes.
3. **Loyalty liability snapshot** — replaced single `.select("points, type").limit(20000)` with parallel type-filtered page sums (page 1000 × max 10 pages per type) to reduce peak payload and client-side filtering.

## Unchanged (already bounded)

Orders, kitchen, reservations, menu, inventory list schemas retain existing Zod max limits.

## Not claimed

No Production load test. No warehouse query rewrite. RLS/RBAC unchanged.
