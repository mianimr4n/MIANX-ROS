/**
 * RC4-11 provider adapter contracts.
 * Never invent delivered / opened / clicked without explicit provider confirmation.
 */

export const PROVIDER_SUBMISSION_STATES = [
  "queued",
  "suppressed",
  "submitted",
  "provider_accepted",
  "provider_rejected",
  "failed",
  "delivered",
  "opened",
  "clicked",
] as const;

export type ProviderSubmissionState = (typeof PROVIDER_SUBMISSION_STATES)[number];

export type ProviderChannel = "email" | "whatsapp";

export type ProviderConfigValidation =
  | { ok: true; providerConfigured: false; message: string }
  | { ok: false; providerConfigured: false; message: string };

export type ProviderSubmitResult = {
  state: Extract<
    ProviderSubmissionState,
    "queued" | "submitted" | "provider_accepted" | "provider_rejected" | "failed"
  >;
  providerName: string | null;
  providerMessageId: string | null;
  failureReason: string | null;
  deliveryClaimed: false;
};

export interface MarketingProviderAdapter {
  channel: ProviderChannel;
  validateConfig(config: Record<string, unknown>): ProviderConfigValidation;
  submit(input: {
    to: string;
    templateBody: string;
    subject?: string | null;
    variables?: Record<string, string>;
    config?: Record<string, unknown>;
  }): Promise<ProviderSubmitResult>;
  mapProviderState(raw: string): ProviderSubmissionState | null;
}

const NOT_CONFIGURED =
  "Messaging provider is not configured — submissions remain queued or suppressed only. delivered/opened/clicked require explicit provider confirmation.";

function baseAdapter(channel: ProviderChannel): MarketingProviderAdapter {
  return {
    channel,
    validateConfig() {
      return { ok: true, providerConfigured: false, message: NOT_CONFIGURED };
    },
    async submit() {
      return {
        state: "queued",
        providerName: null,
        providerMessageId: null,
        failureReason: null,
        deliveryClaimed: false,
      };
    },
    mapProviderState(raw) {
      const normalized = raw.trim().toLowerCase();
      if (normalized === "accepted" || normalized === "provider_accepted") return "provider_accepted";
      if (normalized === "rejected" || normalized === "provider_rejected") return "provider_rejected";
      if (normalized === "failed" || normalized === "error") return "failed";
      if (normalized === "submitted" || normalized === "sent_to_provider") return "submitted";
      if (normalized === "queued") return "queued";
      if (normalized === "suppressed") return "suppressed";
      // Never map ambiguous statuses to delivered/opened/clicked without confirmation payload.
      if (normalized === "delivered" || normalized === "opened" || normalized === "clicked") {
        return null;
      }
      return null;
    },
  };
}

export function createEmailProviderAdapter(): MarketingProviderAdapter {
  return baseAdapter("email");
}

export function createWhatsAppProviderAdapter(): MarketingProviderAdapter {
  return baseAdapter("whatsapp");
}

export function getProviderAdapter(channel: ProviderChannel): MarketingProviderAdapter {
  return channel === "email" ? createEmailProviderAdapter() : createWhatsAppProviderAdapter();
}

/** Explicit confirmation required before elevating to delivered/opened/clicked. */
export function applyConfirmedProviderEvent(
  current: ProviderSubmissionState,
  event: { type: "delivered" | "opened" | "clicked"; confirmed: boolean; providerMessageId?: string },
): ProviderSubmissionState {
  if (!event.confirmed || !event.providerMessageId) return current;
  return event.type;
}
