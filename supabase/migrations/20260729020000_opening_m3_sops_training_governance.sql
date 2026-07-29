-- Opening Operations M3 — SOPs, training, rehearsals, Founder go/no-go, Owner handover.
-- Forward-only. Local/test only in this task — do not apply to Production here.
-- Rollback notes:
--   drop tables branch_sop_reviews, branch_sop_review_events,
--     branch_training_sessions, branch_training_participants, branch_training_events,
--     branch_role_rehearsals, branch_role_rehearsal_events,
--     branch_e2e_rehearsals, branch_e2e_rehearsal_events,
--     branch_founder_opening_decisions,
--     branch_owner_handover_records, branch_owner_handover_events;
-- Secrets: NEVER store passwords, tokens, API keys, or identity document payloads.
-- RLS: authenticated SELECT via current_user_has_branch_access; mutations via service_role only.
-- Founder/Owner are display labels — authorization remains super-admin. No owner/founder role codes.

begin;

-- ---------------------------------------------------------------------------
-- 1) SOP review records
-- ---------------------------------------------------------------------------

create table if not exists public.branch_sop_reviews (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  sop_code text not null
    check (sop_code in (
      'ORDER_CONFIRMATION', 'KITCHEN_PROGRESSION', 'DELIVERY_DISPATCH',
      'CANCELLATION_REFUND', 'OPENING_CHECKLIST', 'CLOSING_CHECKLIST',
      'CASH_RECONCILIATION', 'RESERVATION_AND_WAITLIST', 'INCIDENT_ESCALATION'
    )),
  document_reference text,
  document_version varchar(80),
  review_status text not null default 'NOT_REVIEWED'
    check (review_status in (
      'NOT_REVIEWED', 'REVIEW_REQUIRED', 'REVIEWED', 'APPROVED', 'RETIRED'
    )),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  approved_by uuid references public.users (id) on delete set null,
  approved_at timestamptz,
  operational_verification_status text not null default 'NOT_VERIFIED'
    check (operational_verification_status in (
      'NOT_VERIFIED', 'REHEARSAL_REQUIRED', 'VERIFIED_ONSITE', 'FAILED', 'EXPIRED'
    )),
  operationally_verified_by uuid references public.users (id) on delete set null,
  operationally_verified_at timestamptz,
  review_due_at timestamptz,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_sop_reviews_branch_code unique (branch_id, sop_code)
);

create index if not exists idx_branch_sop_reviews_branch
  on public.branch_sop_reviews (branch_id, review_status, operational_verification_status);

create index if not exists idx_branch_sop_reviews_due
  on public.branch_sop_reviews (review_due_at)
  where review_due_at is not null;

drop trigger if exists set_branch_sop_reviews_updated_at on public.branch_sop_reviews;
create trigger set_branch_sop_reviews_updated_at
before update on public.branch_sop_reviews
for each row execute function public.set_updated_at();

create table if not exists public.branch_sop_review_events (
  id uuid primary key default gen_random_uuid(),
  sop_review_id uuid not null references public.branch_sop_reviews (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_sop_review_events_sop
  on public.branch_sop_review_events (sop_review_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Training sessions + participants
-- ---------------------------------------------------------------------------

create table if not exists public.branch_training_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  training_code text not null
    check (training_code in (
      'BRANCH_MANAGER', 'CASHIER_POS', 'KITCHEN', 'RIDER_DELIVERY',
      'HOST_WAITER', 'CUSTOMER_SUPPORT', 'OPENING_AND_CLOSING',
      'SAFETY_AND_INCIDENT', 'CASH_RECONCILIATION'
    )),
  title varchar(200) not null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  trainer_user_id uuid references public.users (id) on delete set null,
  verifier_user_id uuid references public.users (id) on delete set null,
  training_status text not null default 'NOT_SCHEDULED'
    check (training_status in (
      'NOT_SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'
    )),
  result text not null default 'NOT_ASSESSED'
    check (result in ('NOT_ASSESSED', 'PASS', 'CONDITIONAL_PASS', 'FAIL')),
  notes text,
  follow_up_required boolean not null default false,
  follow_up_due_at timestamptz,
  local_test_only boolean not null default false,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_training_sessions_branch
  on public.branch_training_sessions (branch_id, training_code, training_status);

drop trigger if exists set_branch_training_sessions_updated_at on public.branch_training_sessions;
create trigger set_branch_training_sessions_updated_at
before update on public.branch_training_sessions
for each row execute function public.set_updated_at();

create table if not exists public.branch_training_participants (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references public.branch_training_sessions (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  canonical_role_code text not null
    check (canonical_role_code in (
      'super-admin', 'branch-manager', 'kitchen', 'cashier', 'rider',
      'customer-support', 'host', 'waiter'
    )),
  attendance_status text not null default 'INVITED'
    check (attendance_status in ('INVITED', 'CONFIRMED', 'ATTENDED', 'ABSENT', 'EXCUSED')),
  assessment_result text not null default 'NOT_ASSESSED'
    check (assessment_result in ('NOT_ASSESSED', 'PASS', 'CONDITIONAL_PASS', 'FAIL')),
  acknowledged_at timestamptz,
  assessed_by uuid references public.users (id) on delete set null,
  assessment_notes text,
  remediation_required boolean not null default false,
  remediation_due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_training_participants unique (training_session_id, user_id)
);

create index if not exists idx_branch_training_participants_session
  on public.branch_training_participants (training_session_id, attendance_status);

drop trigger if exists set_branch_training_participants_updated_at on public.branch_training_participants;
create trigger set_branch_training_participants_updated_at
before update on public.branch_training_participants
for each row execute function public.set_updated_at();

create table if not exists public.branch_training_events (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references public.branch_training_sessions (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- 3) Role rehearsals
-- ---------------------------------------------------------------------------

create table if not exists public.branch_role_rehearsals (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  rehearsal_code text not null
    check (rehearsal_code in (
      'BRANCH_MANAGER_OPENING', 'CASHIER_POS', 'KITCHEN_ORDER_FLOW',
      'RIDER_DISPATCH', 'HOST_WAITER_FLOOR', 'CUSTOMER_SUPPORT_ESCALATION'
    )),
  scenario text not null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  rehearsal_status text not null default 'NOT_SCHEDULED'
    check (rehearsal_status in (
      'NOT_SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'
    )),
  result text not null default 'NOT_ASSESSED'
    check (result in ('NOT_ASSESSED', 'PASS', 'CONDITIONAL_PASS', 'FAIL')),
  facilitator_user_id uuid references public.users (id) on delete set null,
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  issues_found text,
  corrective_actions text,
  retest_required boolean not null default false,
  retest_due_at timestamptz,
  local_test_only boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_role_rehearsals_branch
  on public.branch_role_rehearsals (branch_id, rehearsal_code, rehearsal_status);

drop trigger if exists set_branch_role_rehearsals_updated_at on public.branch_role_rehearsals;
create trigger set_branch_role_rehearsals_updated_at
before update on public.branch_role_rehearsals
for each row execute function public.set_updated_at();

create table if not exists public.branch_role_rehearsal_events (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.branch_role_rehearsals (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- 4) End-to-end opening rehearsal
-- ---------------------------------------------------------------------------

create table if not exists public.branch_e2e_rehearsals (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'NOT_SCHEDULED'
    check (status in (
      'NOT_SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'
    )),
  result text not null default 'NOT_ASSESSED'
    check (result in ('NOT_ASSESSED', 'PASS', 'CONDITIONAL_PASS', 'FAIL')),
  facilitator_user_id uuid references public.users (id) on delete set null,
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  stages_completed jsonb not null default '[]'::jsonb,
  stages_failed jsonb not null default '[]'::jsonb,
  critical_failures integer not null default 0 check (critical_failures >= 0),
  noncritical_findings text,
  corrective_actions text,
  retest_required boolean not null default false,
  retest_due_at timestamptz,
  local_test_only boolean not null default false,
  notes text,
  readiness_snapshot jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_e2e_rehearsals_branch
  on public.branch_e2e_rehearsals (branch_id, status);

drop trigger if exists set_branch_e2e_rehearsals_updated_at on public.branch_e2e_rehearsals;
create trigger set_branch_e2e_rehearsals_updated_at
before update on public.branch_e2e_rehearsals
for each row execute function public.set_updated_at();

create table if not exists public.branch_e2e_rehearsal_events (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.branch_e2e_rehearsals (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- 5) Founder go/no-go decisions (immutable snapshots; super-admin only)
-- ---------------------------------------------------------------------------

create table if not exists public.branch_founder_opening_decisions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  decision text not null
    check (decision in (
      'NOT_READY', 'REVIEW_REQUIRED', 'GO_CONDITIONAL', 'GO_APPROVED', 'NO_GO', 'WITHDRAWN'
    )),
  decision_notes text,
  conditions text,
  decided_by uuid not null references public.users (id) on delete restrict,
  decided_at timestamptz not null default timezone('utc', now()),
  readiness_registry_items jsonb not null default '[]'::jsonb,
  required_items integer not null default 0,
  completed_items integer not null default 0,
  readiness_percentage numeric(5,2),
  critical_blockers jsonb not null default '[]'::jsonb,
  waiting_on_human jsonb not null default '[]'::jsonb,
  failed_verifications jsonb not null default '[]'::jsonb,
  expired_evidence jsonb not null default '[]'::jsonb,
  unresolved_training jsonb not null default '[]'::jsonb,
  unresolved_rehearsals jsonb not null default '[]'::jsonb,
  selected_branch_status text,
  snapshot_payload jsonb not null,
  supersedes_decision_id uuid references public.branch_founder_opening_decisions (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chk_founder_go_conditional_notes
    check (decision <> 'GO_CONDITIONAL' or (conditions is not null and length(trim(conditions)) > 0)),
  constraint chk_founder_no_go_notes
    check (decision <> 'NO_GO' or (decision_notes is not null and length(trim(decision_notes)) > 0))
);

create index if not exists idx_branch_founder_decisions_branch
  on public.branch_founder_opening_decisions (branch_id, decided_at desc);

-- Prevent UPDATE/DELETE of snapshot rows (append-only governance).
create or replace function public.prevent_founder_decision_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'branch_founder_opening_decisions rows are immutable';
end;
$$;

drop trigger if exists trg_prevent_founder_decision_update on public.branch_founder_opening_decisions;
create trigger trg_prevent_founder_decision_update
before update or delete on public.branch_founder_opening_decisions
for each row execute function public.prevent_founder_decision_mutation();

-- ---------------------------------------------------------------------------
-- 6) Owner handover (no owner role code)
-- ---------------------------------------------------------------------------

create table if not exists public.branch_owner_handover_records (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  handover_status text not null default 'NOT_STARTED'
    check (handover_status in (
      'NOT_STARTED', 'PREPARING', 'REVIEW_REQUIRED', 'READY_FOR_HANDOVER', 'ACCEPTED', 'CANCELLED'
    )),
  intended_owner_name varchar(200),
  intended_owner_contact_reference text,
  handover_scope text,
  access_review_status text not null default 'NOT_STARTED'
    check (access_review_status in (
      'NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED'
    )),
  operational_documents_reviewed boolean not null default false,
  financial_procedure_reviewed boolean not null default false,
  staff_structure_reviewed boolean not null default false,
  device_inventory_reviewed boolean not null default false,
  unresolved_items text,
  prepared_by uuid references public.users (id) on delete set null,
  prepared_at timestamptz,
  accepted_by_reference text,
  accepted_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_owner_handover_one_active unique (branch_id)
);

drop trigger if exists set_branch_owner_handover_records_updated_at on public.branch_owner_handover_records;
create trigger set_branch_owner_handover_records_updated_at
before update on public.branch_owner_handover_records
for each row execute function public.set_updated_at();

create table if not exists public.branch_owner_handover_events (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references public.branch_owner_handover_records (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- 7) RLS + grants
-- ---------------------------------------------------------------------------

alter table public.branch_sop_reviews enable row level security;
alter table public.branch_sop_review_events enable row level security;
alter table public.branch_training_sessions enable row level security;
alter table public.branch_training_participants enable row level security;
alter table public.branch_training_events enable row level security;
alter table public.branch_role_rehearsals enable row level security;
alter table public.branch_role_rehearsal_events enable row level security;
alter table public.branch_e2e_rehearsals enable row level security;
alter table public.branch_e2e_rehearsal_events enable row level security;
alter table public.branch_founder_opening_decisions enable row level security;
alter table public.branch_owner_handover_records enable row level security;
alter table public.branch_owner_handover_events enable row level security;

drop policy if exists "Staff select branch sop reviews" on public.branch_sop_reviews;
create policy "Staff select branch sop reviews" on public.branch_sop_reviews
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch sop review events" on public.branch_sop_review_events;
create policy "Staff select branch sop review events" on public.branch_sop_review_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch training sessions" on public.branch_training_sessions;
create policy "Staff select branch training sessions" on public.branch_training_sessions
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch training participants" on public.branch_training_participants;
create policy "Staff select branch training participants" on public.branch_training_participants
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch training events" on public.branch_training_events;
create policy "Staff select branch training events" on public.branch_training_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch role rehearsals" on public.branch_role_rehearsals;
create policy "Staff select branch role rehearsals" on public.branch_role_rehearsals
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch role rehearsal events" on public.branch_role_rehearsal_events;
create policy "Staff select branch role rehearsal events" on public.branch_role_rehearsal_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch e2e rehearsals" on public.branch_e2e_rehearsals;
create policy "Staff select branch e2e rehearsals" on public.branch_e2e_rehearsals
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch e2e rehearsal events" on public.branch_e2e_rehearsal_events;
create policy "Staff select branch e2e rehearsal events" on public.branch_e2e_rehearsal_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch founder decisions" on public.branch_founder_opening_decisions;
create policy "Staff select branch founder decisions" on public.branch_founder_opening_decisions
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch owner handover" on public.branch_owner_handover_records;
create policy "Staff select branch owner handover" on public.branch_owner_handover_records
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch owner handover events" on public.branch_owner_handover_events;
create policy "Staff select branch owner handover events" on public.branch_owner_handover_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

grant select on table
  public.branch_sop_reviews,
  public.branch_sop_review_events,
  public.branch_training_sessions,
  public.branch_training_participants,
  public.branch_training_events,
  public.branch_role_rehearsals,
  public.branch_role_rehearsal_events,
  public.branch_e2e_rehearsals,
  public.branch_e2e_rehearsal_events,
  public.branch_founder_opening_decisions,
  public.branch_owner_handover_records,
  public.branch_owner_handover_events
to authenticated;

grant select, insert, update, delete on table
  public.branch_sop_reviews,
  public.branch_sop_review_events,
  public.branch_training_sessions,
  public.branch_training_participants,
  public.branch_training_events,
  public.branch_role_rehearsals,
  public.branch_role_rehearsal_events,
  public.branch_e2e_rehearsals,
  public.branch_e2e_rehearsal_events,
  public.branch_owner_handover_records,
  public.branch_owner_handover_events
to service_role;

-- Founder decisions: insert + select only (immutable; no update/delete grant).
grant select, insert on table public.branch_founder_opening_decisions to service_role;

comment on table public.branch_sop_reviews is
  'Opening M3 — SOP review/approval. Documentation alone does not imply rehearsal or onsite verification.';
comment on table public.branch_training_sessions is
  'Opening M3 — training sessions. local_test_only does not satisfy Production readiness.';
comment on table public.branch_training_participants is
  'Opening M3 — real active branch-assigned participants only. No owner/founder role codes.';
comment on table public.branch_role_rehearsals is
  'Opening M3 — role rehearsals. local_test_only excluded from Production COMPLETE.';
comment on table public.branch_e2e_rehearsals is
  'Opening M3 — end-to-end opening rehearsal. Does not execute Production orders.';
comment on table public.branch_founder_opening_decisions is
  'Opening M3 — immutable Founder go/no-go snapshots. Actor must be super-admin. Does not auto-change branch status.';
comment on table public.branch_owner_handover_records is
  'Opening M3 — future Owner handover without creating an owner role code. No secrets.';

commit;
