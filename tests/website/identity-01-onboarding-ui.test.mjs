import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const panel = await read("apps/website/client/src/components/admin/hr/IdentityInvitationsPanel.tsx");
const api = await read("apps/website/client/src/lib/admin-api.ts");
const accept = await read("apps/website/client/src/pages/StaffAccept.tsx");
const hr = await read("apps/website/client/src/pages/admin/AdminHr.tsx");

test("IDENTITY-01 exposes only bounded platform/owner/manager invitation UI", () => {
  assert.match(panel, /isPlatformSuperAdmin \|\| isOwner \|\| isManager/);
  assert.match(panel, /Bootstrap the first owner only/);
  assert.match(panel, /Platform administrators cannot create restaurant staff/);
  assert.match(panel, /MANAGER_ROLES = \["kitchen_manager", "cashier", "rider", "support"\]/);
  assert.match(hr, /<IdentityInvitationsPanel \/>/);
});

test("IDENTITY-01 UI supports multi-branch, honest lifecycle and non-secret delivery", () => {
  assert.match(panel, /type="checkbox"/);
  assert.match(panel, /pending/);
  assert.match(panel, /accepted/);
  assert.match(panel, /Resend/);
  assert.match(panel, /Revoke/);
  assert.match(panel, /without exposing its token/);
  assert.match(api, /branchIds: string\[\]/);
  assert.doesNotMatch(api, /inviteUrl:/);
});

test("recipient chooses a password and sees organization or multi-branch scope", () => {
  assert.match(accept, /autoComplete="new-password"/);
  assert.match(accept, /preview\.branchNames\.join/);
  assert.match(accept, /Organization-wide/);
  assert.doesNotMatch(accept, /temporaryPassword|defaultPassword/);
});
