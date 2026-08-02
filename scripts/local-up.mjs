/**
 * Local startup helper — orchestrates documented steps; does not invent Docker Compose.
 * Usage: node scripts/local-up.mjs
 *
 * Safe: refuses to continue if cloud env detected (after optional env write).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  // Prefer no shell for node scripts so exit codes are reliable on Windows.
  const useShell = opts.shell ?? process.platform === "win32";
  return spawnSync(cmd, args, { stdio: "inherit", shell: useShell, ...opts });
}

const report = {
  createdAt: new Date().toISOString(),
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

console.log("Telepizza local-up (documentation-driven orchestrator)");
console.log("This does NOT mutate cloud. It prepares/checks local tooling.\n");

// 1) Docker
const docker = run("docker", ["info"], { stdio: "pipe" });
step("docker-daemon", docker.status === 0, docker.status === 0 ? "running" : "start Docker Desktop / dockerd");

// 2) Supabase CLI
let supabaseCmd = "supabase";
let sb = run(supabaseCmd, ["--version"], { stdio: "pipe" });
if (sb.status !== 0) {
  supabaseCmd = "npx supabase";
  sb = run("npx", ["supabase", "--version"], { stdio: "pipe" });
}
step("supabase-cli", sb.status === 0, sb.status === 0 ? "available" : "install supabase CLI");

// 3) Env guard (current tree)
const guard = spawnSync(process.execPath, ["scripts/local-env-guard.mjs"], {
  encoding: "utf8",
  cwd: resolve("."),
});
const guardOut = `${guard.stdout || ""}${guard.stderr || ""}`;
const guardCode = typeof guard.status === "number" ? guard.status : 1;
step(
  "env-guard",
  guardCode === 0,
  guardCode === 2
    ? "CLOUD BINDING — rewrite env from local supabase status before ERP testing"
    : guardCode === 0
      ? "local bindings"
      : "incomplete env",
);
if (guardOut.trim()) console.log(guardOut);

// 4) Guidance only — do not auto-start supabase without operator (can pull images)
console.log(`
Next manual commands (Windows / local):

  1) Ensure Docker is running
  2) From repo root:
       npx supabase start
  3) Export status:
       npx supabase status -o env > .tmp/supabase.local.env
  4) Write local app env (refuses cloud):
       node scripts/write-local-env-from-supabase.mjs .tmp/supabase.local.env
  5) Privileges are migration-managed (see AGENTS.md):
       baseline 20260714120000_grant_public_access + harden 20260718130000_p0_harden…
       if migration state looks stale → pnpm local:reset
       persistent 42501 → investigate role/table/action (do not blanket GRANT)
       Production privilege changes are not part of local startup
  6) Start API + website:
       pnpm --filter @telepizza/api dev
       pnpm dev:website
  7) Health:
       node scripts/local-health-check.mjs
  8) Seed staff/orders for KDS (local only):
       see docs/infrastructure/LOCAL_SEED_DATA_GUIDE.md
`);

report.verdict =
  docker.status === 0 && sb.status === 0
    ? guard.status === 0
      ? "READY_TO_RUN_SERVICES"
      : "TOOLING_OK_ENV_NEEDS_LOCAL_REWRITE"
    : "TOOLING_MISSING";

mkdirSync(".tmp", { recursive: true });
writeFileSync(resolve(".tmp/local-up-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, steps: report.steps }, null, 2));
process.exit(report.verdict === "TOOLING_MISSING" ? 1 : 0);
