/**
 * Write LOCAL backend + website env from `supabase status -o env` (or JSON).
 * Refuses to write cloud hosts.
 *
 * Usage:
 *   supabase status -o env > .tmp/supabase.local.env
 *   node scripts/write-local-env-from-supabase.mjs .tmp/supabase.local.env
 *
 * Or pass path to `supabase status -o json` dump.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const inputPath = process.argv[2];
if (!inputPath || !existsSync(inputPath)) {
  console.error("Usage: node scripts/write-local-env-from-supabase.mjs <supabase-status.env|json>");
  process.exit(1);
}

function parseEnvFile(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
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

function backupIfCloud(path, urlKey) {
  if (!existsSync(path)) return null;
  const env = parseEnvFile(readFileSync(path, "utf8"));
  const url = env[urlKey];
  if (!url) return null;
  try {
    if (!new URL(url).hostname.endsWith(".supabase.co")) return null;
  } catch {
    return null;
  }
  mkdirSync(resolve(".tmp"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bak = resolve(`.tmp/${path.replace(/[\\/]/g, "_")}.cloud.bak.${stamp}`);
  renameSync(path, bak);
  return bak;
}

const raw = readFileSync(inputPath, "utf8");
let status = {};
if (raw.trim().startsWith("{")) {
  const json = JSON.parse(raw);
  status = {
    API_URL: json.API_URL || json.apiUrl,
    ANON_KEY: json.ANON_KEY || json.anonKey,
    SERVICE_ROLE_KEY: json.SERVICE_ROLE_KEY || json.serviceRoleKey,
    DB_URL: json.DB_URL || json.dbUrl,
  };
} else {
  status = parseEnvFile(raw);
}

const apiUrl = status.API_URL || status.SUPABASE_URL || "http://127.0.0.1:54321";
const anon = status.ANON_KEY || status.SUPABASE_ANON_KEY;
const service = status.SERVICE_ROLE_KEY || status.SUPABASE_SERVICE_ROLE_KEY;

let host;
try {
  host = new URL(apiUrl).hostname;
} catch {
  console.error("Invalid API_URL");
  process.exit(1);
}

if (host.endsWith(".supabase.co")) {
  console.error("REFUSED: status URL is cloud Supabase. Start local `supabase start` first.");
  process.exit(2);
}
if (host !== "127.0.0.1" && host !== "localhost") {
  console.error(`REFUSED: expected loopback host, got ${host}`);
  process.exit(2);
}
if (!anon || !service) {
  console.error("Missing ANON_KEY / SERVICE_ROLE_KEY in status output (use classic JWT keys).");
  process.exit(1);
}

const backendPath = resolve("backend/api/.env.local");
const websitePath = resolve("apps/website/.env.local");
const backups = [
  backupIfCloud(backendPath, "SUPABASE_URL"),
  backupIfCloud(websitePath, "VITE_SUPABASE_URL"),
].filter(Boolean);

writeFileSync(
  backendPath,
  [
    "# GENERATED for LOCAL Supabase — do not point at *.supabase.co",
    "TELEPIZZA_ENV=local",
    "API_JWT_SECRET=telepizza-local-jwt-secret-min-16",
    "API_PORT=4000",
    "API_CORS_ORIGIN=http://localhost:3000",
    `SUPABASE_URL=${apiUrl}`,
    `SUPABASE_ANON_KEY=${anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    "TELEPIZZA_REQUIRE_LOCAL_SUPABASE=1",
    "TELEPIZZA_EMAIL_MODE=mock",
    "TELEPIZZA_WHATSAPP_MODE=disabled",
    "TELEPIZZA_PAYMENT_MODE=mock",
    "TELEPIZZA_WEBHOOK_MODE=disabled",
    "",
  ].join("\n"),
);

writeFileSync(
  websitePath,
  [
    "# GENERATED for LOCAL Supabase — do not point at *.supabase.co",
    "VITE_API_BASE_URL=http://localhost:4000/api/v1",
    `VITE_SUPABASE_URL=${apiUrl}`,
    `VITE_SUPABASE_ANON_KEY=${anon}`,
    "",
  ].join("\n"),
);

mkdirSync(dirname(resolve(".tmp/local-env-written.json")), { recursive: true });
writeFileSync(
  resolve(".tmp/local-env-written.json"),
  JSON.stringify(
    {
      writtenAt: new Date().toISOString(),
      backendPath,
      websitePath,
      supabaseHost: host,
      supabaseUrl: apiUrl,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      backendPath,
      websitePath,
      supabaseHost: host,
      cloudBackups: backups,
      note: "Restart API + Vite to pick up env. Run: node scripts/local-env-guard.mjs",
    },
    null,
    2,
  ),
);
