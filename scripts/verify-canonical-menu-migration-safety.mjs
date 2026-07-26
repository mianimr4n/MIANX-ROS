/**
 * Phase 11 — migration safety, idempotency and failure-rollback evidence.
 *
 * LOCAL SCRATCH ONLY. Re-applies the canonical menu migrations against the
 * scratch database (default: menu_canon) and records counts before/after.
 * Never targets production and never drops anything.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTAINER = "supabase_db_telepizza-platform";
const dbIndex = process.argv.indexOf("--db");
const DB = dbIndex >= 0 ? process.argv[dbIndex + 1] : "menu_canon";

const MIGRATIONS = [
  "supabase/migrations/20260725130000_canonical_single_price_menu_domain.sql",
  "supabase/migrations/20260725140000_canonical_menu_price_audit_atomic.sql",
];

const FORBIDDEN = [
  { label: "TRUNCATE", re: /\btruncate\b/i },
  { label: "DROP menu_item_variants", re: /drop\s+table[^\n;]*menu_item_variants/i },
  { label: "DELETE FROM orders", re: /delete\s+from\s+public\.orders/i },
  { label: "DELETE FROM order_items", re: /delete\s+from\s+public\.order_items/i },
  { label: "branch status update", re: /update\s+public\.branches[^\n;]*status/i },
  { label: "auth user insert", re: /insert\s+into\s+auth\.users/i },
];

function psql(args, db = DB) {
  return spawnSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-d", db, ...args], {
    encoding: "utf8",
  });
}

function counts(db = DB) {
  const res = psql([
    "-t",
    "-A",
    "-F",
    "|",
    "-c",
    `select
       (select count(*) from menu_categories),
       (select count(*) from menu_items),
       (select count(*) from menu_variant_sku_mappings),
       (select count(*) from menu_item_variants),
       (select count(*) from orders),
       (select count(*) from order_items),
       (select count(*) from order_item_modifiers),
       (select count(*) from menu_items where price is null),
       (select count(*) from menu_items where price < 0),
       (select count(distinct slug) from menu_items);`,
  ], db);
  const line = (res.stdout || "").trim().split("\n").pop() ?? "";
  const [
    categories, items, mappings, variants, orders, orderItems, orderModifiers, nullPrices, negativePrices, distinctSlugs,
  ] = line.split("|").map((n) => Number(n));
  return { categories, items, mappings, variants, orders, orderItems, orderModifiers, nullPrices, negativePrices, distinctSlugs };
}

function applyMigrations(label) {
  const results = [];
  for (const rel of MIGRATIONS) {
    const abs = join(root, rel);
    const copy = spawnSync("docker", ["cp", abs, `${CONTAINER}:/tmp/${rel.split("/").pop()}`], { encoding: "utf8" });
    if (copy.status !== 0) throw new Error(`docker cp failed: ${copy.stderr}`);
    const run = psql(["-v", "ON_ERROR_STOP=1", "-f", `/tmp/${rel.split("/").pop()}`]);
    results.push({ pass: label, migration: rel, exitCode: run.status, stderrTail: (run.stderr || "").trim().slice(-400) });
    if (run.status !== 0) break;
  }
  return results;
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

const staticReview = MIGRATIONS.map((rel) => {
  const sql = stripSqlComments(readFileSync(join(root, rel), "utf8"));
  return {
    migration: rel,
    note: "SQL comments stripped before scanning so documentation of the rule is not a violation",
    forbiddenFound: FORBIDDEN.filter((f) => f.re.test(sql)).map((f) => f.label),
  };
});

const before = counts();
const firstReapply = applyMigrations("reapply-1");
const afterFirst = counts();
const secondReapply = applyMigrations("reapply-2");
const afterSecond = counts();

// Induced failure rollback: a migration-shaped transaction must roll back fully.
const rollbackSql = `
begin;
alter table public.menu_items add column if not exists __rollback_probe text;
update public.menu_items set price = price + 1;
do $$ begin raise exception 'INDUCED_MIGRATION_FAILURE'; end $$;
commit;
`;
const rollbackRun = psql(["-v", "ON_ERROR_STOP=0", "-c", rollbackSql]);
const afterRollback = counts();
const probe = psql([
  "-t",
  "-A",
  "-c",
  "select count(*) from information_schema.columns where table_name='menu_items' and column_name='__rollback_probe';",
]);

const sumPrices = (db = DB) =>
  Number((psql(["-t", "-A", "-c", "select coalesce(sum(price),0) from menu_items;"], db).stdout || "0").trim());

const evidence = {
  generatedAt: new Date().toISOString(),
  scope: "LOCAL SCRATCH ONLY — production migration NOT APPLIED",
  database: DB,
  staticReview,
  before,
  firstReapply,
  afterFirst,
  secondReapply,
  afterSecond,
  idempotent:
    JSON.stringify(afterFirst) === JSON.stringify(afterSecond) &&
    afterSecond.items === afterFirst.items &&
    afterSecond.mappings === afterFirst.mappings,
  noDataLoss:
    afterSecond.orders >= before.orders &&
    afterSecond.orderItems >= before.orderItems &&
    afterSecond.orderModifiers >= before.orderModifiers &&
    afterSecond.variants >= before.variants,
  priceIntegrity: {
    nullPrices: afterSecond.nullPrices,
    negativePrices: afterSecond.negativePrices,
    duplicateSlugs: afterSecond.items - afterSecond.distinctSlugs,
  },
  inducedFailure: {
    exitCode: rollbackRun.status,
    sawInducedError: /INDUCED_MIGRATION_FAILURE/.test(rollbackRun.stderr || rollbackRun.stdout || ""),
    probeColumnPresent: Number((probe.stdout || "0").trim()) > 0,
    countsUnchanged: JSON.stringify(afterRollback) === JSON.stringify(afterSecond),
    priceSum: sumPrices(),
  },
  productionApplied: false,
};

evidence.gate =
  evidence.idempotent &&
  evidence.noDataLoss &&
  evidence.priceIntegrity.nullPrices === 0 &&
  evidence.priceIntegrity.negativePrices === 0 &&
  evidence.priceIntegrity.duplicateSlugs === 0 &&
  evidence.inducedFailure.sawInducedError &&
  !evidence.inducedFailure.probeColumnPresent &&
  evidence.inducedFailure.countsUnchanged &&
  staticReview.every((r) => r.forbiddenFound.length === 0)
    ? "PASS"
    : "FAIL";

const outPath = join(root, "docs", "testing", "acceptance-evidence", "canonical-menu-migration-safety.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.gate === "PASS" ? 0 : 1);
