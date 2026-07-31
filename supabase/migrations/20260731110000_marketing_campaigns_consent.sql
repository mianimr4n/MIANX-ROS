-- RC3 Marketing: campaigns, honest provider submission states, consent/suppression.

begin;

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  name varchar(160) not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'push')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  audience_filter jsonb not null default '{}'::jsonb,
  message_template text not null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancel_reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.marketing_campaigns is
  'Marketing campaign lifecycle. Provider delivery is not claimed without submission evidence.';

create index if not exists idx_marketing_campaigns_status
  on public.marketing_campaigns (status, created_at desc);
create index if not exists idx_marketing_campaigns_branch
  on public.marketing_campaigns (branch_id);

create table if not exists public.marketing_campaign_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'push')),
  -- Honest provider states — no fabricated "delivered"
  status text not null default 'queued'
    check (status in (
      'queued',
      'suppressed',
      'submitted',
      'provider_accepted',
      'provider_rejected',
      'failed'
    )),
  provider_name text,
  provider_message_id text,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.marketing_campaign_submissions is
  'Per-recipient submission ledger. Statuses stop at provider_accepted/rejected — no fake delivered.';

create index if not exists idx_marketing_submissions_campaign
  on public.marketing_campaign_submissions (campaign_id, status);
create index if not exists idx_marketing_submissions_customer
  on public.marketing_campaign_submissions (customer_id);

create table if not exists public.marketing_suppressions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'push', 'all')),
  reason text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (customer_id, channel)
);

comment on table public.marketing_suppressions is
  'Explicit suppression list. Combined with customers.marketing_consent for send eligibility.';

create index if not exists idx_marketing_suppressions_customer
  on public.marketing_suppressions (customer_id);

drop trigger if exists set_marketing_campaigns_updated_at on public.marketing_campaigns;
create trigger set_marketing_campaigns_updated_at
before update on public.marketing_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_marketing_submissions_updated_at on public.marketing_campaign_submissions;
create trigger set_marketing_submissions_updated_at
before update on public.marketing_campaign_submissions
for each row execute function public.set_updated_at();

alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_submissions enable row level security;
alter table public.marketing_suppressions enable row level security;

drop policy if exists "Staff select marketing campaigns" on public.marketing_campaigns;
create policy "Staff select marketing campaigns"
  on public.marketing_campaigns for select to authenticated
  using (
    branch_id is null
    or public.current_user_has_branch_access(branch_id)
  );

drop policy if exists "Staff select marketing submissions" on public.marketing_campaign_submissions;
create policy "Staff select marketing submissions"
  on public.marketing_campaign_submissions for select to authenticated
  using (
    exists (
      select 1 from public.marketing_campaigns c
      where c.id = campaign_id
        and (c.branch_id is null or public.current_user_has_branch_access(c.branch_id))
    )
  );

drop policy if exists "Staff select marketing suppressions" on public.marketing_suppressions;
create policy "Staff select marketing suppressions"
  on public.marketing_suppressions for select to authenticated
  using (true);

revoke all on public.marketing_campaigns from public, anon, authenticated;
revoke all on public.marketing_campaign_submissions from public, anon, authenticated;
revoke all on public.marketing_suppressions from public, anon, authenticated;

grant select on public.marketing_campaigns to authenticated;
grant select on public.marketing_campaign_submissions to authenticated;
grant select on public.marketing_suppressions to authenticated;

grant all on public.marketing_campaigns to service_role;
grant all on public.marketing_campaign_submissions to service_role;
grant all on public.marketing_suppressions to service_role;

commit;
