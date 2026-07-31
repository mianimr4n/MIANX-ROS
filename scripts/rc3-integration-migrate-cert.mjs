/**
 * RC3 Integration — migration certification (local Supabase only).
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("docs/testing/acceptance-evidence/rc3-integration-certification");
const DB = "supabase_db_telepizza-platform";
mkdirSync(OUT, { recursive: true });

const RC3_GLOBS = [
  /^202607301[3-9]/,
  /^202607302/,
  /^20260731/,
];

const expectedTables = [
  "cash_reconciliations",
  "expense_claims",
  "finance_postings",
  "finance_account_mappings",
  "supplier_invoices",
  "supplier_payments",
  "journal_entries",
  "goods_receiving",
  "supplier_portal_users",
  "purchase_order_responses",
  "supplier_portal_events",
  "coupon_redemptions",
];

const report = {
  ok: false,
  cleanInstall: { ok: false, logPath: null, error: null },
  repeatability: { ok: false, error: null },
  grantsApplied: false,
  staticScan: { ok: false, findings: [] },
  schema: { ok: false, checks: [], failures: [] },
  migrationOrder: [],
  upgradePath: {
    status: "STATIC_ADDITIVE_REVIEW",
    note: "RC3 migrations reviewed as additive; live upgrade-from-pre-RC3 snapshot not restored on this host. Clean-install + repeatability used as primary proof.",
  },
  productionRisk: "medium-high (many interdependent RPCs; require backup + maintenance window)",
  containment: "Stop API writes; restore DB backup; do not re-run partial migrations; escalate Founder + Chief Architect.",
};

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-t", "-A"],
    { input: sql, encoding: "utf8" },
  ).trim();
}

function applyGrants() {
  psql(`
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
`);
  report.grantsApplied = true;
}

const migDir = resolve("supabase/migrations");
const allMigs = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
report.migrationOrder = allMigs;
const rc3Files = allMigs.filter((f) => RC3_GLOBS.some((re) => re.test(f)));

const dangerous = [
  { re: /DROP\s+TABLE\s+(?!IF\s+EXISTS)/i, label: "DROP TABLE without IF EXISTS" },
  { re: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  { re: /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i, label: "DISABLE RLS" },
];
for (const f of rc3Files) {
  const body = readFileSync(resolve(migDir, f), "utf8");
  for (const d of dangerous) {
    if (d.re.test(body)) report.staticScan.findings.push({ file: f, issue: d.label });
  }
}
report.staticScan.ok = report.staticScan.findings.length === 0;
writeFileSync(resolve(OUT, "rc3-migration-order.json"), JSON.stringify({ all: allMigs, rc3: rc3Files }, null, 2));

function validateSchema() {
  const checks = [];
  const failures = [];
  for (const t of expectedTables) {
    const row = psql(`
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${t}')::text
 || ',' ||
 COALESCE((SELECT relrowsecurity::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='${t}'),'missing');
`);
    const [exists, rls] = row.split(",");
    const pass = exists === "true" && rls === "true";
    checks.push({ id: `table:${t}`, exists, rls, pass });
    if (exists !== "true") failures.push(`missing table ${t}`);
    else if (rls !== "true") failures.push(`RLS off on ${t}`);
  }

  // Policy inventory sample
  const policies = psql(`
SELECT count(*)::text FROM pg_policies WHERE schemaname='public';
`);
  checks.push({ id: "policy_count", count: Number(policies), pass: Number(policies) > 0 });

  // Idempotency / unique constraints spot checks
  const uniq = psql(`
SELECT count(*)::text FROM pg_constraint
WHERE contype='u' AND conrelid::regclass::text IN ('purchase_order_responses','finance_postings','coupon_redemptions');
`);
  checks.push({ id: "uniq_spot", count: Number(uniq), pass: Number(uniq) >= 1 });

  report.schema = { ok: failures.length === 0, checks, failures, policyCount: Number(policies) };
  writeFileSync(resolve(OUT, "schema-validation.json"), JSON.stringify(report.schema, null, 2));
}

function resetLocal() {
  return execSync("npx supabase db reset --local", {
    encoding: "utf8",
    cwd: resolve("."),
    timeout: 600_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  console.log("Clean install: npx supabase db reset --local");
  const log = resetLocal();
  writeFileSync(resolve(OUT, "migration-clean-install.log"), log);
  report.cleanInstall = { ok: true, logPath: "migration-clean-install.log", error: null };
  applyGrants();
  validateSchema();
} catch (err) {
  const msg = `${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message ?? err}`;
  writeFileSync(resolve(OUT, "migration-clean-install.log"), msg);
  report.cleanInstall = { ok: false, logPath: "migration-clean-install.log", error: String(err.message ?? err).slice(0, 500) };
}

if (report.cleanInstall.ok) {
  try {
    console.log("Repeatability: second db reset --local");
    const log2 = resetLocal();
    writeFileSync(resolve(OUT, "migration-repeatability.log"), log2);
    report.repeatability = { ok: true, error: null };
    applyGrants();
    validateSchema();
  } catch (err) {
    report.repeatability = { ok: false, error: String(err.message ?? err).slice(0, 500) };
  }
}

report.ok =
  report.cleanInstall.ok &&
  report.repeatability.ok &&
  report.staticScan.ok &&
  report.schema.ok;

writeFileSync(resolve(OUT, "migration-certification.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: report.ok,
  cleanInstall: report.cleanInstall.ok,
  repeatability: report.repeatability.ok,
  staticScan: report.staticScan.ok,
  schema: report.schema.ok,
  failures: report.schema.failures,
  staticFindings: report.staticScan.findings,
}, null, 2));
process.exitCode = report.ok ? 0 : 1;
