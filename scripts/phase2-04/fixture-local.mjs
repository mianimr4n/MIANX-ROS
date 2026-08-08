import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const require = createRequire(resolve("backend/api/package.json"));
const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const hostname = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
if (!key || !["127.0.0.1", "localhost"].includes(hostname)) {
  throw new Error("PHASE2-04 fixture refused: local Supabase service credentials are required.");
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: organization } = await admin.from("organization_settings").select("organization_id").limit(1).single();
const { data: branches, error: branchError } = await admin.from("branches").select("id,name,status")
  .eq("organization_id", organization.organization_id).order("branch_code");
if (branchError || !branches?.length) throw branchError ?? new Error("Local branches missing");
const assigned = branches.find((branch) => branch.status === "operating") ?? branches[0];
const foreign = branches.find((branch) => branch.id !== assigned.id) ?? null;

async function createStaff(email, fullName, roleCode, branchId) {
  const { data: existing, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  for (const user of existing.users.filter((row) => row.email?.toLowerCase() === email)) {
    await admin.from("users").delete().eq("auth_user_id", user.id);
    await admin.auth.admin.deleteUser(user.id);
  }
  const password = `Local-${randomBytes(18).toString("base64url")}!9a`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) throw createError ?? new Error("Local auth creation failed");
  const { data: profile, error: profileError } = await admin.from("users").select("id")
    .eq("auth_user_id", created.user.id).single();
  const { data: role, error: roleError } = await admin.from("roles").select("id").eq("code", roleCode).single();
  if (profileError || roleError) throw profileError ?? roleError;
  const branchSql = branchId ? `'${branchId}'::uuid` : "null";
  const sql = `begin; select set_config('telepizza.allow_staff_provision','on',true); ` +
    `update public.users set user_type='admin',status='active' where id='${profile.id}'; ` +
    `delete from public.user_roles where user_id='${profile.id}'; ` +
    `insert into public.user_roles(user_id,role_id,branch_id,organization_id,assignment_status) ` +
    `values('${profile.id}','${role.id}',${branchSql},'${organization.organization_id}','ACTIVE'); commit;`;
  const applied = spawnSync("docker", ["exec", "supabase_db_telepizza-platform", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { stdio: "ignore", shell: false });
  if (applied.status !== 0) throw new Error(`Local ${roleCode} fixture assignment failed.`);
  return { email, password };
}

const owner = await createStaff("phase204.owner@telepizza.local", "PHASE2-04 Local Owner", "organization_owner", null);
const manager = await createStaff("phase204.manager@telepizza.local", "PHASE2-04 Local Manager", "branch_manager", assigned.id);
const output = resolve("scripts/.tmp_pw/phase2-04.local.json");
mkdirSync(resolve("scripts/.tmp_pw"), { recursive: true });
writeFileSync(output, JSON.stringify({ owner, manager, organizationId: organization.organization_id,
  assignedBranch: assigned, foreignBranch: foreign }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ok: true, target: "loopback", assignedBranchId: assigned.id,
  foreignBranchAvailable: Boolean(foreign), fixture: "scripts/.tmp_pw/phase2-04.local.json" }));
