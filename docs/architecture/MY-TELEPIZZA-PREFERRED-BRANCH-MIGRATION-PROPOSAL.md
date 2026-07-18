# OWNER REVIEW REQUIRED — Preferred branch persistence

**Status:** Proposal only — **do not apply** until owner approves.  
**Sprint:** 4.5A My Telepizza  
**Why:** Branch selection today is device/`localStorage` (`telepizza.selectedBranchId`). There is no preferred-branch column on `users` / `customers`.

## Goal

Remember the customer’s preferred operating branch across devices for faster checkout and hub defaults.

## Minimal schema (draft)

```sql
-- OWNER REVIEW REQUIRED — not applied
alter table public.users
  add column if not exists preferred_branch_id uuid
    references public.branches (id) on delete set null;

-- RLS: reuse existing users own-row update policy; ensure preferred_branch_id
-- is included in allowed update columns (service or authenticated own-row only).
```

If `users` is not the right home, attach to a future `customers` profile row instead — same ownership rule: `auth.uid()` only.

## API (after approval)

- Extend `PATCH /auth/me/profile` with optional `preferredBranchId` / `preferredBranchCode`
- Validate branch exists and `status = operating`

## Current hub behaviour (4.5A)

My Telepizza shows the **branch selected on this device** and links to the existing branch picker. It does **not** claim cloud sync.
