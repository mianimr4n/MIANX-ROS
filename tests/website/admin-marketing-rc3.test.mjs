/**
 * RC3 Marketing — Admin UI honesty wiring (static).
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

describe("RC3 Marketing UI (static)", () => {
  it("composes /admin/marketing with live coupons, redemptions, campaigns, consent, and suppressions", () => {
    const page = read("apps/website/client/src/pages/admin/AdminMarketing.tsx");
    assert.match(page, /listMarketingCoupons/);
    assert.match(page, /patchMarketingCoupon/);
    assert.match(page, /listCouponRedemptions/);
    assert.match(page, /listMarketingCampaigns/);
    assert.match(page, /transitionMarketingCampaign/);
    assert.match(page, /listMarketingConsent/);
    assert.match(page, /listMarketingSuppressions/);
    assert.match(page, /LIVE marketing/);
    assert.doesNotMatch(page, /Planned for Phase 2.*[Cc]oupon/);
  });

  it("never claims messaging provider delivery", () => {
    const page = read("apps/website/client/src/pages/admin/AdminMarketing.tsx");
    assert.match(page, /Messaging provider is not configured/);
    assert.match(page, /never claim delivered/i);
    assert.match(page, /Provider delivery unavailable/);
    assert.doesNotMatch(page, /delivered successfully|messages sent/i);
  });

  it("exposes marketing API helpers including attention", () => {
    const api = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(api, /fetchMarketingAttention/);
    assert.match(api, /queueCampaignSubmissions/);
    assert.match(api, /validateMarketingCoupon/);
  });

  it("wires Owner marketing attention from verified API", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(builders, /marketingAttention/);
    assert.match(builders, /Two coupons expire within seven days/);
    assert.match(builders, /Messaging provider is not configured/);
    assert.match(dashboard, /fetchMarketingAttention/);
  });
});
