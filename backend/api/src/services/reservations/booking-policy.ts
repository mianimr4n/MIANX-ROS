import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";

export const BOOKING_POLICY_STATUSES = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "APPROVED",
  "ACTIVE",
  "RETIRED",
] as const;

export type BookingPolicyStatus = (typeof BOOKING_POLICY_STATUSES)[number];

export interface BookingPolicyRecord {
  id: string;
  branchId: string;
  version: number;
  status: BookingPolicyStatus;
  bookingEnabled: boolean;
  onlineBookingEnabled: boolean;
  minimumPartySize: number;
  maximumPartySize: number;
  bookingIntervalMinutes: number;
  minimumAdvanceMinutes: number;
  maximumAdvanceDays: number;
  cancellationWindowMinutes: number;
  gracePeriodMinutes: number;
  tableHoldMinutes: number;
  waitlistEnabled: boolean;
  sameDayBookingEnabled: boolean;
  specialNotes: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPolicyDraftInput {
  branchId: string;
  bookingEnabled?: boolean;
  onlineBookingEnabled?: boolean;
  minimumPartySize?: number;
  maximumPartySize?: number;
  bookingIntervalMinutes?: number;
  minimumAdvanceMinutes?: number;
  maximumAdvanceDays?: number;
  cancellationWindowMinutes?: number;
  gracePeriodMinutes?: number;
  tableHoldMinutes?: number;
  waitlistEnabled?: boolean;
  sameDayBookingEnabled?: boolean;
  specialNotes?: string | null;
}

export interface BookingPolicyService {
  getCurrent(scope: BranchActorScope, branchId: string): Promise<BookingPolicyRecord | null>;
  listVersions(scope: BranchActorScope, branchId: string): Promise<BookingPolicyRecord[]>;
  createDraft(actor: AuthPrincipal, input: BookingPolicyDraftInput): Promise<BookingPolicyRecord>;
  updateDraft(
    actor: AuthPrincipal,
    policyId: string,
    patch: Omit<BookingPolicyDraftInput, "branchId">,
  ): Promise<BookingPolicyRecord>;
  submitForReview(actor: AuthPrincipal, policyId: string): Promise<BookingPolicyRecord>;
  approve(actor: AuthPrincipal, policyId: string): Promise<BookingPolicyRecord>;
  activate(actor: AuthPrincipal, policyId: string): Promise<BookingPolicyRecord>;
  retire(actor: AuthPrincipal, policyId: string): Promise<BookingPolicyRecord>;
}

type PolicyRow = {
  id: string;
  branch_id: string;
  version: number;
  status: BookingPolicyStatus;
  booking_enabled: boolean;
  online_booking_enabled: boolean;
  minimum_party_size: number;
  max_party_size_online: number;
  slot_interval_minutes: number;
  min_advance_minutes: number;
  max_advance_days: number;
  cancellation_cutoff_minutes: number;
  grace_period_minutes: number;
  table_hold_minutes: number;
  waitlist_enabled: boolean;
  same_day_booking_enabled: boolean;
  special_notes: string | null;
  effective_from: string | null;
  effective_until: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT = [
  "id",
  "branch_id",
  "version",
  "status",
  "booking_enabled",
  "online_booking_enabled",
  "minimum_party_size",
  "max_party_size_online",
  "slot_interval_minutes",
  "min_advance_minutes",
  "max_advance_days",
  "cancellation_cutoff_minutes",
  "grace_period_minutes",
  "table_hold_minutes",
  "waitlist_enabled",
  "same_day_booking_enabled",
  "special_notes",
  "effective_from",
  "effective_until",
  "approved_by",
  "approved_at",
  "created_by",
  "created_at",
  "updated_at",
].join(", ");

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRow(row: PolicyRow): BookingPolicyRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    version: row.version,
    status: row.status,
    bookingEnabled: row.booking_enabled,
    onlineBookingEnabled: row.online_booking_enabled,
    minimumPartySize: row.minimum_party_size,
    maximumPartySize: row.max_party_size_online,
    bookingIntervalMinutes: row.slot_interval_minutes,
    minimumAdvanceMinutes: row.min_advance_minutes,
    maximumAdvanceDays: row.max_advance_days,
    cancellationWindowMinutes: row.cancellation_cutoff_minutes,
    gracePeriodMinutes: row.grace_period_minutes,
    tableHoldMinutes: row.table_hold_minutes,
    waitlistEnabled: row.waitlist_enabled,
    sameDayBookingEnabled: row.same_day_booking_enabled,
    specialNotes: row.special_notes,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertCanManage(actor: AuthPrincipal, branchId: string): void {
  if (actor.isSuperAdmin) return;
  if (!actor.roles.includes("branch-manager") || !actor.branchIds.includes(branchId)) {
    throw new ApiError(403, "FORBIDDEN", "Booking policy writes require super-admin or assigned branch-manager.");
  }
}

function validateWindows(input: {
  minimumPartySize: number;
  maximumPartySize: number;
  bookingIntervalMinutes: number;
  minimumAdvanceMinutes: number;
  maximumAdvanceDays: number;
  cancellationWindowMinutes: number;
  gracePeriodMinutes: number;
  tableHoldMinutes: number;
}): void {
  if (input.minimumPartySize < 1 || input.maximumPartySize < input.minimumPartySize) {
    throw new ApiError(400, "INVALID_PARTY_SIZE", "Party size range is invalid.");
  }
  if (input.bookingIntervalMinutes < 5 || input.bookingIntervalMinutes > 240) {
    throw new ApiError(400, "INVALID_INTERVAL", "Booking interval must be between 5 and 240 minutes.");
  }
  if (input.minimumAdvanceMinutes < 0 || input.maximumAdvanceDays < 1) {
    throw new ApiError(400, "INVALID_ADVANCE_WINDOW", "Advance booking window is invalid.");
  }
  if (
    input.cancellationWindowMinutes < 0 ||
    input.gracePeriodMinutes < 0 ||
    input.tableHoldMinutes < 0 ||
    input.tableHoldMinutes > 240
  ) {
    throw new ApiError(400, "INVALID_TIME_WINDOWS", "Cancellation, grace, or hold window is invalid.");
  }
}

function toDbPatch(patch: Omit<BookingPolicyDraftInput, "branchId">): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.bookingEnabled !== undefined) out.booking_enabled = patch.bookingEnabled;
  if (patch.onlineBookingEnabled !== undefined) out.online_booking_enabled = patch.onlineBookingEnabled;
  if (patch.minimumPartySize !== undefined) out.minimum_party_size = patch.minimumPartySize;
  if (patch.maximumPartySize !== undefined) out.max_party_size_online = patch.maximumPartySize;
  if (patch.bookingIntervalMinutes !== undefined) out.slot_interval_minutes = patch.bookingIntervalMinutes;
  if (patch.minimumAdvanceMinutes !== undefined) out.min_advance_minutes = patch.minimumAdvanceMinutes;
  if (patch.maximumAdvanceDays !== undefined) out.max_advance_days = patch.maximumAdvanceDays;
  if (patch.cancellationWindowMinutes !== undefined) {
    out.cancellation_cutoff_minutes = patch.cancellationWindowMinutes;
  }
  if (patch.gracePeriodMinutes !== undefined) out.grace_period_minutes = patch.gracePeriodMinutes;
  if (patch.tableHoldMinutes !== undefined) out.table_hold_minutes = patch.tableHoldMinutes;
  if (patch.waitlistEnabled !== undefined) out.waitlist_enabled = patch.waitlistEnabled;
  if (patch.sameDayBookingEnabled !== undefined) {
    out.same_day_booking_enabled = patch.sameDayBookingEnabled;
  }
  if (patch.specialNotes !== undefined) out.special_notes = patch.specialNotes;
  return out;
}

export function createBookingPolicyService(envStatus: EnvironmentStatus): BookingPolicyService {
  async function loadPolicy(admin: SupabaseClient, policyId: string): Promise<PolicyRow> {
    const { data, error } = await admin
      .from("branch_booking_policies")
      .select(SELECT)
      .eq("id", policyId)
      .maybeSingle();
    if (error) throw new ApiError(500, "POLICY_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "POLICY_NOT_FOUND", "Booking policy not found.");
    return data as unknown as PolicyRow;
  }

  return {
    async getCurrent(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data: active, error: activeError } = await admin
        .from("branch_booking_policies")
        .select(SELECT)
        .eq("branch_id", branchId)
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (activeError) throw new ApiError(500, "POLICY_LOOKUP_FAILED", activeError.message);
      if (active) return mapRow(active as unknown as PolicyRow);

      const { data: latest, error } = await admin
        .from("branch_booking_policies")
        .select(SELECT)
        .eq("branch_id", branchId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new ApiError(500, "POLICY_LOOKUP_FAILED", error.message);
      return latest ? mapRow(latest as unknown as PolicyRow) : null;
    },

    async listVersions(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_booking_policies")
        .select(SELECT)
        .eq("branch_id", branchId)
        .order("version", { ascending: false });
      if (error) throw new ApiError(500, "POLICY_LIST_FAILED", error.message);
      return ((data ?? []) as unknown as PolicyRow[]).map(mapRow);
    },

    async createDraft(actor, input) {
      assertCanManage(actor, input.branchId);
      await loadBranchRow(createServiceClient(envStatus), input.branchId);

      const minimumPartySize = input.minimumPartySize ?? 1;
      const maximumPartySize = input.maximumPartySize ?? 10;
      const bookingIntervalMinutes = input.bookingIntervalMinutes ?? 30;
      const minimumAdvanceMinutes = input.minimumAdvanceMinutes ?? 30;
      const maximumAdvanceDays = input.maximumAdvanceDays ?? 30;
      const cancellationWindowMinutes = input.cancellationWindowMinutes ?? 60;
      const gracePeriodMinutes = input.gracePeriodMinutes ?? 15;
      const tableHoldMinutes = input.tableHoldMinutes ?? 15;

      validateWindows({
        minimumPartySize,
        maximumPartySize,
        bookingIntervalMinutes,
        minimumAdvanceMinutes,
        maximumAdvanceDays,
        cancellationWindowMinutes,
        gracePeriodMinutes,
        tableHoldMinutes,
      });

      const admin = createServiceClient(envStatus);
      const { data: maxRow } = await admin
        .from("branch_booking_policies")
        .select("version")
        .eq("branch_id", input.branchId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = ((maxRow as { version?: number } | null)?.version ?? 0) + 1;

      const { data, error } = await admin
        .from("branch_booking_policies")
        .insert({
          branch_id: input.branchId,
          version: nextVersion,
          status: "DRAFT",
          booking_enabled: input.bookingEnabled ?? false,
          online_booking_enabled: input.onlineBookingEnabled ?? false,
          minimum_party_size: minimumPartySize,
          max_party_size_online: maximumPartySize,
          slot_interval_minutes: bookingIntervalMinutes,
          min_advance_minutes: minimumAdvanceMinutes,
          max_advance_days: maximumAdvanceDays,
          cancellation_cutoff_minutes: cancellationWindowMinutes,
          grace_period_minutes: gracePeriodMinutes,
          table_hold_minutes: tableHoldMinutes,
          waitlist_enabled: input.waitlistEnabled ?? true,
          same_day_booking_enabled: input.sameDayBookingEnabled ?? true,
          special_notes: input.specialNotes ?? null,
          created_by: actor.userId,
        })
        .select(SELECT)
        .single();

      if (error || !data) {
        throw new ApiError(500, "POLICY_CREATE_FAILED", error?.message ?? "create failed");
      }
      return mapRow(data as unknown as PolicyRow);
    },

    async updateDraft(actor, policyId, patch) {
      const admin = createServiceClient(envStatus);
      const row = await loadPolicy(admin, policyId);
      assertCanManage(actor, row.branch_id);
      if (row.status !== "DRAFT" && row.status !== "REVIEW_REQUIRED") {
        throw new ApiError(409, "POLICY_NOT_EDITABLE", "Only DRAFT or REVIEW_REQUIRED policies can be edited.");
      }

      const next = {
        minimumPartySize: patch.minimumPartySize ?? row.minimum_party_size,
        maximumPartySize: patch.maximumPartySize ?? row.max_party_size_online,
        bookingIntervalMinutes: patch.bookingIntervalMinutes ?? row.slot_interval_minutes,
        minimumAdvanceMinutes: patch.minimumAdvanceMinutes ?? row.min_advance_minutes,
        maximumAdvanceDays: patch.maximumAdvanceDays ?? row.max_advance_days,
        cancellationWindowMinutes: patch.cancellationWindowMinutes ?? row.cancellation_cutoff_minutes,
        gracePeriodMinutes: patch.gracePeriodMinutes ?? row.grace_period_minutes,
        tableHoldMinutes: patch.tableHoldMinutes ?? row.table_hold_minutes,
      };
      validateWindows(next);

      const { data, error } = await admin
        .from("branch_booking_policies")
        .update({
          ...toDbPatch(patch),
          status: "DRAFT",
          submitted_by: null,
          submitted_at: null,
        })
        .eq("id", policyId)
        .select(SELECT)
        .single();
      if (error || !data) {
        throw new ApiError(500, "POLICY_UPDATE_FAILED", error?.message ?? "update failed");
      }
      return mapRow(data as unknown as PolicyRow);
    },

    async submitForReview(actor, policyId) {
      const admin = createServiceClient(envStatus);
      const row = await loadPolicy(admin, policyId);
      assertCanManage(actor, row.branch_id);
      if (row.status !== "DRAFT") {
        throw new ApiError(409, "POLICY_NOT_DRAFT", "Only DRAFT policies can be submitted for review.");
      }
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_booking_policies")
        .update({
          status: "REVIEW_REQUIRED",
          submitted_by: actor.userId,
          submitted_at: now,
        })
        .eq("id", policyId)
        .select(SELECT)
        .single();
      if (error || !data) {
        throw new ApiError(500, "POLICY_SUBMIT_FAILED", error?.message ?? "submit failed");
      }
      return mapRow(data as unknown as PolicyRow);
    },

    async approve(actor, policyId) {
      if (!actor.isSuperAdmin) {
        throw new ApiError(
          403,
          "FOUNDER_APPROVAL_REQUIRED",
          "Booking policy approval requires Founder (super-admin).",
        );
      }
      const admin = createServiceClient(envStatus);
      const row = await loadPolicy(admin, policyId);
      if (row.status !== "REVIEW_REQUIRED" && row.status !== "DRAFT") {
        throw new ApiError(409, "POLICY_NOT_APPROVABLE", "Policy is not awaiting approval.");
      }
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_booking_policies")
        .update({
          status: "APPROVED",
          approved_by: actor.userId,
          approved_at: now,
        })
        .eq("id", policyId)
        .select(SELECT)
        .single();
      if (error || !data) {
        throw new ApiError(500, "POLICY_APPROVE_FAILED", error?.message ?? "approve failed");
      }
      return mapRow(data as unknown as PolicyRow);
    },

    async activate(actor, policyId) {
      if (!actor.isSuperAdmin) {
        throw new ApiError(403, "FORBIDDEN", "Only Founder (super-admin) may activate a booking policy.");
      }
      const admin = createServiceClient(envStatus);
      const row = await loadPolicy(admin, policyId);
      if (row.status !== "APPROVED" && row.status !== "ACTIVE") {
        throw new ApiError(
          409,
          "POLICY_NOT_APPROVED",
          "Unapproved policies cannot appear ACTIVE. Approve first.",
        );
      }
      if (row.status === "ACTIVE") return mapRow(row);

      const now = new Date().toISOString();
      // Retire any currently ACTIVE policy for this branch first.
      const { error: retireError } = await admin
        .from("branch_booking_policies")
        .update({
          status: "RETIRED",
          retired_by: actor.userId,
          retired_at: now,
          effective_until: now,
        })
        .eq("branch_id", row.branch_id)
        .eq("status", "ACTIVE");
      if (retireError) {
        throw new ApiError(500, "POLICY_RETIRE_FAILED", retireError.message);
      }

      const { data, error } = await admin
        .from("branch_booking_policies")
        .update({
          status: "ACTIVE",
          effective_from: now,
          effective_until: null,
          // Activation does not auto-enable booking; explicit booking_enabled remains.
        })
        .eq("id", policyId)
        .select(SELECT)
        .single();
      if (error || !data) {
        throw new ApiError(500, "POLICY_ACTIVATE_FAILED", error?.message ?? "activate failed");
      }
      return mapRow(data as unknown as PolicyRow);
    },

    async retire(actor, policyId) {
      if (!actor.isSuperAdmin) {
        throw new ApiError(403, "FORBIDDEN", "Only Founder (super-admin) may retire a booking policy.");
      }
      const admin = createServiceClient(envStatus);
      const row = await loadPolicy(admin, policyId);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_booking_policies")
        .update({
          status: "RETIRED",
          retired_by: actor.userId,
          retired_at: now,
          effective_until: now,
          booking_enabled: false,
        })
        .eq("id", policyId)
        .select(SELECT)
        .single();
      if (error || !data) {
        throw new ApiError(500, "POLICY_RETIRE_FAILED", error?.message ?? "retire failed");
      }
      return mapRow(data as unknown as PolicyRow);
    },
  };
}
