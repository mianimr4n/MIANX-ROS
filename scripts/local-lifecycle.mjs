/**
 * Local lifecycle helpers — refuse remote targets.
 * Usage:
 *   node scripts/local-lifecycle.mjs start|stop|reset|status
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const action = process.argv[2] || "status";

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  return spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
}

function assertNotCloudEnvFiles() {
  const guard = spawnSync(process.execPath, ["scripts/local-env-guard.mjs"], {
    encoding: "utf8",
  });
  if (guard.status === 2) {
    console.error("REFUSED: cloud Supabase bindings in .env.local — rewrite with pnpm local:env first.");
    process.exit(2);
  }
}

mkdirSync(".tmp", { recursive: true });

if (action === "start") {
  const docker = run("docker", ["info"], { stdio: "pipe" });
  if (docker.status !== 0) {
    console.error("Docker is required for local Supabase.");
    process.exit(1);
  }
  const sb = run("npx", ["supabase", "start"]);
  process.exit(sb.status ?? 1);
}

if (action === "stop") {
  const sb = run("npx", ["supabase", "stop"]);
  process.exit(sb.status ?? 1);
}

if (action === "reset") {
  assertNotCloudEnvFiles();
  console.log("Resetting LOCAL Supabase database (migrations re-applied). This does not touch cloud.");
  const sb = run("npx", ["supabase", "db", "reset"]);
  if ((sb.status ?? 1) !== 0) process.exit(sb.status ?? 1);
  console.log("Re-seed with: pnpm local:seed");
  process.exit(0);
}

if (action === "status") {
  run("npx", ["supabase", "status"]);
  process.exit(0);
}

console.error("Usage: node scripts/local-lifecycle.mjs start|stop|reset|status");
process.exit(1);
