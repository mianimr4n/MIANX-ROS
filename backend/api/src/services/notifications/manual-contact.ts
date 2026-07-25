/**
 * Staff marks a guest as contacted manually (phone / in-person).
 * Audited; does not claim a provider delivery.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";

export interface ManualContactService {
  markGuestContacted(
    scope: BranchActorScope,
    input: {
      branchId: string;
      reservationId?: string | null;
      waitlistId?: string | null;
      note?: string | null;
      channel?: "manual" | "whatsapp" | "sms" | "email";
    },
  ): Promise<{ communicationId: string; status: "skipped" }>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertBranchInScope(scope: BranchActorScope, branchId: string): void {
  if (scope.isSuperAdmin) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "NOTIFICATION_ACCESS_DENIED", "Resource belongs to another branch.");
  }
}

export function createManualContactService(envStatus: EnvironmentStatus): ManualContactService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async markGuestContacted(scope, input) {
      assertBranchInScope(scope, input.branchId);
      if (!input.reservationId && !input.waitlistId) {
        throw new ApiError(422, "VALIDATION_ERROR", "reservationId or waitlistId is required.");
      }

      const { data, error } = await getClient()
        .from("reservation_communications")
        .insert({
          branch_id: input.branchId,
          reservation_id: input.reservationId ?? null,
          waitlist_id: input.waitlistId ?? null,
          message_type: "confirmation",
          channel: input.channel ?? "manual",
          status: "skipped",
          template_code: "reservation_confirmation",
          recipient_masked: null,
          payload: { manual: true, note: input.note ?? null },
          provider_code: "manual",
          idempotency_key: `manual:${input.reservationId ?? input.waitlistId}:${Date.now()}`,
          created_by: scope.userId,
        })
        .select("id, status")
        .single();
      if (error) throw new ApiError(500, "MANUAL_CONTACT_FAILED", error.message);

      await getClient().from("table_service_audit").insert({
        branch_id: input.branchId,
        actor_user_id: scope.userId,
        actor_type: "staff",
        resource_type: input.reservationId ? "reservation" : "waitlist",
        resource_id: input.reservationId ?? input.waitlistId,
        action: "guest_contacted_manual",
        after_data: { note: input.note ?? null, channel: input.channel ?? "manual" },
      });

      return { communicationId: data.id as string, status: "skipped" };
    },
  };
}
