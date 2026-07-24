/**
 * WARNING: This helper writes CLOUD / live backend env for the hosted Telepizza project.
 * It hardcodes SUPABASE_URL to *.supabase.co and production CORS.
 *
 * For LOCAL development, DO NOT use this script.
 * Use instead:
 *   npx supabase status -o env > .tmp/supabase.local.env
 *   node scripts/write-local-env-from-supabase.mjs .tmp/supabase.local.env
 *   node scripts/local-env-guard.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (process.env.TELEPIZZA_ALLOW_CLOUD_ENV_WRITE !== "1") {
  console.error(
    "REFUSED: write-backend-env.mjs targets cloud Supabase. Set TELEPIZZA_ALLOW_CLOUD_ENV_WRITE=1 to override, or use scripts/write-local-env-from-supabase.mjs",
  );
  process.exit(2);
}

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
    "API_CORS_ORIGIN=https://telepizza-website.vercel.app",
    "SUPABASE_URL=https://pyeowxvacgypohrbvgee.supabase.co",
    `SUPABASE_ANON_KEY=${anon.api_key}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service.api_key}`,
    "",
  ].join("\n"),
);

console.log("backend_env_written=true");
