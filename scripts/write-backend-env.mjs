import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const keysPath = join(tmpdir(), "supabase-keys.json");
const payload = JSON.parse(readFileSync(keysPath, "utf8"));
const keys = payload.api_keys ?? payload;
const anon = keys.find((entry) => entry.name === "anon");
const service = keys.find((entry) => entry.name === "service_role");

if (!anon?.api_key || !service?.api_key) {
  console.error("Missing Supabase API keys in CLI output.");
  process.exit(1);
}

writeFileSync(
  "backend/api/.env.local",
  [
    "API_JWT_SECRET=telepizza-live-jwt-secret-2026",
    "API_PORT=4000",
    "API_CORS_ORIGIN=https://telepizza-rose.vercel.app",
    "SUPABASE_URL=https://pyeowxvacgypohrbvgee.supabase.co",
    `SUPABASE_ANON_KEY=${anon.api_key}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service.api_key}`,
    "",
  ].join("\n"),
);

console.log("backend_env_written=true");
