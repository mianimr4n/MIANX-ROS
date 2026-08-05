# Phase 2 Readiness Audit — Release and Migration Strategy

**Audit date:** 2026-08-04
**Status:** PROPOSED — Release sequencing, feature flagging, and migration safety guidelines

---

## Release Pipeline Model

```text
Feature PR (Documentation & Code)
        ↓
Local Stack Migration & Integration Tests
        ↓
Staging / QA Deploy (Read-only verification)
        ↓
Founder Authorization Gate
        ↓
Production Migration Apply (`supabase db push`)
        ↓
Production Web-App Deploy (Vercel) & Backend Deploy (Render)
        ↓
Production Read-only Smoke & Closeout Certification
```

---

## Deployment Rules & Principles

1. **Schema-Before-Code Ordering**: All database migrations must be fully backwards-compatible and applied to Production prior to deploying frontend or backend code consuming new columns/tables.
2. **Feature Flagging**: New Phase 2 capabilities (e.g., WhatsApp Support inbox, Automated COGS posting, AI recommendations) must be guarded behind server-side feature flags or branch configuration flags (`is_active = false` by default).
3. **Staged Rollout**:
   - Stage 1: Internal Super-Admin testing only.
   - Stage 2: Single branch pilot (Royal Orchard `operating`).
   - Stage 3: Full multi-branch activation.
4. **Migration Rollback Limitations**: SQL migrations involving table additions are safe. Column removals are prohibited. If a deployment fails, frontend/backend code is rolled back via Vercel/Render deployment aliases while keeping additive migrations intact.
5. **No Ad-Hoc Production SQL**: All Production database changes MUST be executed via versioned migration files in `supabase/migrations/`. Manual `GRANT` or manual `ALTER` scripts are strictly prohibited.
