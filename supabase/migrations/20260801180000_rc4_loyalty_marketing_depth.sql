-- RC4-11 Loyalty & Marketing Depth (additive).
-- Extends RC3 ledger/coupons/campaigns — does not replace them.
-- No Production apply in this slice.

begin;

-- —— Rewards catalogue ——
create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  branch_id uuid references public.branches (id) on delete set null,
  name text not null,
  description text,
  reward_type text not null
    check (reward_type in (
      'fixed_discount',
      'percentage_discount',
      'free_item',
      'category_reward',
      'delivery_fee_waiver'
    )),
  points_cost integer not null check (points_cost > 0),
  monetary_value numeric(12, 2),
  product_ref text,
  category_ref text,
  is_active boolean not null default false,
  valid_from date,
  valid_to date,
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  global_redemption_limit integer check (global_redemption_limit is null or global_redemption_limit > 0),
  min_order_amount numeric(12, 2) not null default 0 check (min_order_amount >= 0),
  approval_status text not null default 'draft'
    check (approval_status in ('draft', 'awaiting_approval', 'approved', 'rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_from is null or valid_to is null or valid_from <= valid_to),
  check (
    (reward_type = 'fixed_discount' and monetary_value is not null and monetary_value > 0)
    or (reward_type = 'percentage_discount' and monetary_value is not null and monetary_value > 0 and monetary_value <= 100)
    or (reward_type = 'free_item' and product_ref is not null)
    or (reward_type = 'category_reward' and category_ref is not null)
    or (reward_type = 'delivery_fee_waiver')
  )
);

create index if not exists loyalty_rewards_active_idx
  on public.loyalty_rewards (is_active, approval_status, points_cost);
create index if not exists loyalty_rewards_branch_idx
  on public.loyalty_rewards (branch_id);

comment on table public.loyalty_rewards is
  'RC4-11 rewards catalogue. Only approved+active rewards may be redeemed. No custom type without checkout enforcement.';

-- —— Reward redemptions (ledger-linked) ——
create table if not exists public.loyalty_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.loyalty_rewards (id) on delete restrict,
  loyalty_account_id uuid not null references public.loyalty_accounts (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  points_burned integer not null check (points_burned > 0),
  loyalty_transaction_id uuid references public.loyalty_transactions (id) on delete set null,
  status text not null default 'applied'
    check (status in ('applied', 'reversed')),
  idempotency_key text,
  actor_user_id uuid,
  created_at timestamptz not null default now(),
  reversed_at timestamptz
);

create unique index if not exists loyalty_reward_redemptions_idempotency_uq
  on public.loyalty_reward_redemptions (loyalty_account_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists loyalty_reward_redemptions_reward_idx
  on public.loyalty_reward_redemptions (reward_id, status);
create index if not exists loyalty_reward_redemptions_customer_idx
  on public.loyalty_reward_redemptions (customer_id, created_at desc);

comment on table public.loyalty_reward_redemptions is
  'RC4-11 reward claims. Each applied row links a loyalty burn transaction.';

-- —— Tier configuration (extends loyalty_accounts.tier enum values) ——
create table if not exists public.loyalty_tier_definitions (
  id uuid primary key default gen_random_uuid(),
  tier_code text not null
    check (tier_code in ('member', 'silver', 'gold', 'platinum')),
  name text not null,
  qualification_rule text not null default 'lifetime_earned_points'
    check (qualification_rule in ('lifetime_earned_points', 'rolling_earned_points')),
  threshold_points integer not null check (threshold_points >= 0),
  rolling_period_days integer
    check (rolling_period_days is null or rolling_period_days > 0),
  earning_multiplier numeric(6, 3) not null default 1
    check (earning_multiplier > 0),
  benefits jsonb not null default '{}'::jsonb,
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier_code),
  check (effective_from is null or effective_to is null or effective_from <= effective_to),
  check (
    (qualification_rule = 'lifetime_earned_points' and rolling_period_days is null)
    or (qualification_rule = 'rolling_earned_points' and rolling_period_days is not null)
  )
);

create table if not exists public.loyalty_tier_history (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  from_tier text,
  to_tier text not null check (to_tier in ('member', 'silver', 'gold', 'platinum')),
  reason text not null,
  actor_user_id uuid,
  is_manual boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_tier_history_account_idx
  on public.loyalty_tier_history (loyalty_account_id, created_at desc);

comment on table public.loyalty_tier_definitions is
  'RC4-11 configurable tier rules. Incomplete data never assigns a tier upgrade.';
comment on table public.loyalty_tier_history is
  'Audited tier transitions (automatic qualification or manual with reason).';

insert into public.loyalty_tier_definitions (
  tier_code, name, qualification_rule, threshold_points, earning_multiplier, sort_order, is_active
) values
  ('member', 'Member', 'lifetime_earned_points', 0, 1.000, 0, true),
  ('silver', 'Silver', 'lifetime_earned_points', 500, 1.100, 1, true),
  ('gold', 'Gold', 'lifetime_earned_points', 2000, 1.250, 2, true),
  ('platinum', 'Platinum', 'lifetime_earned_points', 5000, 1.500, 3, true)
on conflict (tier_code) do nothing;

-- —— Expiry policy ——
create table if not exists public.loyalty_expiry_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default false,
  expire_after_days integer not null check (expire_after_days > 0),
  effective_from date not null,
  valuation_rule text
    check (valuation_rule is null or valuation_rule in ('none', 'configured_rate')),
  points_to_pkr_rate numeric(12, 6),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (valuation_rule is null or valuation_rule = 'none')
    or (valuation_rule = 'configured_rate' and points_to_pkr_rate is not null and points_to_pkr_rate > 0)
  )
);

comment on table public.loyalty_expiry_policies is
  'RC4-11 points expiry policy. Liability currency conversion only when valuation_rule=configured_rate.';

-- —— Segments ——
create table if not exists public.marketing_segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  formula text not null,
  authoritative_source text not null,
  time_window text not null default 'as_of',
  exclusions text not null default '',
  branch_scope text not null default 'both'
    check (branch_scope in ('branch', 'organization', 'both')),
  freshness text not null default 'query-time',
  completeness text not null default 'deterministic',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.marketing_segments (
  code, name, description, formula, authoritative_source, time_window, exclusions
) values
  ('new_customers', 'New customers', 'First completed order in window',
   'COUNT distinct customers with first non-cancelled order in range',
   'public.orders', 'range', 'cancelled orders'),
  ('returning_customers', 'Returning customers', 'Prior order before range and order in range',
   'phones with prior order before start and order in range',
   'public.orders.contact_phone / customer_id', 'range', 'cancelled'),
  ('inactive_customers', 'Inactive customers', 'No order in last N days',
   'customers with last order older than inactive_days',
   'public.orders + public.customers', 'rolling', 'never-ordered'),
  ('loyalty_members', 'Loyalty members', 'Has loyalty_accounts row',
   'EXISTS loyalty_accounts', 'public.loyalty_accounts', 'as_of', ''),
  ('tier_members', 'Tier members', 'loyalty_accounts.tier = :tier',
   'loyalty_accounts.tier filter', 'public.loyalty_accounts', 'as_of', ''),
  ('high_frequency', 'High-frequency customers', 'order_count >= threshold in window',
   'GROUP BY customer HAVING count >= threshold', 'public.orders', 'range', 'cancelled'),
  ('high_spend', 'High-spend customers', 'SUM(total_amount) >= threshold in window',
   'GROUP BY customer HAVING sum >= threshold', 'public.orders', 'range', 'cancelled'),
  ('coupon_users', 'Coupon users', 'Has coupon_redemptions',
   'EXISTS coupon_redemptions status=applied', 'public.coupon_redemptions', 'range', 'reversed'),
  ('lapsed_customers', 'Lapsed customers', 'Previously ordered, inactive now',
   'had orders before inactive window, none inside', 'public.orders', 'rolling', ''),
  ('consented_audiences', 'Consented audiences', 'marketing_consent=true and not suppressed',
   'customers.marketing_consent AND NOT marketing_suppressions',
   'public.customers + marketing_suppressions', 'as_of', 'suppressed channels')
on conflict (code) do nothing;

-- —— Templates ——
create table if not exists public.marketing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'push')),
  language text not null default 'en',
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  provider_approval_state text not null default 'not_submitted'
    check (provider_approval_state in ('not_submitted', 'pending', 'approved', 'rejected')),
  is_active boolean not null default true,
  branch_id uuid references public.branches (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_templates_channel_idx
  on public.marketing_templates (channel, is_active);

-- —— Campaign workflow depth (extend existing campaigns) ——
alter table public.marketing_campaigns
  drop constraint if exists marketing_campaigns_status_check;

alter table public.marketing_campaigns
  add constraint marketing_campaigns_status_check
  check (status in (
    'draft',
    'awaiting_approval',
    'approved',
    'scheduled',
    'running',
    'paused',
    'completed',
    'cancelled'
  ));

alter table public.marketing_campaigns
  add column if not exists objective text,
  add column if not exists segment_id uuid references public.marketing_segments (id) on delete set null,
  add column if not exists template_id uuid references public.marketing_templates (id) on delete set null,
  add column if not exists coupon_id uuid references public.coupons (id) on delete set null,
  add column if not exists reward_id uuid references public.loyalty_rewards (id) on delete set null,
  add column if not exists budget_metadata jsonb not null default '{}'::jsonb,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists provider_config jsonb not null default '{}'::jsonb;

comment on column public.marketing_campaigns.status is
  'RC4-11 lifecycle includes awaiting_approval/approved. Queue only when approved|scheduled|running.';

-- —— Attribution (traceable sources only) ——
create table if not exists public.marketing_attribution_links (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  source_type text not null
    check (source_type in ('coupon', 'campaign', 'reward_redemption', 'provider_ref')),
  coupon_id uuid references public.coupons (id) on delete set null,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  reward_redemption_id uuid references public.loyalty_reward_redemptions (id) on delete set null,
  provider_message_id text,
  attributable_revenue numeric(12, 2),
  created_at timestamptz not null default now()
);

create unique index if not exists marketing_attribution_links_trace_uq
  on public.marketing_attribution_links (
    order_id,
    source_type,
    (coalesce(coupon_id::text, '')),
    (coalesce(campaign_id::text, '')),
    (coalesce(reward_redemption_id::text, '')),
    (coalesce(provider_message_id, ''))
  );

create index if not exists marketing_attribution_links_campaign_idx
  on public.marketing_attribution_links (campaign_id);

comment on table public.marketing_attribution_links is
  'RC4-11 attribution only via coupon/campaign/reward/provider ref — never timing inference.';

-- —— Audit events ——
create table if not exists public.loyalty_marketing_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  request_id text,
  organization_id uuid,
  branch_id uuid,
  customer_id uuid,
  entity_type text not null,
  entity_id text,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  provider_ref text,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_marketing_audit_events_created_idx
  on public.loyalty_marketing_audit_events (created_at desc);
create index if not exists loyalty_marketing_audit_events_entity_idx
  on public.loyalty_marketing_audit_events (entity_type, entity_id);

alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_reward_redemptions enable row level security;
alter table public.loyalty_tier_definitions enable row level security;
alter table public.loyalty_tier_history enable row level security;
alter table public.loyalty_expiry_policies enable row level security;
alter table public.marketing_segments enable row level security;
alter table public.marketing_templates enable row level security;
alter table public.marketing_attribution_links enable row level security;
alter table public.loyalty_marketing_audit_events enable row level security;

commit;
