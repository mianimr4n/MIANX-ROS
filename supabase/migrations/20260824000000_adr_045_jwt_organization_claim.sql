-- =============================================================================
-- ADR-045 — Custom Access Token Hook: organization_ids / is_platform_super_admin
-- =============================================================================
-- Creates the Postgres function that, once registered as this Supabase
-- project's Auth "Custom Access Token Hook" (Authentication -> Hooks in the
-- Supabase dashboard — this migration cannot register it, only create it),
-- embeds each user's organization scope into their JWT.
--
-- Additive, read-only function. Has zero effect until manually registered
-- in the Supabase dashboard (see ADR-045 §11 / §1). Safe to apply to
-- production immediately.
-- =============================================================================

begin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  org_ids uuid[];
  is_platform_super_admin boolean;
begin
  select
    coalesce(array_agg(distinct ur.organization_id) filter (where ur.organization_id is not null), '{}'),
    bool_or(r.code in ('platform_super_admin', 'super-admin'))
  into org_ids, is_platform_super_admin
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{organization_ids}', to_jsonb(coalesce(org_ids, '{}'::uuid[])));
  claims := jsonb_set(claims, '{is_platform_super_admin}', to_jsonb(coalesce(is_platform_super_admin, false)));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'ADR-045. Supabase Custom Access Token Hook: embeds organization_ids + is_platform_super_admin into every issued JWT, read from user_roles/roles. Must be registered manually in Supabase dashboard (Authentication -> Hooks) — a SQL migration cannot do this. Unused by any RLS policy as of ADR-045; additive groundwork only.';

-- The hook must be callable by Supabase Auth's internal service role.
revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

commit;
