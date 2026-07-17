-- =============================================================================
-- Telepizza PRODUCTION schema snapshot (SCHEMA-ONLY)
-- Project ref: pyeowxvacgypohrbvgee (Telepizza)
-- Captured: 2026-07-18 via `npx supabase db dump --linked --schema public`
-- Audit branch: audit/database-pre-freeze-completeness
--
-- HARD SAFETY:
--   DO NOT EXECUTE this file against any existing database (local or production).
--   Use for reference / diff / inventory only. Never drop or recreate public.users.
-- =============================================================================



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auth_user_email_exists"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  select exists (
    select 1
    from auth.users au
    where lower(au.email) = lower(trim(p_email))
  );
$$;


ALTER FUNCTION "public"."auth_user_email_exists"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."current_app_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_customer_owns_order"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.current_user_is_active()
      and (
        (o.auth_user_id is not null and o.auth_user_id = auth.uid())
        or exists (
          select 1
          from public.customers c
          join public.users u on u.id = c.user_id
          where c.id = o.customer_id
            and u.auth_user_id = auth.uid()
            and u.status = 'active'
            and u.user_type = 'customer'
        )
      )
  );
$$;


ALTER FUNCTION "public"."current_customer_owns_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_branch_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select distinct ur.branch_id
  from public.users u
  join public.user_roles ur on ur.user_id = u.id
  where u.auth_user_id = auth.uid()
    and u.status = 'active'
    and ur.branch_id is not null;
$$;


ALTER FUNCTION "public"."current_user_branch_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_has_branch_access"("p_branch_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p_branch_id is not null
    and public.current_user_is_active()
    and (
      public.current_user_is_super_admin()
      or exists (
        select 1
        from public.current_user_branch_ids() bid
        where bid = p_branch_id
      )
    );
$$;


ALTER FUNCTION "public"."current_user_has_branch_access"("p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.status = 'active'
  );
$$;


ALTER FUNCTION "public"."current_user_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Super-admin is DB-derived only (role code + non-customer user_type + active).
  -- Never read JWT metadata claims or request headers.
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.auth_user_id = auth.uid()
      and u.status = 'active'
      and u.user_type <> 'customer'
      and r.code = 'super-admin'
  );
$$;


ALTER FUNCTION "public"."current_user_is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_staff_invite_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  role_code text;
  branch_status text;
begin
  new.email := lower(trim(new.email));

  select code into role_code
  from public.roles
  where id = new.role_id;

  if role_code is null then
    raise exception 'staff invite role_id is invalid';
  end if;

  if role_code in ('customer', 'super-admin') then
    raise exception 'role % cannot be assigned via staff invite', role_code;
  end if;

  if role_code not in (
    'branch-manager',
    'cashier',
    'kitchen',
    'rider',
    'customer-support'
  ) then
    raise exception 'role % is not inviteable', role_code;
  end if;

  if new.branch_id is null then
    raise exception 'branch_id is required for every staff invite';
  end if;

  select status into branch_status
  from public.branches
  where id = new.branch_id;

  if branch_status is null then
    raise exception 'branch_id does not exist';
  end if;

  if branch_status is distinct from 'operating' then
    raise exception 'branch must be operating';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_staff_invite_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_customer_profile_for_auth_user"("p_auth_user_id" "uuid", "p_email" "text", "p_full_name_meta" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  resolved_name text;
  profile_id uuid;
  customer_role_id uuid;
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required';
  end if;

  resolved_name := nullif(trim(coalesce(p_full_name_meta, '')), '');

  if resolved_name is null then
    resolved_name := nullif(trim(split_part(coalesce(p_email, ''), '@', 1)), '');
  end if;

  if resolved_name is null then
    resolved_name := 'Customer';
  end if;

  insert into public.users (
    auth_user_id,
    full_name,
    email,
    phone,
    password_hash,
    user_type,
    status
  )
  values (
    p_auth_user_id,
    resolved_name,
    nullif(trim(coalesce(p_email, '')), ''),
    null,
    null,
    'customer',
    'active'
  )
  on conflict (auth_user_id) do update
  set
    email = coalesce(excluded.email, public.users.email),
    full_name = case
      when nullif(trim(public.users.full_name), '') is null then excluded.full_name
      else public.users.full_name
    end,
    -- Never change user_type / password_hash / status on re-entry.
    updated_at = timezone('utc', now())
  where public.users.auth_user_id = excluded.auth_user_id;

  select id
  into profile_id
  from public.users
  where auth_user_id = p_auth_user_id;

  select id
  into customer_role_id
  from public.roles
  where code = 'customer';

  if profile_id is null then
    raise exception 'failed to ensure customer profile for auth user %', p_auth_user_id;
  end if;

  if customer_role_id is null then
    raise exception 'customer role is missing';
  end if;

  insert into public.user_roles (user_id, role_id, branch_id)
  select profile_id, customer_role_id, null
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = profile_id
      and ur.role_id = customer_role_id
      and ur.branch_id is null
  );

  return profile_id;
end;
$$;


ALTER FUNCTION "public"."ensure_customer_profile_for_auth_user"("p_auth_user_id" "uuid", "p_email" "text", "p_full_name_meta" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_staff_invite_acceptance"("p_invite_id" "uuid", "p_auth_user_id" "uuid", "p_full_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  invite_row public.staff_invites%rowtype;
  role_code text;
  target_user_type text;
  app_user_id uuid;
  existing_user_type text;
  non_customer_roles integer;
begin
  select * into invite_row
  from public.staff_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'invite not found';
  end if;

  if invite_row.status is distinct from 'pending' then
    raise exception 'invite not acceptable';
  end if;

  if invite_row.token_expires_at is null or invite_row.token_expires_at <= timezone('utc', now()) then
    update public.staff_invites
    set status = 'expired', token_hash = null, updated_at = timezone('utc', now())
    where id = invite_row.id;
    raise exception 'invite expired';
  end if;

  if invite_row.branch_id is null then
    raise exception 'invite branch missing';
  end if;

  select code into role_code from public.roles where id = invite_row.role_id;
  if role_code is null
     or role_code in ('customer', 'super-admin')
     or role_code not in (
       'branch-manager', 'cashier', 'kitchen', 'rider', 'customer-support'
     ) then
    raise exception 'invite role invalid';
  end if;

  target_user_type := case role_code
    when 'rider' then 'rider'
    when 'customer-support' then 'support'
    else 'staff'
  end;

  perform set_config('telepizza.allow_staff_provision', 'on', true);

  select id, user_type into app_user_id, existing_user_type
  from public.users
  where auth_user_id = p_auth_user_id
  for update;

  if app_user_id is null then
    insert into public.users (
      auth_user_id,
      full_name,
      email,
      phone,
      password_hash,
      user_type,
      status
    )
    values (
      p_auth_user_id,
      coalesce(nullif(trim(p_full_name), ''), invite_row.full_name, 'Staff'),
      invite_row.email,
      invite_row.phone,
      null,
      target_user_type,
      'active'
    )
    returning id into app_user_id;
  else
    -- Only the Slice 1 customer bootstrap for THIS newly created auth user may be upgraded.
    if existing_user_type is distinct from 'customer' then
      raise exception 'invite account conflict';
    end if;

    select count(*)::integer into non_customer_roles
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = app_user_id
      and r.code is distinct from 'customer';

    if coalesce(non_customer_roles, 0) > 0 then
      raise exception 'invite account conflict';
    end if;

    -- Email on profile must match invite (normalized).
    if exists (
      select 1
      from public.users u
      where u.id = app_user_id
        and lower(coalesce(u.email, '')) is distinct from lower(invite_row.email)
        and u.email is not null
    ) then
      raise exception 'invite account conflict';
    end if;

    update public.users
    set
      full_name = coalesce(nullif(trim(p_full_name), ''), full_name, invite_row.full_name),
      email = invite_row.email,
      user_type = target_user_type,
      status = 'active',
      updated_at = timezone('utc', now())
    where id = app_user_id;
  end if;

  -- Remove bootstrap customer role only for this newly provisioned invite user.
  delete from public.user_roles ur
  using public.roles r
  where ur.user_id = app_user_id
    and ur.role_id = r.id
    and r.code = 'customer';

  insert into public.user_roles (user_id, role_id, branch_id)
  select app_user_id, invite_row.role_id, invite_row.branch_id
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = app_user_id
      and ur.role_id = invite_row.role_id
      and ur.branch_id is not distinct from invite_row.branch_id
  );

  update public.staff_invites
  set
    status = 'accepted',
    accepted_at = timezone('utc', now()),
    accepted_user_id = app_user_id,
    token_hash = null,
    updated_at = timezone('utc', now())
  where id = invite_row.id;

  insert into public.staff_invite_events (invite_id, actor_user_id, event_type, payload)
  values (
    invite_row.id,
    app_user_id,
    'accept_succeeded',
    jsonb_build_object('auth_user_id', p_auth_user_id, 'role_code', role_code)
  );

  return app_user_id;
end;
$$;


ALTER FUNCTION "public"."finalize_staff_invite_acceptance"("p_invite_id" "uuid", "p_auth_user_id" "uuid", "p_full_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  meta_full_name text;
begin
  -- Safe full_name sources only. NEVER read role / user_type from metadata.
  meta_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  );

  perform public.ensure_customer_profile_for_auth_user(
    new.id,
    new.email,
    meta_full_name
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_auth_user_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_user_roles_client_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    raise exception 'Authenticated clients cannot mutate user_roles';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_user_roles_client_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_users_privilege_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'UPDATE' then
    if new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'auth_user_id cannot be changed';
    end if;

    if new.user_type is distinct from old.user_type
       and coalesce(current_setting('telepizza.allow_staff_provision', true), '') is distinct from 'on' then
      raise exception 'user_type cannot be changed by clients';
    end if;

    if new.password_hash is distinct from old.password_hash then
      raise exception 'password_hash cannot be changed for Supabase Auth users';
    end if;

    if new.status is distinct from old.status
       and coalesce(auth.role(), '') = 'authenticated'
       and coalesce(current_setting('telepizza.allow_staff_provision', true), '') is distinct from 'on' then
      raise exception 'status cannot be changed by authenticated clients';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_users_privilege_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_code" character varying(50) NOT NULL,
    "name" character varying(150) NOT NULL,
    "city" character varying(100) NOT NULL,
    "area" character varying(150),
    "address" "text" NOT NULL,
    "phone" character varying(30),
    "email" character varying(150),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "status" "text" DEFAULT 'operating'::"text" NOT NULL,
    "opening_hours" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "branches_status_check" CHECK (("status" = ANY (ARRAY['operating'::"text", 'coming-soon'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" character varying(150) NOT NULL,
    "phone" character varying(30) NOT NULL,
    "email" character varying(150),
    "date_of_birth" "date",
    "gender" character varying(30),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "marketing_consent" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "customers_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "rider_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "delivery_address" "text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_at" timestamp with time zone,
    "picked_up_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'picked-up'::"text", 'delivered'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(150) NOT NULL,
    "slug" character varying(150) NOT NULL,
    "description" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."menu_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_item_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "menu_item_id" "uuid" NOT NULL,
    "label" character varying(100) NOT NULL,
    "size_code" character varying(50),
    "price" numeric(12,2) NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."menu_item_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "slug" character varying(150) NOT NULL,
    "name" character varying(150) NOT NULL,
    "description" "text",
    "image_url" "text",
    "base_price" numeric(12,2),
    "badge" character varying(80),
    "product_type" character varying(50) DEFAULT 'food'::character varying NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "menu_items_product_type_check" CHECK ((("product_type")::"text" = ANY ((ARRAY['pizza'::character varying, 'burger'::character varying, 'sandwich'::character varying, 'wings'::character varying, 'fries'::character varying, 'wrap'::character varying, 'pasta'::character varying, 'side'::character varying, 'drink'::character varying, 'deal'::character varying, 'topping'::character varying])::"text"[])))
);


ALTER TABLE "public"."menu_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "menu_item_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "product_name" character varying(150) NOT NULL,
    "variant_name" character varying(100),
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "instructions" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "extras_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "food_unit_price" numeric(12,2),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "actor_type" "text" DEFAULT 'system'::"text" NOT NULL,
    "actor_user_id" "uuid",
    "reason_code" character varying(50),
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "order_status_logs_actor_type_check" CHECK (("actor_type" = ANY (ARRAY['customer'::"text", 'staff'::"text", 'system'::"text", 'guest'::"text"])))
);


ALTER TABLE "public"."order_status_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" character varying(100) NOT NULL,
    "customer_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "order_type" "text" NOT NULL,
    "order_source" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "delivery_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "contact_name" character varying(150) NOT NULL,
    "contact_phone" character varying(30) NOT NULL,
    "delivery_address" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "contact_phone_e164" character varying(20),
    "idempotency_key" character varying(100),
    "idempotency_request_hash" character varying(64),
    "pricing_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "cancel_reason_code" character varying(50),
    "cancel_note" "text",
    "auth_user_id" "uuid",
    CONSTRAINT "orders_order_source_check" CHECK (("order_source" = ANY (ARRAY['website'::"text", 'whatsapp'::"text", 'mobile'::"text", 'pos'::"text", 'admin'::"text"]))),
    CONSTRAINT "orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['delivery'::"text", 'pickup'::"text", 'dine-in'::"text"]))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'preparing'::"text", 'ready'::"text", 'dispatched'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."auth_user_id" IS 'Optional Supabase Auth identity for authenticated customer orders. Guest orders remain null; guest tracking stays API/phone-proof only.';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider_code" character varying(100),
    "payment_method" character varying(50) NOT NULL,
    "transaction_reference" character varying(150),
    "amount" numeric(12,2) NOT NULL,
    "currency" character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module" character varying(100) NOT NULL,
    "action" character varying(100) NOT NULL,
    "code" character varying(150) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "phone" "text",
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "full_name" character varying(150) NOT NULL,
    "phone" character varying(30) NOT NULL,
    "vehicle_type" character varying(50) NOT NULL,
    "vehicle_number" character varying(100),
    "status" "text" DEFAULT 'offline'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "riders_status_check" CHECK (("status" = ANY (ARRAY['offline'::"text", 'available'::"text", 'busy'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."riders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(100) NOT NULL,
    "description" "text",
    "is_system_role" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "employee_code" character varying(50) NOT NULL,
    "department" character varying(100) NOT NULL,
    "job_title" character varying(100) NOT NULL,
    "shift_name" character varying(100),
    "hire_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "staff_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_invite_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invite_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ip" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "staff_invite_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'sent'::"text", 'resent'::"text", 'revoked'::"text", 'accept_succeeded'::"text", 'accept_failed'::"text", 'expired_marked'::"text"])))
);


ALTER TABLE "public"."staff_invite_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(150) NOT NULL,
    "full_name" character varying(150) NOT NULL,
    "phone" character varying(30),
    "role_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "token_hash" "text",
    "token_expires_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "invited_by" "uuid",
    "accepted_user_id" "uuid",
    "send_count" integer DEFAULT 0 NOT NULL,
    "last_sent_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "staff_invites_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'accepted'::"text", 'revoked'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."staff_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "full_name" character varying(150) NOT NULL,
    "email" character varying(150),
    "phone" character varying(30),
    "password_hash" "text",
    "user_type" "text" DEFAULT 'customer'::"text" NOT NULL,
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "users_phone_e164_check" CHECK ((("phone" IS NULL) OR (("phone")::"text" ~ '^\+923[0-9]{9}$'::"text"))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'inactive'::"text", 'suspended'::"text"]))),
    CONSTRAINT "users_user_type_check" CHECK (("user_type" = ANY (ARRAY['customer'::"text", 'staff'::"text", 'rider'::"text", 'admin'::"text", 'support'::"text", 'franchise'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."phone" IS 'Optional Pakistani mobile in E.164 (+923XXXXXXXXX). Unverified until Slice 2C OTP. UNIQUE when present.';



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_branch_code_key" UNIQUE ("branch_code");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_categories"
    ADD CONSTRAINT "menu_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_menu_item_id_label_key" UNIQUE ("menu_item_id", "label");



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_transaction_reference_key" UNIQUE ("transaction_reference");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riders"
    ADD CONSTRAINT "riders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riders"
    ADD CONSTRAINT "riders_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."staff_invite_events"
    ADD CONSTRAINT "staff_invite_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_id_branch_id_key" UNIQUE ("user_id", "role_id", "branch_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_deliveries_branch_status" ON "public"."deliveries" USING "btree" ("branch_id", "status");



CREATE INDEX "idx_menu_item_variants_item_id" ON "public"."menu_item_variants" USING "btree" ("menu_item_id");



CREATE INDEX "idx_menu_items_category_id" ON "public"."menu_items" USING "btree" ("category_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_status_logs_order_id" ON "public"."order_status_logs" USING "btree" ("order_id", "created_at");



CREATE INDEX "idx_orders_auth_user_id" ON "public"."orders" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE INDEX "idx_orders_branch_status" ON "public"."orders" USING "btree" ("branch_id", "status");



CREATE INDEX "idx_orders_contact_phone_e164" ON "public"."orders" USING "btree" ("contact_phone_e164") WHERE ("contact_phone_e164" IS NOT NULL);



CREATE INDEX "idx_orders_customer_id" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_riders_branch_status" ON "public"."riders" USING "btree" ("branch_id", "status");



CREATE INDEX "idx_role_permissions_role_id" ON "public"."role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_staff_branch_status" ON "public"."staff" USING "btree" ("branch_id", "status");



CREATE INDEX "idx_staff_invite_events_invite_id" ON "public"."staff_invite_events" USING "btree" ("invite_id");



CREATE INDEX "idx_staff_invites_branch_id" ON "public"."staff_invites" USING "btree" ("branch_id");



CREATE INDEX "idx_staff_invites_email_lower" ON "public"."staff_invites" USING "btree" ("lower"(("email")::"text"));



CREATE INDEX "idx_staff_invites_status" ON "public"."staff_invites" USING "btree" ("status");



CREATE INDEX "idx_user_roles_branch_id" ON "public"."user_roles" USING "btree" ("branch_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "staff_invites_one_pending_email_uidx" ON "public"."staff_invites" USING "btree" ("lower"(("email")::"text")) WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "staff_invites_token_hash_uidx" ON "public"."staff_invites" USING "btree" ("token_hash") WHERE ("token_hash" IS NOT NULL);



CREATE UNIQUE INDEX "uq_orders_idempotency_key" ON "public"."orders" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "user_roles_user_role_global_uidx" ON "public"."user_roles" USING "btree" ("user_id", "role_id") WHERE ("branch_id" IS NULL);



CREATE UNIQUE INDEX "users_phone_e164_uidx" ON "public"."users" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_branches_updated_at" BEFORE UPDATE ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_deliveries_updated_at" BEFORE UPDATE ON "public"."deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_menu_categories_updated_at" BEFORE UPDATE ON "public"."menu_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_menu_item_variants_updated_at" BEFORE UPDATE ON "public"."menu_item_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_menu_items_updated_at" BEFORE UPDATE ON "public"."menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_permissions_updated_at" BEFORE UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_riders_updated_at" BEFORE UPDATE ON "public"."riders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_roles_updated_at" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_updated_at" BEFORE UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_enforce_staff_invite_rules" BEFORE INSERT OR UPDATE ON "public"."staff_invites" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_staff_invite_rules"();



CREATE OR REPLACE TRIGGER "trg_prevent_user_roles_client_mutation" BEFORE INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_user_roles_client_mutation"();



CREATE OR REPLACE TRIGGER "trg_prevent_users_privilege_escalation" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_users_privilege_escalation"();



CREATE OR REPLACE TRIGGER "trg_staff_invites_set_updated_at" BEFORE UPDATE ON "public"."staff_invites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."menu_item_variants"
    ADD CONSTRAINT "menu_item_variants_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_logs"
    ADD CONSTRAINT "order_status_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riders"
    ADD CONSTRAINT "riders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."riders"
    ADD CONSTRAINT "riders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_invite_events"
    ADD CONSTRAINT "staff_invite_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_invite_events"
    ADD CONSTRAINT "staff_invite_events_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."staff_invites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Authenticated can read role catalog codes" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Customers select own deliveries" ON "public"."deliveries" FOR SELECT TO "authenticated" USING ("public"."current_customer_owns_order"("order_id"));



CREATE POLICY "Customers select own order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ("public"."current_customer_owns_order"("order_id"));



CREATE POLICY "Customers select own order status logs" ON "public"."order_status_logs" FOR SELECT TO "authenticated" USING ("public"."current_customer_owns_order"("order_id"));



CREATE POLICY "Customers select own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("public"."current_user_is_active"() AND ((("auth_user_id" IS NOT NULL) AND ("auth_user_id" = "auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM ("public"."customers" "c"
     JOIN "public"."users" "u" ON (("u"."id" = "c"."user_id")))
  WHERE (("c"."id" = "orders"."customer_id") AND ("u"."auth_user_id" = "auth"."uid"()) AND ("u"."status" = 'active'::"text") AND ("u"."user_type" = 'customer'::"text")))))));



CREATE POLICY "Public can read active menu categories" ON "public"."menu_categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active menu items" ON "public"."menu_items" FOR SELECT USING (("is_available" = true));



CREATE POLICY "Public can read active menu variants" ON "public"."menu_item_variants" FOR SELECT USING (("is_available" = true));



CREATE POLICY "Public can read branches" ON "public"."branches" FOR SELECT USING (("status" <> 'inactive'::"text"));



CREATE POLICY "Staff select branch deliveries" ON "public"."deliveries" FOR SELECT TO "authenticated" USING ("public"."current_user_has_branch_access"("branch_id"));



CREATE POLICY "Staff select branch order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND "public"."current_user_has_branch_access"("o"."branch_id")))));



CREATE POLICY "Staff select branch order status logs" ON "public"."order_status_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_logs"."order_id") AND "public"."current_user_has_branch_access"("o"."branch_id")))));



CREATE POLICY "Staff select branch orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."current_user_has_branch_access"("branch_id"));



CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own role assignments" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "u"."id"
   FROM "public"."users" "u"
  WHERE ("u"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own allowed profile fields" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK ((("auth_user_id" = "auth"."uid"()) AND ("user_type" = 'customer'::"text") AND ("password_hash" IS NULL)));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_item_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_invite_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_app_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_customer_owns_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_customer_owns_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_customer_owns_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_customer_owns_order"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_branch_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_branch_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_branch_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_branch_ids"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_has_branch_access"("p_branch_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_has_branch_access"("p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_has_branch_access"("p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_has_branch_access"("p_branch_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_is_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_is_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_active"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_is_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_staff_invite_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_staff_invite_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_staff_invite_rules"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_customer_profile_for_auth_user"("p_auth_user_id" "uuid", "p_email" "text", "p_full_name_meta" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_customer_profile_for_auth_user"("p_auth_user_id" "uuid", "p_email" "text", "p_full_name_meta" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_customer_profile_for_auth_user"("p_auth_user_id" "uuid", "p_email" "text", "p_full_name_meta" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_customer_profile_for_auth_user"("p_auth_user_id" "uuid", "p_email" "text", "p_full_name_meta" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_staff_invite_acceptance"("p_invite_id" "uuid", "p_auth_user_id" "uuid", "p_full_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_staff_invite_acceptance"("p_invite_id" "uuid", "p_auth_user_id" "uuid", "p_full_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_staff_invite_acceptance"("p_invite_id" "uuid", "p_auth_user_id" "uuid", "p_full_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_staff_invite_acceptance"("p_invite_id" "uuid", "p_auth_user_id" "uuid", "p_full_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_auth_user_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_auth_user_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_user_roles_client_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_user_roles_client_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_user_roles_client_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_users_privilege_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_users_privilege_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_users_privilege_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."menu_categories" TO "anon";
GRANT ALL ON TABLE "public"."menu_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_categories" TO "service_role";



GRANT ALL ON TABLE "public"."menu_item_variants" TO "anon";
GRANT ALL ON TABLE "public"."menu_item_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_item_variants" TO "service_role";



GRANT ALL ON TABLE "public"."menu_items" TO "anon";
GRANT ALL ON TABLE "public"."menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_items" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_logs" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."riders" TO "anon";
GRANT ALL ON TABLE "public"."riders" TO "authenticated";
GRANT ALL ON TABLE "public"."riders" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_invite_events" TO "service_role";



GRANT ALL ON TABLE "public"."staff_invites" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







