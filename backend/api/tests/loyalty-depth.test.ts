import { describe, expect, it } from "vitest";

import {
  evaluateRewardEligibilityBasics,
  REWARD_APPROVAL,
  REWARD_TYPES,
} from "../src/services/loyalty/depth.js";
import {
  applyConfirmedProviderEvent,
  createEmailProviderAdapter,
  createWhatsAppProviderAdapter,
  PROVIDER_SUBMISSION_STATES,
} from "../src/services/marketing/providers.js";

const baseReward = {
  approvalStatus: "approved" as const,
  isActive: true,
  validFrom: null as string | null,
  validTo: null as string | null,
  branchId: null as string | null,
  pointsCost: 100,
  minOrderAmount: 0,
};

describe("RC4-11 loyalty depth helpers", () => {
  it("exports catalogue reward types and approval states", () => {
    expect(REWARD_TYPES).toContain("fixed_discount");
    expect(REWARD_TYPES).toContain("delivery_fee_waiver");
    expect(REWARD_APPROVAL).toEqual(["draft", "awaiting_approval", "approved", "rejected"]);
  });

  it("eligibility: rejects unapproved / inactive", () => {
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, approvalStatus: "draft" },
        pointsBalance: 500,
      }).reason,
    ).toMatch(/not approved/i);
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, isActive: false },
        pointsBalance: 500,
      }).eligible,
    ).toBe(false);
  });

  it("eligibility: insufficient points and min order", () => {
    expect(
      evaluateRewardEligibilityBasics({
        reward: baseReward,
        pointsBalance: 50,
      }).reason,
    ).toBe("insufficient points");
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, minOrderAmount: 500 },
        pointsBalance: 200,
        orderSubtotal: 100,
      }).reason,
    ).toBe("minimum order not met");
  });

  it("eligibility: date window and branch scope", () => {
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, validFrom: "2099-01-01" },
        pointsBalance: 200,
        today: "2026-08-01",
      }).reason,
    ).toMatch(/not yet valid/i);
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, validTo: "2020-01-01" },
        pointsBalance: 200,
        today: "2026-08-01",
      }).reason,
    ).toBe("expired reward");
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, branchId: "branch-a" },
        pointsBalance: 200,
        branchId: "branch-b",
      }).reason,
    ).toBe("branch-ineligible");
    expect(
      evaluateRewardEligibilityBasics({
        reward: { ...baseReward, branchId: "branch-a" },
        pointsBalance: 200,
      }).reason,
    ).toBe("branch-ineligible");
  });

  it("eligibility: passes when basics satisfied", () => {
    expect(
      evaluateRewardEligibilityBasics({
        reward: baseReward,
        pointsBalance: 100,
        orderSubtotal: 0,
      }),
    ).toEqual({ eligible: true, reason: null });
  });
});

describe("RC4-11 provider honesty (shared with marketing depth)", () => {
  it("never maps ambiguous delivered/open/click without confirmation", () => {
    const email = createEmailProviderAdapter();
    const wa = createWhatsAppProviderAdapter();
    expect(email.mapProviderState("delivered")).toBeNull();
    expect(wa.mapProviderState("opened")).toBeNull();
    expect(wa.mapProviderState("clicked")).toBeNull();
    expect(email.mapProviderState("accepted")).toBe("provider_accepted");
    expect(PROVIDER_SUBMISSION_STATES).toContain("queued");
  });

  it("submit never claims delivery", async () => {
    const result = await createEmailProviderAdapter().submit({
      to: "a@b.c",
      templateBody: "hi",
    });
    expect(result.deliveryClaimed).toBe(false);
    expect(result.state).toBe("queued");
    expect(result.providerMessageId).toBeNull();
  });

  it("applyConfirmedProviderEvent requires confirmation + message id", () => {
    expect(
      applyConfirmedProviderEvent("queued", { type: "delivered", confirmed: false, providerMessageId: "x" }),
    ).toBe("queued");
    expect(applyConfirmedProviderEvent("queued", { type: "delivered", confirmed: true })).toBe("queued");
    expect(
      applyConfirmedProviderEvent("queued", { type: "delivered", confirmed: true, providerMessageId: "msg-1" }),
    ).toBe("delivered");
  });
});
