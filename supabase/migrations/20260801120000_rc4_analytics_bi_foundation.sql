-- RC4-2 Analytics & BI foundation (additive).
-- Metric contracts live in application registry; DB stores schedules, quality, exceptions.
-- Scheduled report *execution* remains DEFERRED until a worker exists.
-- No Production apply in this slice.

begin;

create table if not exists public.analytics_scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  branch_id uuid references public.branches (id) on delete set null,
  name text not null,
  module_id text not null,
  cadence text not null
    check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  format text not null
    check (format in ('csv', 'excel', 'pdf')),
  metric_ids text[] not null default '{}',
  timezone text not null default 'Asia/Karachi',
  created_by uuid,
  is_active boolean not null default true,
  execution_status text not null default 'deferred'
    check (execution_status in ('deferred', 'queued', 'running', 'succeeded', 'failed')),
  last_executed_at timestamptz,
  deferred_reason text not null default 'No analytics worker is deployed; schedule definitions are stored only.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_scheduled_reports_branch_idx
  on public.analytics_scheduled_reports (branch_id);
create index if not exists analytics_scheduled_reports_module_idx
  on public.analytics_scheduled_reports (module_id);

comment on table public.analytics_scheduled_reports is
  'RC4-2 scheduled report definitions. Execution is DEFERRED without a worker.';

create table if not exists public.analytics_exceptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete set null,
  module_id text not null,
  metric_id text,
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  code text not null,
  message text not null,
  detail jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists analytics_exceptions_status_idx
  on public.analytics_exceptions (status, created_at desc);
create index if not exists analytics_exceptions_module_idx
  on public.analytics_exceptions (module_id);

comment on table public.analytics_exceptions is
  'RC4-2 Analytics Exception Center — data quality and metric availability issues.';

create table if not exists public.analytics_data_quality_checks (
  id uuid primary key default gen_random_uuid(),
  check_code text not null,
  module_id text not null,
  status text not null check (status in ('pass', 'warn', 'fail', 'unavailable')),
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists analytics_data_quality_checks_checked_idx
  on public.analytics_data_quality_checks (checked_at desc);

comment on table public.analytics_data_quality_checks is
  'RC4-2 Data Quality Center snapshots from analytics engine runs.';

-- Helpful read indexes for analytics aggregation (orders already heavily used).
create index if not exists orders_created_at_branch_status_idx
  on public.orders (branch_id, created_at, status);

create index if not exists payments_order_id_status_idx
  on public.payments (order_id, status)
  where order_id is not null;

alter table public.analytics_scheduled_reports enable row level security;
alter table public.analytics_exceptions enable row level security;
alter table public.analytics_data_quality_checks enable row level security;

commit;
