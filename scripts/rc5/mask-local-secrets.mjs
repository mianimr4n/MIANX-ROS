/**
 * Mask sensitive values from a local env or handover JSON for GitHub Actions.
 * Prints ::add-mask:: lines only — never prints the values in cleartext logs beyond the mask directive.
 *
 * Usage:
 *   node scripts/rc5/mask-local-secrets.mjs env .tmp/supabase.local.env
 *   node scripts/rc5/mask-local-secrets.mjs handover scripts/.tmp_pw/staff-handover.local.json
 */
import { existsSync, readFileSync } from "node:fs";

const mode = process.argv[2];
const path = process.argv[3];

if (!mode || !path || !existsSync(path)) {
  console.error("Usage: node scripts/rc5/mask-local-secrets.mjs env|handover <path>");
  process.exit(2);
}

function mask(value) {
  if (!value || typeof value !== "string") return;
  if (value.length < 8) return;
  // GitHub Actions masking
  console.log(`::add-mask::${value}`);
}

if (mode === "env") {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (/KEY|SECRET|PASSWORD|TOKEN|JWT/i.test(k)) mask(v);
  }
  process.exit(0);
}

if (mode === "handover") {
  const h = JSON.parse(readFileSync(path, "utf8"));
  for (const a of h.accounts || []) {
    mask(a.password);
    mask(a.temporaryPassword);
  }
  process.exit(0);
}

console.error("Unknown mode");
process.exit(2);
