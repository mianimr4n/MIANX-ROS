-- ============================================================================
-- ADR-016 + ADR-017 — OTP Verification Architecture + Phone-First Auth
-- ============================================================================
-- Phase 3 — Customer Phone / WhatsApp OTP
--
-- Implements:
--   ADR-016 — OTP Verification Architecture
--     - otp_requests table (HMAC-hashed OTP, state machine, rate limits)
--     - otp_attempts table (append-only audit trail)
--     - customer_phone_verifications table (canonical verified-phone state)
--     - expire_stale_otp_requests() TTL function
--     - purge_old_otp_records() PII retention function (90 days)
--     - rotate_previous_pending_otps() helper
--     - mark_customer_phone_verified() helper (back-fills ADR-005 identity)
--     - Permissions: otp.manage, otp.read
--
--   ADR-017 — Phone-First Auth & Session Handoff
--     - auth_refresh_tokens table (SHA-256 hashed refresh tokens, rotation)
--     - customers.last_login_at column
--     - auth.session_issued / auth.session_refreshed / auth.session_revoked
--       domain_events mirror via emit_domain_event() (ADR-012)
--
-- Authority:
--   - docs/13-adr/ADR-016-otp-verification-architecture.md
--   - docs/13-adr/ADR-017-phone-first-auth-session-handoff.md
--   - docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md (Phase 3, D11 hard rule)
--
-- D11 hard rule: The ordering number 0304-1110495 is NEVER used for OTP.
-- This is enforced at the application layer (channel resolver) by rejecting
-- any OTP request where phone_e164 resolves to the ordering number. The
-- DB does not encode this rule (it's a business rule, not a data integrity
-- rule) — but we document it here for future engineers.
--
-- This migration is ADDITIVE: it creates new tables, functions, triggers,
-- and permissions. It does NOT modify any existing table except to add the
-- nullable `customers.last_login_at` column.
-- ============================================================================

begin;

-- ============================================================================
-- 0. Permissions (seed first so role grants can reference them)
-- ============================================================================

insert into public.permissions (module, action, code, description)
select 'otp', 'manage', 'otp.manage', 'Manage OTP requests (audit + manual inspection). Super-admin only.'
where not exists (select 1 from public.permissions where code = 'otp.manage');

insert into public.permissions (module, action, code, description)
select 'otp', 'read', 'otp.read', 'Read OTP request history (for support cases). Super-admin + customer-support.'
where not exists (select 1 from public.permissions where code = 'otp.read');

-- Grant otp.manage to super-admin only.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'super-admin' and p.code = 'otp.manage'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = r.id and rp.permission_id = p.id
  );

-- Grant otp.read to super-admin + customer-support.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('super-admin', 'customer-support') and p.code = 'otp.read'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = r.id and rp.permission_id = p.id
  );


-- ============================================================================
-- 1. otp_requests table (ADR-016 §1)
-- ============================================================================

create table if not exists public.otp_requests (
  id uuid primary key default gen_random_uuid(),
  -- E.164 phone number that should receive the OTP (normalized via ADR-005).
  phone_e164 text not null,
  -- Delivery channel: whatsapp | sms | email.
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  -- Purpose: customer_login | customer_register | phone_reverify | recovery.
  purpose text not null check (purpose in ('customer_login', 'customer_register', 'phone_reverify', 'recovery')),
  -- HMAC-SHA256 hash of the plaintext OTP, signed with OTP_HMAC_SECRET env var.
  -- Plaintext OTP is NEVER stored.
  otp_hash text not null,
  -- State machine: pending → verified | failed | expired.
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed', 'expired')),
  -- Counter of failed verification attempts. Reaches max (5) → status='failed'.
  attempt_count int not null default 0 check (attempt_count >= 0),
  -- When the OTP was issued (UTC).
  issued_at timestamptz not null default now(),
  -- When the OTP expires (issued_at + 5 minutes by default).
  expires_at timestamptz not null,
  -- When the OTP was verified (null until verified).
  verified_at timestamptz,
  -- When the OTP was failed/expired (null until terminal state).
  resolved_at timestamptz,
  -- Optional: link to the customer resolved by ADR-005 (null for register flow).
  customer_id uuid references public.customers (id) on delete set null,
  -- Optional: link to the auth_user created/looked-up after verification.
  auth_user_id uuid,
  -- PII-free failure reason: 'max_attempts_exceeded' | 'expired' | 'rotated_out_by_newer_otp'.
  failure_reason text,
  -- Request metadata for audit + fraud analysis.
  request_ip inet,
  request_user_agent text,
  correlation_id uuid,

  -- Sanity: cannot be verified before issued.
  constraint otp_requests_verified_after_issued
    check (verified_at is null or verified_at >= issued_at),
  -- Sanity: cannot be resolved before issued.
  constraint otp_requests_resolved_after_issued
    check (resolved_at is null or resolved_at >= issued_at),
  -- Sanity: terminal states must have resolved_at set.
  constraint otp_requests_terminal_has_resolved
    check (
      (status in ('verified', 'failed', 'expired') and resolved_at is not null)
      or (status = 'pending' and resolved_at is null and verified_at is null)
    ),
  -- Sanity: only verified status can have verified_at.
  constraint otp_requests_verified_at_only_on_verified
    check (
      (status = 'verified' and verified_at is not null)
      or (status <> 'verified' and verified_at is null)
    )
);

comment on table public.otp_requests is
  'OTP issuance records (ADR-016). Each row = one OTP sent to one phone via one channel for one purpose. State machine: pending → verified | failed | expired. The plaintext OTP is NEVER stored — only its HMAC-SHA256 hash. PII retention: 90 days.';

comment on column public.otp_requests.otp_hash is
  'HMAC-SHA256 hash of the plaintext OTP, signed with OTP_HMAC_SECRET env var. Plaintext OTP is NEVER stored.';

create index if not exists otp_requests_phone_status_idx
  on public.otp_requests (phone_e164, status, issued_at desc);

create index if not exists otp_requests_expires_at_idx
  on public.otp_requests (expires_at)
  where status = 'pending';

create index if not exists otp_requests_customer_idx
  on public.otp_requests (customer_id, issued_at desc)
  where customer_id is not null;

create index if not exists otp_requests_correlation_idx
  on public.otp_requests (correlation_id)
  where correlation_id is not null;

create index if not exists otp_requests_request_ip_idx
  on public.otp_requests (request_ip, issued_at desc)
  where request_ip is not null;


-- ============================================================================
-- 2. otp_attempts table (ADR-016 §1) — append-only audit trail
-- ============================================================================

create table if not exists public.otp_attempts (
  id uuid primary key default gen_random_uuid(),
  otp_request_id uuid not null references public.otp_requests (id) on delete restrict,
  -- Result of this single attempt.
  result text not null check (result in ('success', 'wrong_otp', 'expired', 'already_used')),
  -- IP + user-agent of the verifier (for fraud analysis).
  attempt_ip inet,
  attempt_user_agent text,
  attempted_at timestamptz not null default now()
);

comment on table public.otp_attempts is
  'Append-only audit trail of OTP verification attempts (ADR-016). Each row = one verify call (success or failure). ON DELETE RESTRICT prevents removing OTP attempts when the parent request is purged (purge_old_otp_records() deletes attempts explicitly before requests).';

create index if not exists otp_attempts_request_idx
  on public.otp_attempts (otp_request_id, attempted_at desc);

create index if not exists otp_attempts_ip_idx
  on public.otp_attempts (attempt_ip, attempted_at desc)
  where attempt_ip is not null;


-- ============================================================================
-- 3. customer_phone_verifications table (ADR-016 §1)
-- ============================================================================

create table if not exists public.customer_phone_verifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  phone_e164 text not null,
  verified_at timestamptz not null default now(),
  otp_request_id uuid references public.otp_requests (id) on delete set null,
  -- Exactly one primary phone per customer (enforced by partial unique index below).
  is_primary boolean not null default false,
  unique (customer_id, phone_e164)
);

comment on table public.customer_phone_verifications is
  'Canonical "this phone is verified for this customer" state (ADR-016). Source of truth for customer_identities.verified_at. Exactly one is_primary=true row per customer (enforced by partial unique index).';

create index if not exists customer_phone_verifications_phone_idx
  on public.customer_phone_verifications (phone_e164);

create index if not exists customer_phone_verifications_customer_idx
  on public.customer_phone_verifications (customer_id, is_primary);

-- Partial unique index: at most one is_primary=true row per customer.
create unique index if not exists customer_phone_verifications_one_primary_idx
  on public.customer_phone_verifications (customer_id)
  where is_primary = true;


-- ============================================================================
-- 4. auth_refresh_tokens table (ADR-017 §2)
-- ============================================================================

create table if not exists public.auth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  -- SHA-256 hash of the plaintext refresh token. Plaintext is returned to the
  -- client ONCE and never stored.
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- IP + user-agent of the device that requested this refresh token.
  issued_ip inet,
  issued_user_agent text,
  -- When this token was revoked (null = still active).
  revoked_at timestamptz,
  -- Why it was revoked: 'user_logout' | 'rotation' | 'admin_revoke' | 'expired'.
  revoke_reason text check (
    revoke_reason is null or revoke_reason in ('user_logout', 'rotation', 'admin_revoke', 'expired')
  ),
  -- Sanity: revoked_at is set iff revoke_reason is set.
  constraint auth_refresh_tokens_revoked_consistency
    check (
      (revoked_at is null and revoke_reason is null)
      or (revoked_at is not null and revoke_reason is not null)
    )
);

comment on table public.auth_refresh_tokens is
  'Customer session refresh tokens (ADR-017). Plaintext token returned to client ONCE; DB stores only SHA-256 hash. Rotation: each /auth/refresh call issues a new token and revokes the old one (revoke_reason=rotation). RLS allows authenticated users to SELECT + UPDATE their own tokens (for self-service logout).';

create index if not exists auth_refresh_tokens_user_active_idx
  on public.auth_refresh_tokens (auth_user_id, expires_at desc)
  where revoked_at is null;

create index if not exists auth_refresh_tokens_user_all_idx
  on public.auth_refresh_tokens (auth_user_id, issued_at desc);

create index if not exists auth_refresh_tokens_expires_at_idx
  on public.auth_refresh_tokens (expires_at)
  where revoked_at is null;


-- ============================================================================
-- 5. customers.last_login_at column (ADR-017 §4)
-- ============================================================================

alter table public.customers
  add column if not exists last_login_at timestamptz;

comment on column public.customers.last_login_at is
  'Last successful customer login via phone OTP (ADR-017). Updated on each /auth/phone-login. Null until first login.';


-- ============================================================================
-- 6. Functions (ADR-016 §2)
-- ============================================================================

-- 6a. expire_stale_otp_requests() — lazy + scheduled TTL.
create or replace function public.expire_stale_otp_requests()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.otp_requests
  set status = 'expired', resolved_at = now(), failure_reason = 'expired'
  where status = 'pending' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.expire_stale_otp_requests() is
  'TTL function (ADR-016). Marks all pending OTP requests past their expires_at as expired. Called lazily by verifyOtp() and by a scheduled lifecycle job.';


-- 6b. purge_old_otp_records() — 90-day PII retention.
create or replace function public.purge_old_otp_records()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts_deleted int;
  v_tokens_deleted int;
  v_requests_deleted int;
begin
  -- 1. Delete OTP attempts for old OTP requests.
  delete from public.otp_attempts
  where otp_request_id in (
    select id from public.otp_requests
    where issued_at < now() - interval '90 days'
  );
  get diagnostics v_attempts_deleted = row_count;

  -- 2. Delete expired/revoked refresh tokens older than 90 days.
  delete from public.auth_refresh_tokens
  where expires_at < now() - interval '90 days';
  get diagnostics v_tokens_deleted = row_count;

  -- 3. Delete old OTP requests (after their attempts are gone).
  delete from public.otp_requests
  where issued_at < now() - interval '90 days';
  get diagnostics v_requests_deleted = row_count;

  return v_attempts_deleted + v_tokens_deleted + v_requests_deleted;
end;
$$;

comment on function public.purge_old_otp_records() is
  'PII retention function (ADR-016 §2). Deletes OTP requests, OTP attempts, and expired refresh tokens older than 90 days. Called by a daily lifecycle job.';


-- 6c. rotate_previous_pending_otps() — invalidate prior pending OTPs.
create or replace function public.rotate_previous_pending_otps(p_phone_e164 text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.otp_requests
  set status = 'failed', resolved_at = now(), failure_reason = 'rotated_out_by_newer_otp'
  where phone_e164 = p_phone_e164 and status = 'pending';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.rotate_previous_pending_otps(p_phone_e164 text) is
  'Helper (ADR-016 §2). When a new OTP is requested for a phone, all previous pending OTPs for that phone are marked failed. Ensures exactly one pending OTP per phone at any time.';


-- 6d. mark_customer_phone_verified() — back-fill ADR-005 identity + verification table.
create or replace function public.mark_customer_phone_verified(
  p_customer_id uuid,
  p_phone_e164 text,
  p_otp_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verification_id uuid;
begin
  -- Upsert the verification row.
  insert into public.customer_phone_verifications (customer_id, phone_e164, otp_request_id, is_primary)
  values (p_customer_id, p_phone_e164, p_otp_request_id, true)
  on conflict (customer_id, phone_e164)
  do update set
    verified_at = now(),
    otp_request_id = p_otp_request_id,
    is_primary = true
  returning id into v_verification_id;

  -- Demote any other is_primary=true rows for this customer.
  update public.customer_phone_verifications
  set is_primary = false
  where customer_id = p_customer_id and id <> v_verification_id and is_primary = true;

  -- Update customer_identities (ADR-005) to mark the phone as verified.
  update public.customer_identities
  set verified_at = now()
  where identity_type = 'phone' and value = p_phone_e164 and customer_id = p_customer_id;

  return v_verification_id;
end;
$$;

comment on function public.mark_customer_phone_verified(p_customer_id uuid, p_phone_e164 text, p_otp_request_id uuid) is
  'Helper (ADR-016 §2). Records a successful phone verification: upserts customer_phone_verifications (sets is_primary=true, demoting others) and updates the customer_identities row (ADR-005) verified_at. Returns the verification row id.';


-- 6e. revoke_refresh_token() — atomic revoke + return user_id for audit.
create or replace function public.revoke_refresh_token(
  p_token_hash text,
  p_reason text default 'user_logout'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  update public.auth_refresh_tokens
  set revoked_at = now(), revoke_reason = p_reason
  where token_hash = p_token_hash and revoked_at is null
  returning auth_user_id into v_user_id;
  return v_user_id;
end;
$$;

comment on function public.revoke_refresh_token(p_token_hash text, p_reason text) is
  'Helper (ADR-017). Atomically revokes a refresh token by hash. Returns the auth_user_id (for audit) or null if the token was already revoked / not found.';


-- 6f. revoke_all_user_refresh_tokens() — "log out everywhere".
create or replace function public.revoke_all_user_refresh_tokens(
  p_auth_user_id uuid,
  p_reason text default 'user_logout'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.auth_refresh_tokens
  set revoked_at = now(), revoke_reason = p_reason
  where auth_user_id = p_auth_user_id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.revoke_all_user_refresh_tokens(p_auth_user_id uuid, p_reason text) is
  'Helper (ADR-017). Revokes ALL active refresh tokens for a user. Used by /auth/logout-all and by admin forced-logout.';


-- 6g. count_otp_requests_by_phone() — rate-limit check helper (ADR-016 §5).
-- Returns counts of OTP requests for a phone in 3 time windows.
create or replace function public.count_otp_requests_by_phone(
  p_phone_e164 text,
  p_since_10min timestamptz,
  p_since_1hour timestamptz,
  p_since_1day timestamptz
)
returns table (
  count_10min int,
  count_1hour int,
  count_1day int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (select count(*)::int from public.otp_requests
       where phone_e164 = p_phone_e164 and issued_at >= p_since_10min) as count_10min,
    (select count(*)::int from public.otp_requests
       where phone_e164 = p_phone_e164 and issued_at >= p_since_1hour) as count_1hour,
    (select count(*)::int from public.otp_requests
       where phone_e164 = p_phone_e164 and issued_at >= p_since_1day) as count_1day;
end;
$$;

comment on function public.count_otp_requests_by_phone(p_phone_e164 text, p_since_10min timestamptz, p_since_1hour timestamptz, p_since_1day timestamptz) is
  'Rate-limit helper (ADR-016 §5). Returns OTP request counts for a phone across 3 time windows (10min, 1hour, 1day). Used by the OTP service to enforce per-phone rate limits.';


-- ============================================================================
-- 7. Append-only enforcement on otp_attempts
-- ============================================================================

create or replace function public.enforce_otp_attempts_append_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'otp_attempts is append-only (ADR-016). INSERT only; UPDATE/DELETE rejected.';
end;
$$;

drop trigger if exists trg_otp_attempts_no_update on public.otp_attempts;
create trigger trg_otp_attempts_no_update
  before update on public.otp_attempts
  for each row execute function public.enforce_otp_attempts_append_only();

drop trigger if exists trg_otp_attempts_no_delete on public.otp_attempts;
create trigger trg_otp_attempts_no_delete
  before delete on public.otp_attempts
  for each row execute function public.enforce_otp_attempts_append_only();


-- ============================================================================
-- 8. RLS
-- ============================================================================

-- 8a. otp_requests: service_role write; service_role + super-admin read.
alter table public.otp_requests enable row level security;

drop policy if exists "otp_requests_service_all" on public.otp_requests;
create policy "otp_requests_service_all"
  on public.otp_requests for all
  to service_role
  using (true)
  with check (true);

-- No anon / authenticated read by default — otp.read permission enforced
-- at the application layer via the admin/otp route (which uses service_role).


-- 8b. otp_attempts: service_role only.
alter table public.otp_attempts enable row level security;

drop policy if exists "otp_attempts_service_all" on public.otp_attempts;
create policy "otp_attempts_service_all"
  on public.otp_attempts for all
  to service_role
  using (true)
  with check (true);


-- 8c. customer_phone_verifications: service_role write; branch staff read.
alter table public.customer_phone_verifications enable row level security;

drop policy if exists "customer_phone_verifications_service_all" on public.customer_phone_verifications;
create policy "customer_phone_verifications_service_all"
  on public.customer_phone_verifications for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "customer_phone_verifications_staff_read" on public.customer_phone_verifications;
create policy "customer_phone_verifications_staff_read"
  on public.customer_phone_verifications for select
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = customer_phone_verifications.customer_id
      and (
        -- Super-admin sees all.
        exists (
          select 1 from public.staff_assignments sa
          join public.roles r on r.id = sa.role_id
          where sa.user_id = auth.uid()
            and sa.assignment_status = 'ACTIVE'
            and r.code = 'super-admin'
        )
        -- Branch staff see customers in their branch.
        or c.id in (
          select o.customer_id from public.orders o
          join public.staff_assignments sa on sa.branch_id = o.branch_id
          where sa.user_id = auth.uid()
            and sa.assignment_status = 'ACTIVE'
        )
      )
    )
  );


-- 8d. auth_refresh_tokens: service_role all; authenticated owner SELECT+UPDATE.
alter table public.auth_refresh_tokens enable row level security;

drop policy if exists "auth_refresh_tokens_service_all" on public.auth_refresh_tokens;
create policy "auth_refresh_tokens_service_all"
  on public.auth_refresh_tokens for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "auth_refresh_tokens_owner_select" on public.auth_refresh_tokens;
create policy "auth_refresh_tokens_owner_select"
  on public.auth_refresh_tokens for select
  to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "auth_refresh_tokens_owner_update" on public.auth_refresh_tokens;
create policy "auth_refresh_tokens_owner_update"
  on public.auth_refresh_tokens for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid() and revoked_at is not null);
  -- ^ clients can only UPDATE to set revoked_at (i.e. revoke their own token).
  -- They cannot "un-revoke" or change other fields.


-- ============================================================================
-- 9. Grants
-- ============================================================================

grant select on public.otp_requests to service_role;
grant insert, update on public.otp_requests to service_role;

grant select, insert on public.otp_attempts to service_role;

grant select on public.customer_phone_verifications to authenticated, anon, service_role;
grant insert, update on public.customer_phone_verifications to service_role;

grant select, insert, update on public.auth_refresh_tokens to service_role;
grant select, update on public.auth_refresh_tokens to authenticated;


-- ============================================================================
-- 10. Domain event mirror (ADR-012) — best-effort; conditional on function existence.
-- ============================================================================

do $_$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'emit_domain_event'
  ) then
    -- Mirror: when an OTP request transitions to 'verified', emit customer.otp_verified.
    create or replace function public.mirror_otp_verified_to_domain_events()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $func$
    begin
      if (tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'verified') then
        perform public.emit_domain_event(
          p_event_type => 'customer.otp_verified',
          p_domain => 'customer',
          p_entity_id => new.customer_id,
          p_branch_id => null,
          p_actor_user_id => new.auth_user_id,
          p_actor_role => 'customer',
          p_metadata => jsonb_build_object(
            'phone_e164', new.phone_e164,
            'channel', new.channel,
            'purpose', new.purpose,
            'otp_request_id', new.id,
            'correlation_id', new.correlation_id
          ),
          p_correlation_id => new.correlation_id
        );
      end if;
      return new;
    end;
    $func$;

    drop trigger if exists trg_otp_verified_domain_event on public.otp_requests;
    create trigger trg_otp_verified_domain_event
      after update on public.otp_requests
      for each row execute function public.mirror_otp_verified_to_domain_events();

    -- Mirror: when a refresh token is revoked, emit auth.session_revoked.
    create or replace function public.mirror_session_revoked_to_domain_events()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $func$
    begin
      if (tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null) then
        perform public.emit_domain_event(
          p_event_type => 'auth.session_revoked',
          p_domain => 'auth',
          p_entity_id => new.auth_user_id,
          p_branch_id => null,
          p_actor_user_id => new.auth_user_id,
          p_actor_role => 'customer',
          p_metadata => jsonb_build_object(
            'revoke_reason', new.revoke_reason,
            'token_id', new.id
          ),
          p_correlation_id => null
        );
      end if;
      return new;
    end;
    $func$;

    drop trigger if exists trg_session_revoked_domain_event on public.auth_refresh_tokens;
    create trigger trg_session_revoked_domain_event
      after update on public.auth_refresh_tokens
      for each row execute function public.mirror_session_revoked_to_domain_events();
  end if;
end
$_$;


-- ============================================================================
-- 11. Verification (post-migration sanity checks; not enforced, just logged).
-- ============================================================================

do $sanity$
declare
  v_perm_otp_manage int;
  v_perm_otp_read int;
  v_table_count int;
  v_function_count int;
begin
  select count(*) into v_perm_otp_manage from public.permissions where code = 'otp.manage';
  select count(*) into v_perm_otp_read from public.permissions where code = 'otp.read';

  select count(*) into v_table_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('otp_requests', 'otp_attempts', 'customer_phone_verifications', 'auth_refresh_tokens');

  select count(*) into v_function_count
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public'
    and p.proname in (
      'expire_stale_otp_requests',
      'purge_old_otp_records',
      'rotate_previous_pending_otps',
      'mark_customer_phone_verified',
      'revoke_refresh_token',
      'revoke_all_user_refresh_tokens',
      'count_otp_requests_by_phone',
      'enforce_otp_attempts_append_only'
    );

  raise notice 'ADR-016/017 migration sanity: permissions=%/%, tables=4 (actual %), functions=8 (actual %)',
    v_perm_otp_manage, v_perm_otp_read, v_table_count, v_function_count;
end
$sanity$;

commit;

-- ============================================================================
-- End of migration 20260821000000_adr_016_017_otp.sql
-- ============================================================================
