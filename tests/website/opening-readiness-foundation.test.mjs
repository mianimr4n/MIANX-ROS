import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const CANONICAL_DOCS = [
  "docs/README.md",
  "docs/DOCUMENTATION_MAP.md",
  "docs/00-governance/PROJECT_STATUS.md",
  "docs/00-governance/OPERATING_PRINCIPLES.md",
  "docs/01-architecture/CURRENT_SYSTEM_MAP.md",
  "docs/02-domains/DOMAIN_CAPABILITY_MATRIX.md",
  "docs/03-data/PRODUCTION_DATA_BASELINE.md",
  "docs/04-api/API_CATALOG.md",
  "docs/05-events/ORDER_TO_DELIVERY_LIFECYCLE.md",
  "docs/06-frontend/DASHBOARD_ROUTE_MATRIX.md",
  "docs/07-backend/BACKEND_CAPABILITY_MATRIX.md",
  "docs/08-security/RBAC_AND_ACCESS_MATRIX.md",
  "docs/09-observability/PRODUCTION_HEALTH_SIGNALS.md",
  "docs/10-devops/RELEASE_AND_ROLLBACK_RUNBOOK.md",
  "docs/11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md",
  "docs/11-ai/AGENT_REGISTRY.md",
  "docs/12-quality/ACCEPTANCE_MATRIX.md",
  "docs/14-phases/OPENING_READINESS_PLAN.md",
  "docs/15-runbooks/OPENING_DAY_RUNBOOK.md",
  "docs/17-releases/RELEASE_HISTORY.md",
  "docs/18-reference/GLOSSARY_AND_DATA_STATES.md",
];

const PLACEHOLDER_ONLY =
  /^(?:\s|#.*|\*\*Status:\*\*.*|Reserved for.*|No ACTIVE content yet.*|FUTURE.*|TBD.*|TODO.*)+$/im;

test("canonical documentation files exist and are non-placeholder", () => {
  for (const rel of CANONICAL_DOCS) {
    const abs = path.join(root, rel);
    assert.ok(fs.existsSync(abs), `missing ${rel}`);
    const body = fs.readFileSync(abs, "utf8");
    assert.ok(body.length > 400, `too short: ${rel}`);
    assert.doesNotMatch(body, /^Reserved for/m, `placeholder reserved: ${rel}`);
    assert.doesNotMatch(body, /No ACTIVE content yet/i, `placeholder FUTURE: ${rel}`);
    if (rel !== "docs/README.md") {
      assert.match(body, /## Purpose|## Current verified state|What is LIVE/i, `missing required sections: ${rel}`);
    } else {
      assert.match(body, /Start here \(Owner\)|Canonical ACTIVE TEAS/i);
    }
  }
});

test("documentation map links resolve", () => {
  const map = fs.readFileSync(path.join(root, "docs/DOCUMENTATION_MAP.md"), "utf8");
  const links = [...map.matchAll(/\((\.\/[^)]+\.md)\)/g)].map((m) => m[1]);
  assert.ok(links.length > 5, "expected several map links");
  for (const link of links) {
    const abs = path.resolve(path.join(root, "docs"), link);
    assert.ok(fs.existsSync(abs), `broken map link ${link}`);
  }
});

test("no private absolute paths or credentials in canonical docs", () => {
  for (const rel of CANONICAL_DOCS) {
    const body = fs.readFileSync(path.join(root, rel), "utf8");
    assert.doesNotMatch(body, /D:\\\\telepizza-private|D:\/telepizza-private/i, `private path in ${rel}`);
    assert.doesNotMatch(body, /service_role|SUPABASE_SERVICE_ROLE|sk_live|password\s*=/i, `credential-like in ${rel}`);
  }
});

test("architecture truth matches repository providers", () => {
  const arch = fs.readFileSync(path.join(root, "docs/01-architecture/CURRENT_SYSTEM_MAP.md"), "utf8");
  assert.match(arch, /Vercel/i);
  assert.match(arch, /Render/i);
  assert.match(arch, /Supabase/i);
  assert.match(arch, /coming-soon/i);
  assert.match(arch, /not.*Kubernetes|Not in Production[\s\S]*Kubernetes/i);
});

test("AI team center route, nav, and fourteen agents", () => {
  const app = fs.readFileSync(path.join(root, "apps/website/client/src/App.tsx"), "utf8");
  const access = fs.readFileSync(path.join(root, "apps/website/client/src/lib/admin-access.ts"), "utf8");
  const page = fs.readFileSync(path.join(root, "apps/website/client/src/pages/admin/AdminAiTeam.tsx"), "utf8");
  const registry = fs.readFileSync(path.join(root, "apps/website/client/src/lib/mianx-team.ts"), "utf8");

  assert.match(app, /path="\/admin\/ai-team"/);
  assert.match(access, /label: "Mianx\.ai Team"/);
  assert.match(access, /canAccessAiTeam/);
  assert.match(access, /href: "\/admin\/ai-team"/);
  assert.match(page, /useAdminAccessGate\(allowed\)/);
  assert.match(page, /canAccessAiTeam/);
  assert.match(page, /Status/);
  assert.match(page, /Problem/);
  assert.match(page, /Next action/i);

  const ids = [...registry.matchAll(/id: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  const unique = new Set(ids);
  assert.equal(ids.length, 14, `expected 14 agent ids, got ${ids.length}`);
  assert.equal(unique.size, 14, "duplicate agent ids");
  assert.match(registry, /FOUNDATION/);
  assert.match(registry, /refusing fake LIVE zero|not LIVE/i);
});

test("countdown canonical config and boundaries", async () => {
  const modPath = pathToFileURL(
    path.join(root, "apps/website/client/src/lib/opening-countdown.ts"),
  ).href;
  const { computeOpeningCountdown, OPENING_TARGET_ISO, OPENING_TIMEZONE } = await import(modPath);

  assert.equal(OPENING_TARGET_ISO, "2026-08-14T10:00:00+05:00");
  assert.equal(OPENING_TIMEZONE, "Asia/Karachi");

  const before = computeOpeningCountdown(Date.parse("2026-08-01T05:00:00+05:00"), false);
  assert.equal(before.mode, "before");
  assert.ok(before.days >= 12);
  assert.ok(before.hours >= 0 && before.minutes >= 0 && before.seconds >= 0);

  const openingDay = computeOpeningCountdown(Date.parse("2026-08-14T15:00:00+05:00"), false);
  assert.equal(openingDay.mode, "opening-day");
  assert.equal(openingDay.label, "Opening day");

  const afterNoLaunch = computeOpeningCountdown(Date.parse("2026-08-15T12:00:00+05:00"), false);
  assert.equal(afterNoLaunch.mode, "opening-day");
  assert.ok(afterNoLaunch.days === 0 && afterNoLaunch.hours === 0);

  const launched = computeOpeningCountdown(Date.parse("2026-08-20T12:00:00+05:00"), true);
  assert.equal(launched.mode, "launch-completed");
  assert.equal(launched.label, "Official launch completed");

  const near = computeOpeningCountdown(Date.parse("2026-08-14T09:59:59+05:00"), false);
  assert.equal(near.mode, "opening-day");
  assert.equal(near.label, "Opening day");
  assert.ok(near.days === 0 && near.hours === 0 && near.minutes === 0 && near.seconds === 0);
});

test("northern bypass remains coming-soon in docs and team page", () => {
  const status = fs.readFileSync(path.join(root, "docs/00-governance/PROJECT_STATUS.md"), "utf8");
  const page = fs.readFileSync(path.join(root, "apps/website/client/src/pages/admin/AdminAiTeam.tsx"), "utf8");
  assert.match(status, /Northern Bypass.*coming-soon/i);
  assert.match(page, /coming-soon/);
  assert.match(page, /Northern Bypass/);
});
