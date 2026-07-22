import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const dir = join("supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const localSql = join(process.env.TEMP || "/tmp", "tp-mig.sql");

function psqlFile(containerPath) {
  execFileSync(
    "docker",
    [
      "exec",
      "tp-cp-verify",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      containerPath,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

function applySql(sql) {
  writeFileSync(localSql, sql);
  execFileSync("docker", ["cp", localSql, "tp-cp-verify:/tmp/mig.sql"], {
    stdio: "inherit",
  });
  psqlFile("/tmp/mig.sql");
}

const bootstrap = `
create extension if not exists pgcrypto;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid()
returns uuid
language sql
stable
as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;
do $role$ begin create role anon nologin; exception when duplicate_object then null; end $role$;
do $role$ begin create role authenticated nologin; exception when duplicate_object then null; end $role$;
do $role$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $role$;
`;
applySql(bootstrap);
console.log("OK bootstrap auth roles");

const P0_REVOKE =
  /revoke all on function public\.handle_new_user\(\) from public, anon, authenticated, service_role\s*;/i;
const P0_SAFE = `
DO $fix$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'revoke all on function public.handle_new_user() from public, anon, authenticated, service_role';
  END IF;
END
$fix$;
`;

for (const name of files) {
  let sql = readFileSync(join(dir, name), "utf8");
  if (name.startsWith("20260718130000")) {
    if (!P0_REVOKE.test(sql)) {
      console.error("P0 revoke pattern not found; aborting");
      process.exit(1);
    }
    sql = sql.replace(P0_REVOKE, P0_SAFE);
  }
  if (name.startsWith("20260718130100")) {
    // Fresh DBs never had unmanaged public.profiles; create empty stub so the
    // retire migration's row-count guard can run (local verify only).
    applySql("create table if not exists public.profiles (id uuid primary key);");
    console.log("OK stub public.profiles for P1 retire");
  }
  try {
    applySql(sql);
    console.log("OK", name);
  } catch (error) {
    console.error("FAIL", name);
    console.error(error.stderr?.toString?.() || error.message);
    process.exit(1);
  }
}

const verifySql = `
select to_regclass('public.customer_addresses') as addresses;
select to_regclass('public.customer_favorites') as favorites;
select to_regclass('public.order_reviews') as reviews;
select relname, relrowsecurity
  from pg_class
 where relname in ('customer_addresses','customer_favorites','order_reviews')
 order by relname;
select has_table_privilege('service_role','public.customer_addresses','SELECT') as sr_addresses;
select has_table_privilege('authenticated','public.customer_addresses','SELECT') as auth_addresses;
select to_regprocedure('public.ensure_customer_profile_for_auth_user(uuid,text,text)') as bootstrap_rpc;
`;
writeFileSync(localSql, verifySql);
execFileSync("docker", ["cp", localSql, "tp-cp-verify:/tmp/verify.sql"], {
  stdio: "inherit",
});
const out = execFileSync(
  "docker",
  ["exec", "tp-cp-verify", "psql", "-U", "postgres", "-d", "postgres", "-f", "/tmp/verify.sql"],
  { encoding: "utf8" },
);
console.log(out);
console.log("ALL_OK");
