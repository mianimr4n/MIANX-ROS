/**
 * Guard: fail if backend/website env points at cloud Supabase.
 * Usage: node scripts/local-env-guard.mjs
 * Exit 0 = local-safe (or missing env with warning)
 * Exit 2 = cloud binding detected
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

function classifyUrl(raw) {
  if (!raw) return { present: false, cloud: false, loopback: false, host: null };
  try {
    const u = new URL(raw);
    const host = u.hostname;
    return {
      present: true,
      host,
      cloud: host.endsWith(".supabase.co"),
      loopback: host === "127.0.0.1" || host === "localhost",
    };
  } catch {
    return { present: true, host: "invalid", cloud: false, loopback: false };
  }
}

const root = resolve(".");
const apiEnv = {
  ...loadEnv(resolve(root, "backend/api/.env")),
  ...loadEnv(resolve(root, "backend/api/.env.local")),
};
const webEnv = {
  ...loadEnv(resolve(root, "apps/website/.env")),
  ...loadEnv(resolve(root, "apps/website/.env.local")),
};

const checks = [
  { file: "backend/api/.env.local", key: "SUPABASE_URL", ...classifyUrl(apiEnv.SUPABASE_URL) },
  {
    file: "apps/website/.env.local",
    key: "VITE_SUPABASE_URL",
    ...classifyUrl(webEnv.VITE_SUPABASE_URL),
  },
];

const cloud = checks.filter((c) => c.cloud);
const missing = checks.filter((c) => !c.present);
const localOk = checks.filter((c) => c.loopback);

const report = {
  ok: cloud.length === 0 && localOk.length === checks.length,
  cloudBindings: cloud.map((c) => ({ file: c.file, key: c.key, hostClass: "supabase-cloud" })),
  localBindings: localOk.map((c) => ({ file: c.file, key: c.key, host: c.host })),
  missing: missing.map((c) => ({ file: c.file, key: c.key })),
  verdict:
    cloud.length > 0
      ? "FAIL — cloud Supabase binding detected; refuse local ERP testing"
      : localOk.length === checks.length
        ? "PASS — local loopback Supabase bindings"
        : "WARNING — incomplete local env",
};

console.log(JSON.stringify(report, null, 2));
process.exit(cloud.length > 0 ? 2 : report.ok ? 0 : 1);
