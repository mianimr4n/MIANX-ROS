-- =============================================================================
-- Customer identity — Pakistani phone E.164 safety on public.users
-- =============================================================================
-- Does NOT modify Slice 2D order RLS migration.
-- phone UNIQUE already exists (foundation). This adds:
--   - E.164 check constraint for non-null phones (+923XXXXXXXXX)
--   - Documented partial unique index (idempotent with existing UNIQUE)
-- Privilege triggers already block auth_user_id / user_type / status / password_hash.
-- =============================================================================

begin;

-- Normalize empty strings to null before check (safe for blank rows).
update public.users
set phone = null
where phone is not null and btrim(phone) = '';

alter table public.users
  drop constraint if exists users_phone_e164_check;

alter table public.users
  add constraint users_phone_e164_check
  check (phone is null or phone ~ '^\+923[0-9]{9}$');

create unique index if not exists users_phone_e164_uidx
  on public.users (phone)
  where phone is not null;

comment on column public.users.phone is
  'Optional Pakistani mobile in E.164 (+923XXXXXXXXX). Unverified until Slice 2C OTP. UNIQUE when present.';

-- Verification:
--   insert phone '+923001234567' ok; duplicate → unique violation
--   insert '03001234567' → check violation
-- Rollback: drop constraint users_phone_e164_check; drop index users_phone_e164_uidx;

commit;
