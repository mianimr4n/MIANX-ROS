-- =============================================================================
-- ADR-011 Fix — bypass_immutability hook must return `old` for DELETE
-- =============================================================================
-- Fixes FU-1 (Issue #215, P2).
--
-- Bug: enforce_journal_entry_immutability() in migration 20260814180100 had:
--
--     if v_bypass = 'on' then
--       return new;   -- ❌ NULL for BEFORE DELETE → cancels the DELETE
--     end if;
--
-- For BEFORE DELETE triggers, NEW is NULL. Returning NULL from a BEFORE DELETE
-- trigger CANCELS the DELETE operation per PL/pgSQL semantics. So when an admin
-- sets `app.bypass_immutability = 'on'` and tries to DELETE a posted journal
-- entry (e.g., for GDPR data deletion or year-end archival), the DELETE
-- silently failed — no error, no row removed.
--
-- The sibling function `enforce_journal_entry_line_immutability()` already had
-- the correct pattern:
--
--     if v_bypass = 'on' then
--       if (TG_OP = 'DELETE') then return old; end if;
--       return new;
--     end if;
--
-- This migration makes `enforce_journal_entry_immutability()` consistent with
-- its sibling.
--
-- Backward compatible:
--   - When bypass is OFF (application's normal state): unchanged behavior.
--   - When bypass is ON + UPDATE: unchanged behavior (still returns new).
--   - When bypass is ON + DELETE: BUGFIX — now correctly returns old so the
--     DELETE proceeds. Previously silently cancelled.
--
-- Discovered: 2026-08-14 during v1.8.0 Production verification (the bypass
-- hook failed to delete a test posted entry during cleanup).
-- =============================================================================

begin;

create or replace function public.enforce_journal_entry_immutability()
returns trigger
language plpgsql
as $$
declare
  v_bypass text;
begin
  v_bypass := current_setting('app.bypass_immutability', true);

  if v_bypass = 'on' then
    -- FU-1 fix: for BEFORE DELETE, NEW is NULL. Returning NULL would cancel
    -- the DELETE. Return OLD instead so the DELETE proceeds.
    -- Mirrors enforce_journal_entry_line_immutability() pattern.
    if (TG_OP = 'DELETE') then
      return old;
    end if;
    return new;
  end if;

  if (TG_OP = 'DELETE') then
    if old.status = 'posted' then
      raise exception 'Cannot DELETE posted journal entry (ADR-011 immutability). Use reverse_journal_entry_atomic() instead.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  -- TG_OP = 'UPDATE'
  if old.status = 'posted' then
    -- Allow the documented reversal flow:
    --   1) status posted -> voided
    --   2) setting reversed_by_journal_id (linkage)
    --   3) setting reverses_journal_id (linkage on the new reversal entry)
    -- Block all other field changes.
    if new.entry_date is distinct from old.entry_date
       or new.description is distinct from old.description
       or new.reference_type is distinct from old.reference_type
       or new.reference_id is distinct from old.reference_id
       or new.branch_id is distinct from old.branch_id
       or new.created_by is distinct from old.created_by
    then
      raise exception 'Cannot UPDATE posted journal entry fields (ADR-011 immutability). Use reverse_journal_entry_atomic() to correct.'
        using errcode = 'check_violation';
    end if;

    -- Status changes: only posted -> voided is allowed (reversal flow).
    -- posted -> posted (no change) is fine.
    -- posted -> draft is forbidden.
    if new.status is distinct from old.status
       and not (old.status = 'posted' and new.status = 'voided')
    then
      raise exception 'Cannot change status of posted journal entry from % to % (ADR-011 immutability). Only posted -> voided via reversal is allowed.',
        old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_journal_entry_immutability is
  'ADR-011 guard. Blocks UPDATE/DELETE on posted journal entries except for the documented reversal flow (status posted->voided + linkage column updates). Trusted RPCs can `set local app.bypass_immutability = on` to skip. FU-1 fix (2026-08-15): bypass branch now returns OLD for DELETE (was returning NEW=NULL, which silently cancelled DELETEs).';

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
