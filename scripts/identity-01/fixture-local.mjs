import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const require = createRequire(resolve("backend/api/package.json"));
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
if (!key || !["127.0.0.1", "localhost"].includes(host)) {
  throw new Error("IDENTITY-01 fixture refused: SUPABASE_URL must be loopback and service role must be supplied.");
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const email = "identity01.platform@telepizza.local";
const password = `Local-${randomBytes(18).toString("base64url")}!9a`;

const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
for (const user of existingUsers.users.filter((row) => row.email?.toLowerCase() === email)) {
  await admin.from("users").delete().eq("auth_user_id", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
await admin.from("users").delete().ilike("email", email);

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "IDENTITY-01 Local Platform" },
});
if (createError || !created.user) throw createError ?? new Error("Local platform auth creation failed");

const { data: profile, error: profileError } = await admin.from("users").select("id").eq("auth_user_id", created.user.id).single();
if (profileError) throw profileError;

const { data: role, error: roleError } = await admin.from("roles").select("id").eq("code", "super-admin").single();
if (roleError) throw roleError;
const promoteSql = `begin; select set_config('telepizza.allow_staff_provision','on',true); update public.users set user_type='admin',status='active' where id='${profile.id}'; delete from public.user_roles where user_id='${profile.id}'; insert into public.user_roles(user_id,role_id,branch_id,organization_id,assignment_status) values('${profile.id}','${role.id}',null,null,'ACTIVE'); commit;`;
const promoted = spawnSync("docker", ["exec", "supabase_db_telepizza-platform", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", promoteSql], { stdio: "ignore", shell: false });
if (promoted.status !== 0) throw new Error("Local platform promotion failed inside local Supabase.");

const { data: organizations, error: organizationError } = await admin.from("organization_settings").select("organization_id").limit(1);
if (organizationError || !organizations?.[0]) throw organizationError ?? new Error("Local organization missing");
const organizationId = organizations[0].organization_id;
const { data: branches, error: branchError } = await admin.from("branches").select("id,name").eq("organization_id", organizationId).eq("status", "operating").order("branch_code").limit(2);
if (branchError || !branches?.length) throw branchError ?? new Error("Local operating branch missing");

const output = resolve("scripts/.tmp_pw/identity-01.local.json");
mkdirSync(resolve("scripts/.tmp_pw"), { recursive: true });
writeFileSync(output, JSON.stringify({ platform: { email, password }, organizationId, branches }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ok: true, target: "loopback", organizationId, branchCount: branches.length, fixture: "scripts/.tmp_pw/identity-01.local.json" }));
