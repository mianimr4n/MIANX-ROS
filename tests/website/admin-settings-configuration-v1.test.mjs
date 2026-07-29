/**
 * Settings & Configuration V1 — composition and honesty wiring (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Settings & Configuration V1 (static)", () => {
  it("composes /admin/settings from reusable settings components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminSettings.tsx");
    assert.match(page, /SettingsHeader/);
    assert.match(page, /SettingsReadinessBanner/);
    assert.match(page, /SettingsSearch/);
    assert.match(page, /SettingsCategoryNav/);
    assert.match(page, /SettingsWorkspace/);
    assert.match(page, /SettingsSaveBar/);
    assert.match(page, /ConfigurationInsights/);
    assert.match(page, /SettingsIntegrationReadiness/);
    assert.match(page, /canAccessAdminSettings/);
  });

  it("does not invent settings write persistence or fake save handlers", () => {
    const page = read("apps/website/client/src/pages/admin/AdminSettings.tsx");
    assert.doesNotMatch(page, /localStorage\.setItem\(["']telepizza\.settings/);
    assert.doesNotMatch(page, /onSave\s*=|saveSettings\(/);
    const save = read("apps/website/client/src/components/admin/settings/SettingsPrimitives.tsx");
    assert.match(save, /Save · Foundation/);
    assert.match(save, /disabled/);
  });

  it("never renders secret keys or credential values", () => {
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /never shown|No secrets shown|Private keys/i);
    assert.doesNotMatch(panels, /sk_live|apiKey:\s*["']|webhook_secret|SUPABASE_SERVICE_ROLE/i);
    const insights = read("apps/website/client/src/components/admin/settings/ConfigurationInsights.tsx");
    assert.doesNotMatch(insights, /sk_live|SERVICE_ROLE_KEY/);
  });

  it("classifies branches and access as read-only", () => {
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /READ-ONLY/);
    assert.match(panels, /GET \/api\/v1\/branches/);
    assert.match(panels, /no invented roles/i);
  });

  it("payment and tax settings remain foundation or unavailable", () => {
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /Provider credentials stay environment-managed|Payment provider credentials unavailable/);
    assert.match(panels, /Never invent tax rates|will never invent tax rates/i);
    assert.doesNotMatch(panels, /status:\s*["']Connected["']/);
  });

  it("Mianx configuration insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/settings/ConfigurationInsights.tsx");
    assert.match(insights, /Mianx\.ai Configuration Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Missing tax configuration/);
    assert.doesNotMatch(insights, /autonomous configuration|AI selecting tax|rotating secrets/i);
  });

  it("gates /admin/settings with canAccessAdminSettings (admin.access)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminSettings/);
    assert.match(access, /admin\.access/);
    assert.match(access, /requiresSettings/);
    assert.match(access, /href: "\/admin\/settings"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminSettings/);
    assert.match(app, /path="\/admin\/settings"/);
    const page = read("apps/website/client/src/pages/admin/AdminSettings.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("settings search filters categories without inventing permissions", () => {
    const helper = read("apps/website/client/src/lib/admin-settings.ts");
    assert.match(helper, /searchSettingsCategories/);
    assert.match(helper, /SETTINGS_CATEGORIES/);
    assert.doesNotMatch(helper, /permissions\.includes\("settings\.manage"\)/);
    assert.doesNotMatch(helper, /organization\.manage|system\.manage/);
  });
});
