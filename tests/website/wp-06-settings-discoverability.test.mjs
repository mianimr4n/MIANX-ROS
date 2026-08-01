import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

const app = read("apps/website/client/src/App.tsx");
const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
const settings = read("apps/website/client/src/pages/Settings.tsx");
const notifications = read("apps/website/client/src/pages/Notifications.tsx");

test("WP-06 /settings route is registered and Settings page exists", () => {
  assert.match(app, /path=["']\/settings["']/);
  assert.match(app, /(?:import Settings from ["']\.\/pages\/Settings["']|lazy\(\(\) => import\(["']\.\/pages\/Settings["']\)\))/);
  assert.match(settings, /export default function Settings/);
});

test("WP-06 My Telepizza hub surfaces Settings for discoverability", () => {
  assert.match(hub, /href=["']\/settings["']/);
  assert.match(hub, /Settings/);
  assert.match(hub, /href=["']\/settings#prefs["']/);
  assert.match(hub, /Open Settings preferences/);
});

test("WP-06 Settings supports hash deep-links and signed-out gate", () => {
  assert.match(settings, /function sectionFromHash/);
  assert.match(settings, /hashchange/);
  assert.match(settings, /Sign in to manage your settings/);
  assert.match(settings, /login\?next=%2Fsettings/);
  assert.match(settings, /settings-signin-heading/);
  assert.match(settings, /aria-label=["']Settings sections["']/);
});

test("WP-06 Settings reviews coverage stays honest (list + Orders edit path)", () => {
  assert.match(settings, /Your reviews/);
  assert.match(settings, /Ratings for completed orders/);
  assert.match(settings, /href=["']\/orders["']/);
  assert.match(settings, /within 24 hours/);
  assert.match(settings, /Reviews need the live API/);
});

test("WP-06 Notifications inbox points prefs to Settings, not fake SMTP", () => {
  assert.match(notifications, /href=["']\/settings#prefs["']/);
  assert.doesNotMatch(notifications, /email was sent|SMTP success|delivery confirmed/i);
  assert.match(settings, /Live SMTP email delivery is deferred/);
});
