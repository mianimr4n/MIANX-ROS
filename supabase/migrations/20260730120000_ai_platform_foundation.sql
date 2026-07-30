-- =============================================================================
-- Phase 4: AI Platform foundation (teams, agents, tasks, approvals)
-- Additive only. Service-role writes via API; authenticated staff may read.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) ai_teams
-- ---------------------------------------------------------------------------
create table if not exists public.ai_teams (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(150) not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_teams is
  'AI Platform teams (Phase 4 foundation).';

-- ---------------------------------------------------------------------------
-- 2) ai_agents
-- ---------------------------------------------------------------------------
create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ai_teams (id) on delete cascade,
  name varchar(150) not null,
  role varchar(150) not null,
  model_id varchar(120),
  status text not null default 'inactive' check (
    status in ('draft', 'active', 'inactive', 'suspended')
  ),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (team_id, name)
);

comment on table public.ai_agents is
  'AI agents belonging to an AI team (Phase 4 foundation).';

create index if not exists idx_ai_agents_team_id on public.ai_agents (team_id);
create index if not exists idx_ai_agents_status on public.ai_agents (status);

-- ---------------------------------------------------------------------------
-- 3) ai_tasks
-- ---------------------------------------------------------------------------
create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  task_type varchar(120) not null,
  status text not null default 'pending' check (
    status in ('pending', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')
  ),
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_tasks is
  'AI task queue / execution records (Phase 4 foundation).';

create index if not exists idx_ai_tasks_agent_id on public.ai_tasks (agent_id);
create index if not exists idx_ai_tasks_status on public.ai_tasks (status);
create index if not exists idx_ai_tasks_created_at on public.ai_tasks (created_at desc);

drop trigger if exists set_ai_tasks_updated_at on public.ai_tasks;
create trigger set_ai_tasks_updated_at
before update on public.ai_tasks
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) ai_approvals
-- ---------------------------------------------------------------------------
create table if not exists public.ai_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ai_tasks (id) on delete cascade,
  requested_by uuid references public.users (id) on delete set null,
  approver_id uuid references public.users (id) on delete set null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected')
  ),
  comments text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_approvals is
  'Human approval gate for AI tasks (Phase 4 foundation).';

create index if not exists idx_ai_approvals_task_id on public.ai_approvals (task_id);
create index if not exists idx_ai_approvals_status on public.ai_approvals (status);

-- ---------------------------------------------------------------------------
-- 5) RLS + grants (API uses service_role; staff may SELECT)
-- ---------------------------------------------------------------------------
alter table public.ai_teams enable row level security;
alter table public.ai_agents enable row level security;
alter table public.ai_tasks enable row level security;
alter table public.ai_approvals enable row level security;

drop policy if exists "Authenticated staff can read ai_teams" on public.ai_teams;
create policy "Authenticated staff can read ai_teams"
  on public.ai_teams for select to authenticated using (true);

drop policy if exists "Authenticated staff can read ai_agents" on public.ai_agents;
create policy "Authenticated staff can read ai_agents"
  on public.ai_agents for select to authenticated using (true);

drop policy if exists "Authenticated staff can read ai_tasks" on public.ai_tasks;
create policy "Authenticated staff can read ai_tasks"
  on public.ai_tasks for select to authenticated using (true);

drop policy if exists "Authenticated staff can read ai_approvals" on public.ai_approvals;
create policy "Authenticated staff can read ai_approvals"
  on public.ai_approvals for select to authenticated using (true);

revoke all on public.ai_teams from public, anon, authenticated;
revoke all on public.ai_agents from public, anon, authenticated;
revoke all on public.ai_tasks from public, anon, authenticated;
revoke all on public.ai_approvals from public, anon, authenticated;

grant select on public.ai_teams to authenticated;
grant select on public.ai_agents to authenticated;
grant select on public.ai_tasks to authenticated;
grant select on public.ai_approvals to authenticated;

grant all on public.ai_teams to service_role;
grant all on public.ai_agents to service_role;
grant all on public.ai_tasks to service_role;
grant all on public.ai_approvals to service_role;

-- ---------------------------------------------------------------------------
-- 6) Seed 6 core AI teams (SRS §4; HR/Development deferred)
-- ---------------------------------------------------------------------------
insert into public.ai_teams (code, name, description)
values
  (
    'executive',
    'Executive AI Team',
    'CEO/COO/CFO/CMO/CTO AI assistants for executive decision support.'
  ),
  (
    'customer-experience',
    'Customer Experience Team',
    'Chat, support, complaint, loyalty, and review agents.'
  ),
  (
    'marketing',
    'Marketing Team',
    'SEO, content, social, ads, and campaign agents.'
  ),
  (
    'restaurant-operations',
    'Restaurant Operations Team',
    'Kitchen, delivery, inventory, purchase, and warehouse agents.'
  ),
  (
    'finance',
    'Finance Team',
    'Finance, budget, and forecasting agents.'
  ),
  (
    'analytics',
    'Analytics Team',
    'BI, forecast, and KPI agents.'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

commit;
