/**
 * RC3 Integration — cross-module reconciliation (SQL against local DB).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("docs/testing/acceptance-evidence/rc3-integration-certification");
const DB = "supabase_db_telepizza-platform";
mkdirSync(OUT, { recursive: true });

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-t", "-A"],
    { input: sql, encoding: "utf8" },
  ).trim();
}

const report = {
  ok: false,
  generatedAt: new Date().toISOString(),
  checks: [],
  failures: [],
  metrics: {},
};

function check(id, pass, detail, metric) {
  report.checks.push({ id, pass, detail });
  if (metric !== undefined) report.metrics[id] = metric;
  if (!pass) report.failures.push({ id, detail });
}

try {
  const bal = psql(
    `SELECT COALESCE(SUM(debit),0)::text || ',' || COALESCE(SUM(credit),0)::text FROM journal_entry_lines;`,
  );
  const [debit, credit] = bal.split(",").map(Number);
  check(
    "finance.journalBalance",
    Math.abs(debit - credit) < 0.0001,
    `debit=${debit} credit=${credit}`,
    { debit, credit },
  );

  // Supplier response supplier matches PO supplier
  const mismatch = Number(
    psql(`
SELECT COUNT(*)::text
FROM purchase_order_responses r
JOIN purchase_orders po ON po.id = r.purchase_order_id
WHERE r.supplier_id IS NOT NULL AND po.supplier_id IS NOT NULL AND r.supplier_id <> po.supplier_id;
`),
  );
  check("supplier.responseMatchesPo", mismatch === 0, `mismatches=${mismatch}`, mismatch);

  // Portal users unique active mapping
  const dupPortal = Number(
    psql(`
SELECT COUNT(*)::text FROM (
  SELECT user_id FROM supplier_portal_users WHERE status = 'active' GROUP BY user_id HAVING COUNT(*) > 1
) d;
`),
  );
  check("supplier.uniqueActiveUsers", dupPortal === 0, `dups=${dupPortal}`, dupPortal);

  // Loyalty idempotency uniqueness if table exists
  const loyaltyIdem = Number(
    psql(`
SELECT COUNT(*)::text FROM pg_indexes
WHERE schemaname='public' AND indexdef ILIKE '%idempotency%';
`),
  );
  check("loyalty.idempotencyIndexesPresent", loyaltyIdem >= 1, `indexes=${loyaltyIdem}`, loyaltyIdem);

  // Coupon redemptions table exists and has rows or zero honestly
  const couponCount = Number(psql(`SELECT COUNT(*)::text FROM coupon_redemptions;`));
  check("coupons.redemptionsReadable", Number.isFinite(couponCount), `count=${couponCount}`, couponCount);

  // Finance postings uniqueness
  const finUniq = Number(
    psql(`
SELECT COUNT(*)::text FROM pg_constraint
WHERE contype IN ('u','p') AND conrelid = 'finance_postings'::regclass;
`),
  );
  check("finance.postingsConstrained", finUniq >= 1, `constraints=${finUniq}`, finUniq);

  // Cross-supplier documents
  const crossDoc = Number(
    psql(`
SELECT COUNT(*)::text
FROM supplier_documents d
JOIN purchase_orders po ON po.id = d.purchase_order_id
WHERE d.purchase_order_id IS NOT NULL
  AND d.supplier_id IS NOT NULL AND po.supplier_id IS NOT NULL
  AND d.supplier_id <> po.supplier_id;
`),
  );
  check("supplier.noCrossDocs", crossDoc === 0, `cross=${crossDoc}`, crossDoc);
} catch (err) {
  report.failures.push({ id: "reconciliation.setup", detail: String(err?.message ?? err).slice(0, 400) });
}

report.ok = report.failures.length === 0;
writeFileSync(resolve(OUT, "reconciliation-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.checks.filter((c) => c.pass).length, failed: report.failures.length, failures: report.failures }, null, 2));
process.exitCode = report.ok ? 0 : 1;
