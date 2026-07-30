/**
 * WhatsApp Order Center V1 — composition and honesty wiring (static).
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
    assert.match(page, /WhatsAppOrderBuilder/);
    assert.match(page, /WhatsAppTemplates/);
    assert.match(page, /WhatsAppActivity/);
    assert.match(page, /WhatsAppInsights/);
    assert.match(page, /canAccessAdminWhatsApp/);
    assert.match(page, /WHATSAPP_ORDER_SOURCE/);
  });

  it("uses order-derived mode without fake conversations", () => {
    const workspace = read("apps/website/client/src/components/admin/whatsapp/ConversationWorkspace.tsx");
    assert.match(workspace, /Conversation history unavailable/);
    assert.doesNotMatch(workspace, /MessageBubble|typing|read receipt|delivered/i);
    const queue = read("apps/website/client/src/components/admin/whatsapp/WhatsAppOrderQueue.tsx");
    assert.match(queue, /WhatsApp-attributed orders/);
    assert.match(queue, /not a conversation inbox/i);
    assert.doesNotMatch(queue, /last message preview|unread count/i);
  });

  it("disables composer and labels external handoff honestly", () => {
    const composer = read("apps/website/client/src/components/admin/whatsapp/MessageComposer.tsx");
    assert.match(composer, /Planned for Phase 2/);
    assert.match(composer, /disabled/);
    assert.match(composer, /no outbound WhatsApp API/i);
    const customer = read("apps/website/client/src/components/admin/whatsapp/CustomerContextPanel.tsx");
    assert.match(customer, /External WhatsApp handoff/);
    assert.match(customer, /not tracked provider messaging/i);
    assert.match(customer, /wa\.me/);
  });

  it("does not fabricate whatsapp order source in POS and keeps builder Planned for Phase 2", () => {
    const pos = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    assert.match(pos, /createAdminPosOrder/);
    const builder = read("apps/website/client/src/components/admin/whatsapp/WhatsAppOrderBuilder.tsx");
    assert.match(builder, /Planned for Phase 2/);
    assert.match(builder, /orderSource=whatsapp/);
    assert.doesNotMatch(builder, /createOrderWithIdempotency/);
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

  it("integration status does not claim provider connection", () => {
    const header = read("apps/website/client/src/components/admin/whatsapp/WhatsAppHeader.tsx");
    assert.doesNotMatch(header, /Connected|Online|Live inbox/i);
    const helper = read("apps/website/client/src/lib/admin-whatsapp.ts");
    assert.match(helper, /integrationChecks/);
    assert.match(helper, /missing/);
    assert.doesNotMatch(helper, /access_token|phone_number_id|WABA_SECRET/i);
  });
});
