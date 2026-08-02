/**
 * Load a local KEY=VALUE env file into process.env, then spawn a command.
 * Never prints secret values.
 *
 * Usage:
 *   node scripts/rc5/run-with-local-env.mjs backend/api/.env.local -- <cmd> [args...]
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = process.argv[2];
const sep = process.argv.indexOf("--");
const cmdArgs = sep >= 0 ? process.argv.slice(sep + 1) : process.argv.slice(3);

if (!envPath || cmdArgs.length === 0) {
  console.error("Usage: node scripts/rc5/run-with-local-env.mjs <env-file> -- <cmd> [args...]");
  process.exit(2);
}

const abs = resolve(envPath);
if (!existsSync(abs)) {
  console.error(`Missing env file: ${abs}`);
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(abs, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = v;
}

const url = env.SUPABASE_URL || "";
try {
  const host = new URL(url).hostname;
  if (host.endsWith(".supabase.co") || host.includes("onrender") || host.includes("vercel")) {
    console.error("REFUSED: env file points at non-local / Production-like host");
    process.exit(2);
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(`REFUSED: expected loopback SUPABASE_URL host, got ${host}`);
    process.exit(2);
  }
} catch {
  console.error("REFUSED: invalid SUPABASE_URL in env file");
  process.exit(2);
}

const [cmd, ...args] = cmdArgs;
const child = spawn(cmd, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
