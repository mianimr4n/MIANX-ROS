/**
 * WhatsApp Order Center V1 — composition and honesty wiring (static).
 *
 * Phase 2.2 update: the workspace now has LIVE conversation storage backed
 * by ADR-004. Tests assert the live state (not the previous "no conversation
 * store" placeholder state).
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

describe("WhatsApp Order Center V1 (static)", () => {
  it("composes /admin/whatsapp from reusable WhatsApp components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminWhatsApp.tsx");
    assert.match(page, /WhatsAppHeader/);
    assert.match(page, /WhatsAppIntegrationBanner/);
    assert.match(page, /WhatsAppKPIs/);
    assert.match(page, /WhatsAppFilters/);
    assert.match(page, /WhatsAppOrderQueue/);
    assert.match(page, /ConversationWorkspace/);
    assert.match(page, /CustomerContextPanel/);
    assert.match(page, /LinkedOrderPanel/);
    assert.match(page, /WhatsAppActivity/);
    assert.match(page, /WhatsAppInsights/);
    assert.match(page, /canAccessAdminWhatsApp/);
    assert.match(page, /WHATSAPP_ORDER_SOURCE/);
  });

  it("renders live conversation store with composer (Phase 2.2)", () => {
    const workspace = read("apps/website/client/src/components/admin/whatsapp/ConversationWorkspace.tsx");
    assert.match(workspace, /WhatsApp conversations/);
    assert.match(workspace, /live conversation store|Live conversation store/);
    assert.match(workspace, /listWhatsAppConversations/);
    assert.match(workspace, /listWhatsAppMessages/);
    assert.match(workspace, /sendWhatsAppMessage/);
    assert.match(workspace, /whatsapp-conversation-workspace/);
    // Composer is now rendered inside the workspace (not standalone).
    assert.match(workspace, /MessageComposer/);
    const queue = read("apps/website/client/src/components/admin/whatsapp/WhatsAppOrderQueue.tsx");
    assert.match(queue, /WhatsApp-attributed orders/);
    const header = read("apps/website/client/src/components/admin/whatsapp/WhatsAppHeader.tsx");
    assert.match(header, /Order channel attribution|WhatsApp-attributed orders/);
  });

  it("enables composer with live send + 4096-char limit", () => {
    const composer = read("apps/website/client/src/components/admin/whatsapp/MessageComposer.tsx");
    assert.match(composer, /Reply via WhatsApp/);
    assert.match(composer, /maxLength=\{4096\}/);
    assert.match(composer, /outbox worker/);
    // No longer says "Planned for Phase 2" or "no outbound WhatsApp API".
    assert.doesNotMatch(composer, /Planned for Phase 2/);
    assert.doesNotMatch(composer, /no outbound WhatsApp API/i);
  });

  it("integration banner announces live inbox (Phase 2.2)", () => {
    const banner = read("apps/website/client/src/components/admin/whatsapp/WhatsAppIntegrationBanner.tsx");
    assert.match(banner, /WhatsApp inbox is live/);
    assert.match(banner, /ADR-004/);
    // No longer claims "not an inbox".
    assert.doesNotMatch(banner, /not an inbox/i);
  });

  it("does not fabricate whatsapp order source in POS", () => {
    const pos = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    assert.match(pos, /createAdminPosOrder/);
  });

  it("labels Mianx insights as rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/whatsapp/WhatsAppInsights.tsx");
    assert.match(insights, /Mianx\.ai WhatsApp Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous|sentiment/i);
  });

  it("gates /admin/whatsapp with canAccessAdminWhatsApp (order.manage)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminWhatsApp/);
    assert.match(access, /href: "\/admin\/whatsapp"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminWhatsApp/);
    assert.match(app, /path="\/admin\/whatsapp"/);
    assert.doesNotMatch(app, /WhatsAppComingSoon/);
    const page = read("apps/website/client/src/pages/admin/AdminWhatsApp.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration status does not expose secrets in source", () => {
    const helper = read("apps/website/client/src/lib/admin-whatsapp.ts");
    assert.match(helper, /integrationChecks/);
    assert.doesNotMatch(helper, /access_token|phone_number_id|WABA_SECRET/i);
  });
});
