import { describe, expect, it } from "vitest";

import {
  canQueueCampaignStatus,
  DEPTH_CAMPAIGN_STATUSES,
  DEPTH_CAMPAIGN_TRANSITIONS,
  extractTemplateVariables,
  isDepthCampaignTransitionAllowed,
  stripTemplateUnsafeHtml,
} from "../src/services/marketing/depth.js";
import {
  createEmailProviderAdapter,
  createWhatsAppProviderAdapter,
} from "../src/services/marketing/providers.js";

describe("RC4-11 marketing depth helpers", () => {
  it("campaign statuses include awaiting_approval and approved", () => {
    expect(DEPTH_CAMPAIGN_STATUSES).toContain("awaiting_approval");
    expect(DEPTH_CAMPAIGN_STATUSES).toContain("approved");
  });

  it("transition matrix: draft → awaiting_approval → approved", () => {
    expect(isDepthCampaignTransitionAllowed("draft", "awaiting_approval")).toBe(true);
    expect(isDepthCampaignTransitionAllowed("awaiting_approval", "approved")).toBe(true);
    expect(isDepthCampaignTransitionAllowed("draft", "running")).toBe(false);
    expect(isDepthCampaignTransitionAllowed("completed", "running")).toBe(false);
    expect(DEPTH_CAMPAIGN_TRANSITIONS.approved).toEqual(
      expect.arrayContaining(["scheduled", "running", "cancelled"]),
    );
  });

  it("queue gate: only approved|scheduled|running", () => {
    expect(canQueueCampaignStatus("approved")).toBe(true);
    expect(canQueueCampaignStatus("scheduled")).toBe(true);
    expect(canQueueCampaignStatus("running")).toBe(true);
    expect(canQueueCampaignStatus("draft")).toBe(false);
    expect(canQueueCampaignStatus("awaiting_approval")).toBe(false);
    expect(canQueueCampaignStatus("cancelled")).toBe(false);
  });

  it("strips unsafe template markup and extracts variables", () => {
    const cleaned = stripTemplateUnsafeHtml(
      'Hello {{name}} <script>alert(1)</script> <div onclick="x()">ok</div>',
    );
    expect(cleaned).not.toMatch(/script/i);
    expect(cleaned).not.toMatch(/onclick/i);
    expect(extractTemplateVariables("Hi {{ name }}, code {{coupon_code}}", "Sub {{subject_var}}")).toEqual([
      "coupon_code",
      "name",
      "subject_var",
    ]);
  });

  it("provider adapters stay unconfigured and never invent delivery", async () => {
    const email = createEmailProviderAdapter();
    const wa = createWhatsAppProviderAdapter();
    expect(email.validateConfig({}).providerConfigured).toBe(false);
    expect(wa.validateConfig({}).ok).toBe(true);
    const submitted = await wa.submit({ to: "+92000", templateBody: "x" });
    expect(submitted.deliveryClaimed).toBe(false);
    expect(submitted.state).toBe("queued");
    expect(email.mapProviderState("delivered")).toBeNull();
  });
});
