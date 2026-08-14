/**
 * WhatsApp adapter factory
 *
 * Picks the right adapter based on `TELEPIZZA_WHATSAPP_MODE`:
 *   - disabled → null (WhatsApp integration off; webhook returns 404)
 *   - mock     → mock adapter (local dev + test; writes JSON files, no network)
 *   - sandbox  → Cloud API adapter (Meta test number / sandbox WABA)
 *   - live     → Cloud API adapter (Production WABA)
 *
 * Authority: ADR-003 (Provider-Secret Boundary)
 *           ADR-004 §8 (Provider adapter contract)
 */

import type { EnvironmentStatus } from "../../config/env.js";
import type { MessageProviderAdapter } from "../providers/adapter.js";
import { createCloudApiWhatsAppAdapter } from "./cloud-api-client.js";
import { createMockWhatsAppAdapter } from "./mock-client.js";

/**
 * Resolve the WhatsApp adapter for the current environment.
 *
 * @returns The adapter, or null if WhatsApp is disabled.
 * @throws if whatsappMode=sandbox|live but required env vars are missing
 *         (defense-in-depth — env.ts evaluateLocalSafety() should have
 *         caught this at startup, but the factory double-checks).
 */
export function resolveWhatsAppAdapter(envStatus: EnvironmentStatus): MessageProviderAdapter | null {
  const mode = envStatus.config.whatsappMode;
  const whatsappConfig = envStatus.config.whatsapp;

  switch (mode) {
    case "disabled":
      return null;

    case "mock":
      return createMockWhatsAppAdapter();

    case "sandbox":
    case "live":
      // env.ts evaluateLocalSafety() already validated required env vars.
      // The Cloud API adapter constructor also validates (defense in depth).
      return createCloudApiWhatsAppAdapter(whatsappConfig);

    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown TELEPIZZA_WHATSAPP_MODE: ${String(_exhaustive)}`);
    }
  }
}
