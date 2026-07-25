/**
 * D3 — public website booking (unauthenticated).
 * Availability never exposes internal table IDs. Create re-checks availability
 * server-side and stores a hashed cancellation token (raw returned once).
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import {
  assertValidIanaTimezone,
  businessDateInTimezone,
} from "../time/branch-timezone.js";
import {
  createReservationsService,
  mapD3RpcError,
  type ReservationsService,
} from "./management.js";

const CANCEL_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;
const SYSTEM_SCOPE = {
  userId: "00000000-0000-4000-8000-000000000000",
  isSuperAdmin: true,
  roles: ["system"],
  branchIds: [] as string[],
};

export const NOTIFICATION_TEMPLATE_CODES = [
  "reservation_confirmation",
  "reservation_cancellation",
  "reservation_reminder",
  "waitlist_ready",
  "deposit_request",
  "deposit_confirmation",
] as const;
export type NotificationTemplateCode = (typeof NOTIFICATION_TEMPLATE_CODES)[number];

export interface PublicAvailabilitySlot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export interface PublicBookingService {
  searchPublicAvailability(query: {
    branchCode: string;
    date: string;
    partySize: number;
  }): Promise<{
    timezone: string;
    branchCode: string;
    branchName: string;
    slots: PublicAvailabilitySlot[];
    policy: {
      slotIntervalMinutes: number;
      defaultDurationMinutes: number;
      maxPartySizeOnline: number;
    };
  }>;
  createPublicReservation(input: {
    branchCode: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string | null;
    partySize: number;
    startAt: string;
    accessibilityRequired?: boolean;
    highChairCount?: number;
    specialRequests?: string | null;
    privacyAccepted: boolean;
    idempotencyKey: string;
  }): Promise<{
    reservationNumber: string;
    status: string;
    timezone: string;
    startAt: string;
    cancellationToken: string;
    idempotentReplay: boolean;
  }>;
  cancelPublicReservation(input: {
    reservationNumber: string;
    cancellationToken: string;
  }): Promise<{ reservationNumber: string; status: string; startAt: string }>;
  getPublicReservationStatus(input: {
    reservationNumber: string;
    cancellationToken: string;
  }): Promise<{ status: string; startAt: string }>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashCancellationToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function tokenHashesEqual(storedHash: string, candidateHash: string): boolean {
  const a = Buffer.from(storedHash, "utf8");
  const b = Buffer.from(candidateHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function maskRecipient(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.includes("@")) {
    const [local, domain] = v.split("@");
    const safeLocal = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local.slice(0, 2)}***`;
    return `${safeLocal}@${domain}`;
  }
  if (v.length <= 4) return "***";
  return `${v.slice(0, 2)}***${v.slice(-2)}`;
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function notFound(): never {
  throw new ApiError(404, "NOT_FOUND", "Reservation not found.");
}

export function createPublicBookingService(envStatus: EnvironmentStatus): PublicBookingService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));
  const internal: ReservationsService = createReservationsService(envStatus);

  async function loadOperatingBranchByCode(branchCode: string): Promise<{
    id: string;
    code: string;
    name: string;
    timezone: string;
  }> {
    const code = branchCode.trim();
    if (!code) throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch not found.");
    const { data, error } = await getClient()
      .from("branches")
      .select("id, branch_code, name, status, timezone")
      .eq("branch_code", code)
      .maybeSingle();
    if (error) throw new ApiError(500, "BRANCH_LOOKUP_FAILED", error.message);
    if (!data || data.status !== "operating") {
      throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch not found.");
    }
    const timezone = assertValidIanaTimezone(
      typeof data.timezone === "string" && data.timezone.trim() ? data.timezone : "Asia/Karachi",
    );
    return {
      id: data.id as string,
      code: data.branch_code as string,
      name: data.name as string,
      timezone,
    };
  }

  async function enqueueCommunication(entry: {
    branchId: string;
    reservationId: string;
    messageType: "confirmation" | "cancellation" | "reminder" | "waitlist_ready" | "confirmation_requested";
    templateCode: NotificationTemplateCode;
    channel: "email" | "none";
    recipientMasked: string | null;
    payload: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    await getClient().from("reservation_communications").insert({
      branch_id: entry.branchId,
      reservation_id: entry.reservationId,
      message_type: entry.messageType,
      channel: entry.channel,
      status: "queued",
      template_code: entry.templateCode,
      recipient_masked: entry.recipientMasked,
      payload: entry.payload,
      idempotency_key: entry.idempotencyKey,
      next_attempt_at: nowIso,
      retry_count: 0,
    });
  }

  return {
    async searchPublicAvailability(query) {
      const branch = await loadOperatingBranchByCode(query.branchCode);

      const { data: policyRow } = await getClient()
        .from("branch_booking_policies")
        .select("booking_enabled, online_booking_enabled, max_party_size_online, slot_interval_minutes, default_duration_minutes")
        .eq("branch_id", branch.id)
        .maybeSingle();

      if (!policyRow?.booking_enabled || !policyRow?.online_booking_enabled) {
        throw new ApiError(409, "ONLINE_BOOKING_DISABLED", "Online booking is not enabled for this branch.");
      }

      const maxParty = (policyRow.max_party_size_online as number | null) ?? 10;
      if (query.partySize > maxParty) {
        throw new ApiError(
          422,
          "VALIDATION_ERROR",
          `Party size cannot exceed ${maxParty} for online booking.`,
        );
      }

      const result = await internal.searchAvailability(SYSTEM_SCOPE, {
        branchId: branch.id,
        date: query.date,
        partySize: query.partySize,
      });

      return {
        timezone: result.timezone,
        branchCode: branch.code,
        branchName: branch.name,
        slots: result.slots.map((s) => ({
          startAt: s.startAt,
          endAt: s.endAt,
          available: s.available,
        })),
        policy: {
          slotIntervalMinutes: Number(result.policy.slotIntervalMinutes ?? 30),
          defaultDurationMinutes: Number(result.policy.defaultDurationMinutes ?? 90),
          maxPartySizeOnline: maxParty,
        },
      };
    },

    async createPublicReservation(input) {
      if (!input.privacyAccepted) {
        throw new ApiError(422, "PRIVACY_NOT_ACCEPTED", "Privacy acceptance is required.");
      }

      const branch = await loadOperatingBranchByCode(input.branchCode);
      const supabase = getClient();

      const { data: policyRow } = await supabase
        .from("branch_booking_policies")
        .select("*")
        .eq("branch_id", branch.id)
        .maybeSingle();

      if (!policyRow?.booking_enabled || !policyRow?.online_booking_enabled) {
        throw new ApiError(409, "ONLINE_BOOKING_DISABLED", "Online booking is not enabled for this branch.");
      }

      const maxParty = (policyRow.max_party_size_online as number | null) ?? 10;
      if (input.partySize > maxParty) {
        throw new ApiError(
          422,
          "VALIDATION_ERROR",
          `Party size cannot exceed ${maxParty} for online booking.`,
        );
      }

      const startAt = new Date(input.startAt);
      if (Number.isNaN(startAt.getTime())) {
        throw new ApiError(422, "VALIDATION_ERROR", "startAt is not a valid timestamp.");
      }

      const reservationDate = businessDateInTimezone(startAt, branch.timezone);

      const durationMinutes =
        (policyRow.default_duration_minutes as number | undefined) ?? 90;
      const expectedEnd = new Date(startAt.getTime() + durationMinutes * 60_000);

      const reservationPayload = {
        guest_name: input.guestName.trim(),
        guest_phone: input.guestPhone.trim(),
        guest_email: input.guestEmail?.trim() || null,
        start_at: startAt.toISOString(),
        expected_end_at: expectedEnd.toISOString(),
        reservation_date: reservationDate,
        party_size: input.partySize,
        high_chair_count: input.highChairCount ?? 0,
        accessibility_required: input.accessibilityRequired ?? false,
        booking_channel: "website",
        reservation_status: "pending",
        special_requests: input.specialRequests?.trim() || null,
      };

      // Stable hash excludes server-assigned tables and wall-clock privacy timestamp.
      const requestHash = hashPayload({
        branchId: branch.id,
        reservation: reservationPayload,
        privacyAccepted: true,
      });

      const { data: prior } = await supabase
        .from("reservations")
        .select(
          "id, reservation_number, reservation_status, idempotency_request_hash, cancellation_token_hash, cancellation_token_expires_at",
        )
        .eq("branch_id", branch.id)
        .eq("idempotency_key", input.idempotencyKey.trim())
        .maybeSingle();

      if (prior) {
        if (String(prior.idempotency_request_hash ?? "") !== requestHash) {
          throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was reused with a different payload.");
        }
        return {
          reservationNumber: prior.reservation_number as string,
          status: prior.reservation_status as string,
          timezone: branch.timezone,
          startAt: startAt.toISOString(),
          cancellationToken: "",
          idempotentReplay: true,
        };
      }

      // Server-side availability re-check (never trust the client slot).
      const availability = await internal.searchAvailability(SYSTEM_SCOPE, {
        branchId: branch.id,
        date: reservationDate,
        partySize: input.partySize,
        accessibleOnly: input.accessibilityRequired ?? false,
      });

      const matching = availability.slots.find(
        (s) => s.startAt === startAt.toISOString() && s.available,
      );
      if (!matching) {
        throw new ApiError(
          409,
          "SLOT_UNAVAILABLE",
          "That time is no longer available. Please choose another slot.",
        );
      }

      let tableIds: string[] = [];
      if (matching.tableOptions.length > 0) {
        tableIds = [matching.tableOptions[0]!.tableId];
      } else if (matching.combinationOptions.length > 0) {
        tableIds = matching.combinationOptions[0]!.tableIds;
      } else {
        throw new ApiError(409, "SLOT_UNAVAILABLE", "That time is no longer available.");
      }

      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = hashCancellationToken(rawToken);
      const tokenExpiresAt = new Date(Date.now() + CANCEL_TOKEN_TTL_MS).toISOString();
      const privacyAcceptedAt = new Date().toISOString();

      const { data, error } = await supabase.rpc("create_reservation_atomic", {
        p_idempotency_key: input.idempotencyKey.trim(),
        p_request_hash: requestHash,
        p_branch_id: branch.id,
        p_reservation: {
          ...reservationPayload,
          privacy_accepted_at: privacyAcceptedAt,
        },
        p_table_ids: tableIds,
        p_actor_user_id: null,
        p_override_capacity: false,
      });
      if (error) mapD3RpcError(error);

      const row = data as {
        id: string;
        reservationNumber: string;
        status: string;
        idempotentReplay: boolean;
      };

      if (!row.idempotentReplay) {
        const { error: tokenErr } = await supabase
          .from("reservations")
          .update({
            cancellation_token_hash: tokenHash,
            cancellation_token_expires_at: tokenExpiresAt,
            cancellation_token_revoked_at: null,
            privacy_accepted_at: privacyAcceptedAt,
            reservation_date: reservationDate,
          })
          .eq("id", row.id);
        if (tokenErr) {
          throw new ApiError(500, "RESERVATION_TOKEN_FAILED", tokenErr.message);
        }

        // Promote RPC outbox stub to a queued worker job (honest provider path).
        await supabase
          .from("reservation_communications")
          .update({
            status: "queued",
            message_type: "confirmation",
            channel: input.guestEmail ? "email" : "none",
            template_code: "reservation_confirmation",
            recipient_masked: maskRecipient(input.guestEmail) ?? maskRecipient(input.guestPhone),
            payload: {
              reservationNumber: row.reservationNumber,
              startAt: startAt.toISOString(),
              timezone: branch.timezone,
              partySize: input.partySize,
              guestEmail: input.guestEmail?.trim() || null,
            },
            idempotency_key: `confirm:${row.id}`,
            next_attempt_at: new Date().toISOString(),
            retry_count: 0,
          })
          .eq("reservation_id", row.id)
          .eq("message_type", "confirmation_requested");

        return {
          reservationNumber: row.reservationNumber,
          status: row.status,
          timezone: branch.timezone,
          startAt: startAt.toISOString(),
          cancellationToken: rawToken,
          idempotentReplay: false,
        };
      }

      // Idempotent replay: never re-issue the raw cancellation token.
      return {
        reservationNumber: row.reservationNumber,
        status: row.status,
        timezone: branch.timezone,
        startAt: startAt.toISOString(),
        cancellationToken: "",
        idempotentReplay: true,
      };
    },

    async cancelPublicReservation(input) {
      const number = input.reservationNumber.trim().toUpperCase();
      const { data: row, error } = await getClient()
        .from("reservations")
        .select(
          "id, branch_id, reservation_number, reservation_status, start_at, cancellation_token_hash, cancellation_token_expires_at, cancellation_token_revoked_at, guest_email, guest_phone",
        )
        .eq("reservation_number", number)
        .maybeSingle();
      if (error) throw new ApiError(500, "RESERVATION_LOOKUP_FAILED", error.message);
      if (!row?.cancellation_token_hash) notFound();

      const candidateHash = hashCancellationToken(input.cancellationToken);
      if (!tokenHashesEqual(row.cancellation_token_hash as string, candidateHash)) {
        notFound();
      }
      if (row.cancellation_token_revoked_at) notFound();
      const expiresAt = row.cancellation_token_expires_at
        ? new Date(row.cancellation_token_expires_at as string).getTime()
        : 0;
      if (!expiresAt || expiresAt < Date.now()) {
        notFound();
      }

      const status = row.reservation_status as string;
      if (["cancelled", "completed", "no_show", "declined", "seated"].includes(status)) {
        throw new ApiError(409, "RESERVATION_NOT_CANCELLABLE", "Reservation cannot be cancelled.");
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error: updErr } = await getClient()
        .from("reservations")
        .update({
          reservation_status: "cancelled",
          cancelled_at: nowIso,
          cancellation_reason: "guest_public_cancel",
          cancellation_token_revoked_at: nowIso,
        })
        .eq("id", row.id)
        .eq("reservation_status", status)
        .select("reservation_number, reservation_status, start_at")
        .maybeSingle();
      if (updErr) throw new ApiError(500, "RESERVATION_CANCEL_FAILED", updErr.message);
      if (!updated) {
        throw new ApiError(409, "RESERVATION_TRANSITION_CONFLICT", "Reservation changed concurrently. Retry.");
      }

      await getClient()
        .from("reservation_table_assignments")
        .update({ released_at: nowIso, release_reason: "cancelled" })
        .eq("reservation_id", row.id)
        .is("released_at", null);

      try {
        await enqueueCommunication({
          branchId: row.branch_id as string,
          reservationId: row.id as string,
          messageType: "cancellation",
          templateCode: "reservation_cancellation",
          channel: row.guest_email ? "email" : "none",
          recipientMasked: maskRecipient(row.guest_email as string | null) ?? maskRecipient(row.guest_phone as string | null),
          payload: {
            reservationNumber: updated.reservation_number,
            startAt: updated.start_at,
          },
          idempotencyKey: `cancel:${row.id}`,
        });
      } catch {
        // Outbox enqueue failure must not undo cancellation; worker can be retried manually.
      }

      await getClient().from("table_service_audit").insert({
        branch_id: row.branch_id,
        actor_user_id: null,
        actor_type: "guest",
        resource_type: "reservation",
        resource_id: row.id,
        action: "reservation_public_cancel",
        after_data: { status: "cancelled" },
      });

      return {
        reservationNumber: updated.reservation_number as string,
        status: updated.reservation_status as string,
        startAt: updated.start_at as string,
      };
    },

    async getPublicReservationStatus(input) {
      const number = input.reservationNumber.trim().toUpperCase();
      const { data: row, error } = await getClient()
        .from("reservations")
        .select(
          "reservation_status, start_at, cancellation_token_hash, cancellation_token_expires_at, cancellation_token_revoked_at",
        )
        .eq("reservation_number", number)
        .maybeSingle();
      if (error) throw new ApiError(500, "RESERVATION_LOOKUP_FAILED", error.message);
      if (!row?.cancellation_token_hash) notFound();

      const candidateHash = hashCancellationToken(input.cancellationToken);
      if (!tokenHashesEqual(row.cancellation_token_hash as string, candidateHash)) {
        notFound();
      }
      if (row.cancellation_token_revoked_at) notFound();
      const expiresAt = row.cancellation_token_expires_at
        ? new Date(row.cancellation_token_expires_at as string).getTime()
        : 0;
      if (!expiresAt || expiresAt < Date.now()) {
        notFound();
      }

      return {
        status: row.reservation_status as string,
        startAt: row.start_at as string,
      };
    },
  };
}
