-- =============================================================================
-- Phase 2.5 — Accounting Immutability (ADR-011)
-- =============================================================================
-- Implements ADR-011 "Accounting Immutability & Double-Entry Reversals":
--   1. Block UPDATE/DELETE on posted journal_entries except for the documented
--      reversal flow (existing `reverse_journal_entry_atomic` RPC).
--   2. Block UPDATE/DELETE on journal_entry_lines belonging to posted entries.
--   3. Add an exemption hook: `set local app.bypass_immutability = 'on'` lets
--      trusted security-definer functions (the existing reversal RPC) perform
--      the linkage update without triggering the guard.
--
-- Existing schema already has:
--   - journal_entries.reversed_by_journal_id (uuid, set by reversal RPC)
--   - journal_entries.reverses_journal_id   (uuid, set by reversal RPC)
--   - journal_entries.status  in ('draft', 'posted', 'voided')
--
-- Existing reversal flow (from migration 20260731040000):
--   1. `create_journal_entry_atomic(...)` creates the equal-opposite posted entry
--   2. UPDATE new SET reverses_journal_id = original_id
--   3. UPDATE original SET status = 'voided', reversed_by_journal_id = new_id
--   4. UPDATE finance_postings SET status = 'reversed'
--
-- This migration ONLY adds the immutability guard. It does not change the
-- existing reversal flow. Backward compatible.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Immutability trigger on journal_entries
-- ---------------------------------------------------------------------------
-- Blocks UPDATE/DELETE of posted entries EXCEPT:
--   - status change posted -> voided  (used by reverse_journal_entry_atomic)
--   - setting reversed_by_journal_id  (linkage update in reversal flow)
--   - setting reverses_journal_id     (linkage update in reversal flow)
--   - caller sets local app.bypass_immutability = 'on' (trusted RPCs only)
create or replace function public.enforce_journal_entry_immutability()
returns trigger
language plpgsql
as $$
declare
  v_bypass text;
begin
  v_bypass := current_setting('app.bypass_immutability', true);

  if v_bypass = 'on' then
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

drop trigger if exists trg_journal_entry_immutability on public.journal_entries;
create trigger trg_journal_entry_immutability
  before update or delete on public.journal_entries
  for each row execute function public.enforce_journal_entry_immutability();

-- ---------------------------------------------------------------------------
-- 2. Immutability trigger on journal_entry_lines
-- ---------------------------------------------------------------------------
-- Lines of posted entries cannot be UPDATEd or DELETEd.
-- Lines of draft entries can be edited freely (before posting).
-- Lines of voided entries cannot be edited (preserved for audit).
create or replace function public.enforce_journal_entry_line_immutability()
returns trigger
language plpgsql
as $$
declare
  v_entry_status text;
  v_bypass text;
begin
  v_bypass := current_setting('app.bypass_immutability', true);
  if v_bypass = 'on' then
    if (TG_OP = 'DELETE') then return old; end if;
    return new;
  end if;

  if (TG_OP = 'DELETE') then
    select status into v_entry_status from public.journal_entries where id = old.journal_entry_id;
    if v_entry_status in ('posted', 'voided') then
      raise exception 'Cannot DELETE line of % journal entry (ADR-011 immutability). Use reverse_journal_entry_atomic() instead.',
        v_entry_status
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  -- TG_OP = 'UPDATE'
  select status into v_entry_status from public.journal_entries where id = new.journal_entry_id;
  if v_entry_status in ('posted', 'voided') then
    raise exception 'Cannot UPDATE line of % journal entry (ADR-011 immutability). Use reverse_journal_entry_atomic() instead.',
      v_entry_status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_journal_entry_line_immutability on public.journal_entry_lines;
create trigger trg_journal_entry_line_immutability
  before update or delete on public.journal_entry_lines
  for each row execute function public.enforce_journal_entry_line_immutability();

-- ---------------------------------------------------------------------------
-- 3. Patch reverse_journal_entry_atomic to set bypass during reversal
-- ---------------------------------------------------------------------------
-- The existing reversal function (created in migration 20260731040000) does
-- these UPDATEs to posted entries:
--   UPDATE journal_entries SET reverses_journal_id = ... WHERE id = v_rev_id;
--   UPDATE journal_entries SET status = 'voided', reversed_by_journal_id = ... WHERE id = p_journal_id;
-- Both of these are allowed by our trigger (reverses/reversed_by linkage +
-- posted -> voided status change). But to be defensive against future schema
-- changes, we wrap the function body with the bypass flag.
--
-- We can't easily redefine the function here without copying its body, so we
-- rely on the trigger's permissive rules for the documented reversal flow.
-- The bypass flag is reserved for future trusted maintenance procedures
-- (e.g., year-end archival) and is not used by the application today.

comment on function public.enforce_journal_entry_immutability is
  'ADR-011 guard. Blocks UPDATE/DELETE on posted journal entries except for the documented reversal flow (status posted->voided + linkage column updates). Trusted RPCs can `set local app.bypass_immutability = on` to skip.';

comment on function public.enforce_journal_entry_line_immutability is
  'ADR-011 guard. Blocks UPDATE/DELETE on lines of posted or voided journal entries. Draft entries can be edited freely.';

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
