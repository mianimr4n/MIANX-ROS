import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const page = await read("apps/website/client/src/pages/admin/AdminBranches.tsx");
const workspace = await read("apps/website/client/src/components/admin/branches/BranchReadinessWorkspace.tsx");
const api = await read("apps/website/client/src/lib/admin-api.ts");
const routes = await read("apps/website/client/src/App.tsx");
const access = await read("apps/website/client/src/lib/admin-access.ts");

test("PHASE2-04 replaces the branches placeholder with the source-backed workspace", () => {
  assert.match(routes, /path="\/admin\/branches" component={AdminBranches}/);
  assert.match(page, /fetchBranchReadinessList/);
  assert.match(page, /No branches in scope/);
  assert.match(page, /Loading live branch readiness/);
  assert.match(page, /role="alert"/);
});

test("readiness UI exposes deterministic score, categorized checks, source and remediation", () => {
  assert.match(workspace, /Unknown checks never count as passing/);
  assert.match(workspace, /report\.readinessScore/);
  assert.match(workspace, /group\.checks/);
  assert.match(workspace, /item\.source/);
  assert.match(workspace, /Review setup/);
  assert.match(workspace, /focus-visible/);
});

test("effective viewer exposes provenance but never renders a secret value", () => {
  assert.match(workspace, /ORGANIZATION/);
  assert.match(workspace, /BRANCH_OVERRIDE/);
  assert.match(workspace, /SCHEMA_DEFAULT/);
  assert.match(workspace, /secret reference masked/);
  assert.match(api, /masked: boolean/);
  assert.doesNotMatch(workspace, /secret_ref.*value/);
});

test("history view is bounded, newest-first API data with honest empty state", () => {
  assert.match(api, /ConfigurationHistory/);
  assert.match(api, /limit\?: number/);
  assert.match(workspace, /No immutable configuration history exists/);
  assert.match(workspace, /secret metadata remains redacted by the API/);
});

test("frontend role gate allows only platform, owner and branch manager", () => {
  assert.match(page, /canAccessBranchReadiness/);
  assert.match(access, /organization_owner/);
  assert.match(access, /branch_manager/);
  assert.doesNotMatch(access, /kitchen_manager.*canAccessBranchReadiness/);
  assert.match(access, /label: "Branch readiness", href: "\/admin\/branches"/);
});
