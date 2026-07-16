-- Sprint 3 Slice 2B — staff_invites + audit events.
-- Forward-only. Idempotent. Do not apply to production until merge gate.

begin;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email varchar(150) not null,
  full_name varchar(150) not null,
  phone varchar(30),
  role_id uuid not null references public.roles (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'accepted', 'revoked', 'expired')),
  token_hash text,
  token_expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references public.users (id) on delete set null,
  accepted_user_id uuid references public.users (id) on delete set null,
  send_count integer not null default 0,
  last_sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_invite_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.staff_invites (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  event_type text not null
    check (event_type in (
      'created', 'sent', 'resent', 'revoked',
      'accept_succeeded', 'accept_failed', 'expired_marked'
    )),
  payload jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_staff_invites_email_lower
  on public.staff_invites (lower(email));

create index if not exists idx_staff_invites_status
  on public.staff_invites (status);

create index if not exists idx_staff_invites_branch_id
  on public.staff_invites (branch_id);

create unique index if not exists staff_invites_token_hash_uidx
  on public.staff_invites (token_hash)
  where token_hash is not null;

create unique index if not exists staff_invites_one_pending_email_uidx
  on public.staff_invites (lower(email))
  where status = 'pending';

create index if not exists idx_staff_invite_events_invite_id
  on public.staff_invite_events (invite_id);

drop trigger if exists trg_staff_invites_set_updated_at on public.staff_invites;
create trigger trg_staff_invites_set_updated_at
before update on public.staff_invites
for each row
execute function public.set_updated_at();

-- Normalize email + enforce branch pairing by role.
create or replace function public.enforce_staff_invite_rules()
returns trigger
language plpgsql
as $$
declare
  role_code text;
begin
  new.email := lower(trim(new.email));

  select code into role_code
  from public.roles
  where id = new.role_id;

  if role_code is null then
    raise exception 'staff invite role_id is invalid';
  end if;

  if role_code = 'customer' then
    raise exception 'customer role cannot be assigned via staff invite';
  end if;

  if role_code = 'super-admin' then
    if new.branch_id is not null then
      raise exception 'super-admin invites must not include branch_id';
    end if;
  elsif new.branch_id is null then
    raise exception 'branch_id is required for role %', role_code;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_staff_invite_rules on public.staff_invites;
create trigger trg_enforce_staff_invite_rules
before insert or update on public.staff_invites
for each row
execute function public.enforce_staff_invite_rules();

alter table public.staff_invites enable row level security;
alter table public.staff_invite_events enable row level security;

-- No authenticated/anon write policies. API uses service_role.
revoke all on table public.staff_invites from anon, authenticated;
revoke all on table public.staff_invite_events from anon, authenticated;
grant select, insert, update, delete on table public.staff_invites to service_role;
grant select, insert on table public.staff_invite_events to service_role;

-- -----------------------------------------------------------------------------
-- Verification:
--   select to_regclass('public.staff_invites');
--   select to_regclass('public.staff_invite_events');
--   select indexname from pg_indexes where tablename = 'staff_invites';
--
-- Rollback guidance:
--   drop trigger if exists trg_enforce_staff_invite_rules on public.staff_invites;
--   drop trigger if exists trg_staff_invites_set_updated_at on public.staff_invites;
--   drop function if exists public.enforce_staff_invite_rules();
--   drop table if exists public.staff_invite_events;
--   drop table if exists public.staff_invites;
-- -----------------------------------------------------------------------------

commit;
