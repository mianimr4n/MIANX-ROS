import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const controlPlane = await read("backend/api/src/services/branches/control-plane.ts");
const configuration = await read("backend/api/src/modules/admin/configuration.ts");

test("PHASE2-04 derives readiness without adding a persisted score migration", async () => {
  const migrations = await readdir(new URL("../../supabase/migrations/", import.meta.url));
  assert.equal(migrations.some((name) => /phase2_04|readiness_score/i.test(name)), false);
  assert.doesNotMatch(controlPlane, /from\("branch_readiness/);
});

test("readiness database access is explicitly constrained by repository-derived scope", () => {
  assert.match(controlPlane, /ownedOrganizationIds/);
  assert.match(controlPlane, /principal\.branchIds/);
  assert.match(controlPlane, /\.in\("organization_id", owned\)/);
  assert.match(controlPlane, /\.in\("id", principal\.branchIds\)/);
  assert.match(controlPlane, /BRANCH_ACCESS_DENIED/);
});

test("effective values preserve branch-over-organization-default precedence and mask secrets", () => {
  assert.match(configuration, /BRANCH_OVERRIDE/);
  assert.match(configuration, /ORGANIZATION/);
  assert.match(configuration, /SCHEMA_DEFAULT/);
  assert.match(configuration, /schema\.data_type === "secret_ref" \? "<REDACTED>"/);
});

test("branch-manager history cannot expand into organization-wide history", () => {
  assert.match(configuration, /canReadOrganizationHistory/);
  assert.match(configuration, /ownedOrganizationIds/);
  assert.match(configuration, /canReadOrganizationHistory \? \[branch\.data, organizationId\] : \[branch\.data\]/);
});
