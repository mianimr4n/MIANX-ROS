# ADR-002: Settings Versioning, Activation & Rollback Model

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migrations `20260806150140` + `20260806170223`)

---

## Context

Without explicit versioning, setting updates apply directly to live
tables. This creates two risks:

1. **Accidental breakage.** A typo in a tax rate or delivery radius
   immediately affects production. There is no "undo" — the previous
   value is gone.
2. **No approval workflow.** A branch-manager can change their branch's
   settings without oversight, even for high-impact configurations
   like tax rates or kitchen lead times.

Phase 2.1 (Settings) closes this gap. ADR-002 establishes a draft →
pending_approval → active → superseded state machine, with single-step
rollback to any previous active version.

## Decision

Implement settings versioning with these rules:

1. **State machine for `configuration_versions.status`:**
   ```
   draft → pending_approval → active → superseded (when a new version activates)
                                    → rolled_back (when explicitly rolled back)
   ```

2. **Draft creation.** Any staff member with `settings.manage` permission
   can create a draft. Drafts are visible only to the creator + super-
   admin. Drafts do NOT affect the effective value.

3. **Approval workflow.** If `schema.requires_approval = true`:
   - Creator submits draft → status becomes `pending_approval`
   - Super-admin approves → status becomes `active`
   - Super-admin rejects → status stays `pending_approval` (with a
     rejection reason in `configuration_change_log`)
   - If `requires_approval = false`, the creator can activate directly
     (draft → active).

4. **Activation is atomic.** When a version becomes `active`:
   - The previous `active` version for the same `(schema_id, scope_id)`
     is marked `superseded` in the same transaction.
   - The new version's `activated_at` is set.
   - A row is inserted in `configuration_change_log` with `change_type=
     'activate'`.

5. **Single-step rollback.** A super-admin can roll back to any previous
   `superseded` version:
   - The current `active` version is marked `rolled_back`.
   - The target `superseded` version is marked `active` again.
   - A row is inserted in `configuration_change_log` with `change_type=
     'rollback'` and `reason`.
   - The rollback is itself a version transition — it can be rolled back
     too (though this is rare).

6. **Effective value is always the `active` version.** The backend's
   effective-value resolver (ADR-001 §3) only considers `active`
   versions. Drafts, pending_approval, superseded, and rolled_back
   versions are ignored.

7. **Change log is append-only.** `configuration_change_log` rejects
   UPDATE and DELETE via trigger. Every change is recorded forever.

8. **Activation requires `settings.activate` permission.** Granted to
   super-admin only. Branch-managers can create drafts but cannot
   activate without approval.

## Consequences

### Positive

- **No accidental breakage.** A typo in a draft does not affect
  production until explicitly activated.
- **Approval workflow.** High-impact changes require super-admin sign-off.
- **Instant rollback.** Any previous active version can be restored in
  one call.
- **Full audit trail.** Every activation/rollback is logged with actor
  + reason.

### Negative

- **Latency for changes.** A branch-manager who wants to change their
  tax rate must: create draft → submit for approval → wait for super-
  admin → activate. This is intentional — tax rates should not change
  quickly.
- **Version proliferation.** Over time, the `configuration_versions`
  table accumulates many superseded rows. A future cleanup job (out
  of scope) can archive old versions to cold storage.

## Implementation references

- Migration: `supabase/migrations/20260806150140_phase2_02_settings_persistence_foundation.sql`
- Migration: `supabase/migrations/20260806170223_phase2_03_versioning_activation_rollback.sql`
- TypeScript service: `backend/api/src/services/settings/organization.ts`
- TypeScript service: `backend/api/src/services/settings/branch.ts`
- Admin routes: `backend/api/src/modules/admin/configuration.ts`, `backend/api/src/modules/admin/settings.ts`
