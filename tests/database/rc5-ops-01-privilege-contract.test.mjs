/**
 * RC5-OPS-01 — static privilege-contract tests.
 *
 * These assertions verify migration *presence* and SQL *intent* in the repository.
 * They do NOT prove live database privilege behavior (no live DB in CI).
 * Live local verification is recorded separately under
 * docs/testing/acceptance-evidence/rc5-ops-01/.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = join(workspaceRoot, "supabase", "migrations");

const BASELINE_GRANT = "20260714120000_grant_public_access.sql";
const HARDEN_GRANTS = "20260718130000_p0_harden_grants_and_definer_execute.sql";

function readMigration(name) {
  const path = join(migrationsDir, name);
  assert.ok(existsSync(path), `required migration missing: ${name}`);
  return readFileSync(path, "utf8");
}

function migrationNames() {
  return readdirSync(migrationsDir).filter((n) => n.endsWith(".sql"));
}

test("RC5-OPS-01: baseline grant migration exists by filename and version prefix", () => {
  const names = migrationNames();
  assert.ok(
    names.includes(BASELINE_GRANT),
    `expected ${BASELINE_GRANT} among migrations`,
  );
  assert.ok(
    names.some((n) => n.startsWith("20260714120000")),
    "baseline grant version prefix 20260714120000 must exist",
  );
});

test("RC5-OPS-01: hardening migration exists by filename and version prefix", () => {
  const names = migrationNames();
  assert.ok(
    names.includes(HARDEN_GRANTS),
    `expected ${HARDEN_GRANTS} among migrations`,
  );
  assert.ok(
    names.some((n) => n.startsWith("20260718130000")),
    "harden version prefix 20260718130000 must exist",
  );
});

test("RC5-OPS-01: baseline grant migration encodes schema/table/sequence/default privileges", () => {
  const sql = readMigration(BASELINE_GRANT);

  // Schema USAGE for application roles
  assert.match(
    sql,
    /grant\s+usage\s+on\s+schema\s+public\s+to\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );

  // Table DML baseline (later hardened)
  assert.match(
    sql,
    /grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );

  // Sequences
  assert.match(
    sql,
    /grant\s+usage\s*,\s*select\s+on\s+all\s+sequences\s+in\s+schema\s+public\s+to\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );

  // Default privileges for future tables/sequences
  assert.match(
    sql,
    /alter\s+default\s+privileges\s+in\s+schema\s+public[\s\S]*grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+tables\s+to\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );
  assert.match(
    sql,
    /alter\s+default\s+privileges\s+in\s+schema\s+public[\s\S]*grant\s+usage\s*,\s*select\s+on\s+sequences\s+to\s+anon\s*,\s*authenticated\s*,\s*service_role/i,
  );
});

test("RC5-OPS-01: hardening migration revokes dangerous client privileges", () => {
  const sql = readMigration(HARDEN_GRANTS);

  assert.match(
    sql,
    /revoke\s+truncate\s*,\s*references\s*,\s*trigger\s+on\s+table\s+public\.%I\s+from\s+anon\s*,\s*authenticated/i,
  );

  assert.match(
    sql,
    /revoke\s+insert\s*,\s*update\s*,\s*delete\s*,\s*truncate\s*,\s*references\s*,\s*trigger[\s\S]*on\s+table\s+public\.branches[\s\S]*from\s+anon\s*,\s*authenticated/i,
  );

  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.users\s+from\s+anon/i);

  assert.match(
    sql,
    /revoke\s+all\s+on\s+table\s+public\.orders[\s\S]*from\s+anon/i,
  );

  assert.match(
    sql,
    /alter\s+default\s+privileges\s+in\s+schema\s+public[\s\S]*revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+tables\s+from\s+anon/i,
  );
});

test("RC5-OPS-01: hardening migration restores selective intended privileges", () => {
  const sql = readMigration(HARDEN_GRANTS);

  assert.match(
    sql,
    /grant\s+select\s+on\s+table\s+public\.branches\s*,\s*public\.menu_categories\s*,\s*public\.menu_items\s*,\s*public\.menu_item_variants\s+to\s+anon\s*,\s*authenticated/i,
  );

  assert.match(
    sql,
    /grant\s+select\s*,\s*update\s+on\s+table\s+public\.users\s+to\s+authenticated/i,
  );

  assert.match(
    sql,
    /grant\s+select\s+on\s+table\s+public\.orders\s*,\s*public\.order_items\s*,\s*public\.order_status_logs\s*,\s*public\.deliveries\s+to\s+authenticated/i,
  );

  assert.match(
    sql,
    /grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table[\s\S]*public\.orders[\s\S]*to\s+service_role/i,
  );

  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.current_app_user_id\(\)\s+to\s+authenticated\s*,\s*service_role/i,
  );
});

test("RC5-OPS-01: static suite documents live-DB limitation", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.match(self, /do NOT prove live database privilege behavior/i);
});
