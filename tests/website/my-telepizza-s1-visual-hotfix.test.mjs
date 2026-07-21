import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("S1 hotfix: signed-out CTAs use non-overflowing responsive grid", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(hub, /Sign in/);
  assert.match(hub, /Create account/);
  assert.doesNotMatch(hub, /sm:min-w-\[9\.5rem\]/);
});

test("S1 hotfix: addresses degraded state is one neutral card", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const errors = read("apps/website/client/src/lib/customer-errors.ts");
  assert.match(hub, /You can still add a new address below/);
  assert.match(hub, /bg-muted\/20/);
  assert.match(hub, /role=["']status["']/);
  assert.match(errors, /We couldn'?t load your saved addresses right now/);
  assert.doesNotMatch(hub, /Account address sync is unavailable right now/);
  assert.match(hub, /addressesError \|\| !usingCloudAddresses/);
});

test("S1 hotfix: home hides empty active-order card", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.doesNotMatch(hub, /No active order right now/);
  assert.match(hub, /activeOrder \? \(/);
  assert.match(hub, /recentOrdersPreview\.length > 0/);
});
