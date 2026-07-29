import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";

// ---------------------------------------------------------------------------
// Const arrays — must match migration check constraints
// ---------------------------------------------------------------------------

export const SOP_CODES = [
  "ORDER_CONFIRMATION",
  "KITCHEN_PROGRESSION",
  "DELIVERY_DISPATCH",
  "CANCELLATION_REFUND",
  "OPENING_CHECKLIST",
  "CLOSING_CHECKLIST",
  "CASH_RECONCILIATION",
  "RESERVATION_AND_WAITLIST",
  "INCIDENT_ESCALATION",
] as const;
export type SopCode = (typeof SOP_CODES)[number];

export const TRAINING_CODES = [
  "BRANCH_MANAGER",
  "CASHIER_POS",
  "KITCHEN",
  "RIDER_DELIVERY",
  "HOST_WAITER",
  "CUSTOMER_SUPPORT",
  "OPENING_AND_CLOSING",
  "SAFETY_AND_INCIDENT",
  "CASH_RECONCILIATION",
] as const;
export type TrainingCode = (typeof TRAINING_CODES)[number];

export const ROLE_REHEARSAL_CODES = [
  "BRANCH_MANAGER_OPENING",
  "CASHIER_POS",
  "KITCHEN_ORDER_FLOW",
  "RIDER_DISPATCH",
  "HOST_WAITER_FLOOR",
  "CUSTOMER_SUPPORT_ESCALATION",
] as const;
export type RoleRehearsalCode = (typeof ROLE_REHEARSAL_CODES)[number];

export const FOUNDER_DECISIONS = [
  "NOT_READY",
  "REVIEW_REQUIRED",
  "GO_CONDITIONAL",
  "GO_APPROVED",
  "NO_GO",
  "WITHDRAWN",
] as const;
export type FounderDecision = (typeof FOUNDER_DECISIONS)[number];

export const CANONICAL_ROLE_CODES = [
  "super-admin",
  "branch-manager",
  "kitchen",
  "cashier",
  "rider",
  "customer-support",
  "host",
  "waiter",
] as const;
export type CanonicalRoleCode = (typeof CANONICAL_ROLE_CODES)[number];

// ---------------------------------------------------------------------------
// Record types (camelCase — aligns with admin-api.ts OpeningSopReview etc.)
// ---------------------------------------------------------------------------

export interface SopReviewRecord {
  id: string;
  branchId: string;
  sopCode: SopCode;
  documentReference: string | null;
  documentVersion: string | null;
  reviewStatus: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  operationalVerificationStatus: string;
  operationallyVerifiedAt: string | null;
  reviewDueAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSessionRecord {
  id: string;
  branchId: string;
  trainingCode: TrainingCode;
  title: string;
  scheduledAt: string | null;
  completedAt: string | null;
  trainingStatus: string;
  result: string;
  localTestOnly: boolean;
  followUpRequired: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRehearsalRecord {
  id: string;
  branchId: string;
  rehearsalCode: RoleRehearsalCode;
  scenario: string;
  scheduledAt: string | null;
  completedAt: string | null;
  rehearsalStatus: string;
  result: string;
  localTestOnly: boolean;
  retestRequired: boolean;
  issuesFound: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface E2eRehearsalRecord {
  id: string;
  branchId: string;
  scheduledAt: string | null;
  completedAt: string | null;
  status: string;
  result: string;
  localTestOnly: boolean;
  criticalFailures: number;
  stagesCompleted: unknown[];
  stagesFailed: unknown[];
  retestRequired: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FounderDecisionRecord {
  id: string;
  branchId: string;
  decision: FounderDecision;
  decisionNotes: string | null;
  conditions: string | null;
  decidedAt: string;
  completedItems: number;
  requiredItems: number;
  readinessPercentage: number | null;
  createdAt: string;
}

export interface OwnerHandoverRecord {
  id: string;
  branchId: string;
  handoverStatus: string;
  intendedOwnerName: string | null;
  intendedOwnerContactReference: string | null;
  handoverScope: string | null;
  accessReviewStatus: string;
  operationalDocumentsReviewed: boolean;
  financialProcedureReviewed: boolean;
  staffStructureReviewed: boolean;
  deviceInventoryReviewed: boolean;
  unresolvedItems: string | null;
  acceptedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface TrainingParticipantRecord {
  id: string;
  trainingSessionId: string;
  branchId: string;
  userId: string;
  canonicalRoleCode: CanonicalRoleCode;
  attendanceStatus: string;
  assessmentResult: string;
  acknowledgedAt: string | null;
  remediationRequired: boolean;
  remediationDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningGovernanceService {
  // SOPs
  listSops(scope: BranchActorScope, branchId: string): Promise<SopReviewRecord[]>;
  upsertSop(
    actor: AuthPrincipal,
    input: {
      id?: string;
      branchId: string;
      sopCode: SopCode;
      documentReference?: string | null;
      documentVersion?: string | null;
      notes?: string | null;
    },
  ): Promise<SopReviewRecord>;
  approveSop(actor: AuthPrincipal, id: string, notes?: string | null): Promise<SopReviewRecord>;
  verifySopOperational(
    actor: AuthPrincipal,
    id: string,
    input: { summary: string; evidenceType?: string },
  ): Promise<SopReviewRecord>;
  reviewSop(actor: AuthPrincipal, id: string, notes?: string | null): Promise<SopReviewRecord>;
  failSop(actor: AuthPrincipal, id: string, reason: string): Promise<SopReviewRecord>;
  expireSop(actor: AuthPrincipal, id: string): Promise<SopReviewRecord>;
  getSopHistory(scope: BranchActorScope, sopId: string): Promise<unknown[]>;

  // Training
  listTraining(scope: BranchActorScope, branchId: string): Promise<TrainingSessionRecord[]>;
  upsertTraining(
    actor: AuthPrincipal,
    input: {
      id?: string;
      branchId: string;
      trainingCode: TrainingCode;
      title: string;
      scheduledAt?: string | null;
      notes?: string | null;
    },
  ): Promise<TrainingSessionRecord>;
  completeTraining(
    actor: AuthPrincipal,
    id: string,
    input: { result?: "PASS" | "CONDITIONAL_PASS" | "FAIL"; localTestOnly?: boolean; notes?: string | null },
  ): Promise<TrainingSessionRecord>;
  failTraining(actor: AuthPrincipal, id: string, reason: string): Promise<TrainingSessionRecord>;
  addTrainingParticipant(
    actor: AuthPrincipal,
    sessionId: string,
    input: { userId: string; roleCode: CanonicalRoleCode },
  ): Promise<TrainingParticipantRecord>;
  recordAttendance(
    actor: AuthPrincipal,
    participantId: string,
    status: "INVITED" | "CONFIRMED" | "ATTENDED" | "ABSENT" | "EXCUSED",
  ): Promise<TrainingParticipantRecord>;
  recordAssessment(
    actor: AuthPrincipal,
    participantId: string,
    result: "NOT_ASSESSED" | "PASS" | "CONDITIONAL_PASS" | "FAIL",
    notes?: string,
  ): Promise<TrainingParticipantRecord>;
  scheduleRemediation(
    actor: AuthPrincipal,
    participantId: string,
    dueAt: string,
  ): Promise<TrainingParticipantRecord>;
  getTrainingHistory(scope: BranchActorScope, sessionId: string): Promise<unknown[]>;

  // Role rehearsals
  listRoleRehearsals(scope: BranchActorScope, branchId: string): Promise<RoleRehearsalRecord[]>;
  upsertRoleRehearsal(
    actor: AuthPrincipal,
    input: {
      id?: string;
      branchId: string;
      rehearsalCode: RoleRehearsalCode;
      scenario: string;
      scheduledAt?: string | null;
      notes?: string | null;
    },
  ): Promise<RoleRehearsalRecord>;
  completeRoleRehearsal(
    actor: AuthPrincipal,
    id: string,
    input: {
      result?: "PASS" | "CONDITIONAL_PASS" | "FAIL";
      localTestOnly?: boolean;
      notes?: string | null;
      issuesFound?: string | null;
    },
  ): Promise<RoleRehearsalRecord>;
  failRoleRehearsal(actor: AuthPrincipal, id: string, reason: string): Promise<RoleRehearsalRecord>;
  retestRoleRehearsal(actor: AuthPrincipal, id: string, notes?: string | null, dueAt?: string): Promise<RoleRehearsalRecord>;

  // E2E rehearsals
  listE2eRehearsals(scope: BranchActorScope, branchId: string): Promise<E2eRehearsalRecord[]>;
  scheduleE2eRehearsal(
    actor: AuthPrincipal,
    input: { branchId: string; scheduledAt?: string | null; notes?: string | null },
  ): Promise<E2eRehearsalRecord>;
  completeE2eRehearsal(
    actor: AuthPrincipal,
    id: string,
    input: {
      result?: "PASS" | "CONDITIONAL_PASS" | "FAIL";
      localTestOnly?: boolean;
      stagesCompleted?: string[];
      notes?: string | null;
    },
  ): Promise<E2eRehearsalRecord>;
  failE2eRehearsal(actor: AuthPrincipal, id: string, reason: string): Promise<E2eRehearsalRecord>;

  // Founder decisions (super-admin only)
  listFounderDecisions(scope: BranchActorScope, branchId: string): Promise<FounderDecisionRecord[]>;
  recordFounderDecision(
    actor: AuthPrincipal,
    input: {
      branchId: string;
      decision: FounderDecision;
      decisionNotes?: string | null;
      conditions?: string | null;
    },
  ): Promise<FounderDecisionRecord>;

  // Owner handover
  getOwnerHandover(scope: BranchActorScope, branchId: string): Promise<OwnerHandoverRecord | null>;
  upsertOwnerHandover(
    actor: AuthPrincipal,
    input: {
      branchId: string;
      intendedOwnerName?: string | null;
      intendedOwnerContactReference?: string | null;
      handoverScope?: string | null;
      operationalDocumentsReviewed?: boolean;
      financialProcedureReviewed?: boolean;
      staffStructureReviewed?: boolean;
      deviceInventoryReviewed?: boolean;
      unresolvedItems?: string | null;
      notes?: string | null;
    },
  ): Promise<OwnerHandoverRecord>;
  markOwnerHandoverReady(actor: AuthPrincipal, branchId: string): Promise<OwnerHandoverRecord>;
  submitOwnerHandoverReview(actor: AuthPrincipal, branchId: string): Promise<OwnerHandoverRecord>;
  acceptOwnerHandover(
    actor: AuthPrincipal,
    branchId: string,
    acceptedByReference: string,
  ): Promise<OwnerHandoverRecord>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertCanManage(actor: AuthPrincipal, branchId: string): void {
  if (actor.isSuperAdmin) return;
  const isBm = actor.roles.some((r) => r === "branch-manager");
  if (!isBm) {
    throw new ApiError(403, "FORBIDDEN", "Opening governance requires super-admin or branch-manager.");
  }
  if (!actor.branchIds.includes(branchId)) {
    throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Branch-manager may only manage their assigned branch.");
  }
}

function assertSuperAdmin(actor: AuthPrincipal): void {
  if (!actor.isSuperAdmin) {
    throw new ApiError(403, "SUPER_ADMIN_REQUIRED", "Only super-admin may perform this action.");
  }
}

// ---------------------------------------------------------------------------
// Mappers (snake_case DB row → camelCase record)
// ---------------------------------------------------------------------------

function mapSop(row: Record<string, unknown>): SopReviewRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    sopCode: row.sop_code as SopCode,
    documentReference: (row.document_reference as string | null) ?? null,
    documentVersion: (row.document_version as string | null) ?? null,
    reviewStatus: String(row.review_status),
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    approvedAt: (row.approved_at as string | null) ?? null,
    operationalVerificationStatus: String(row.operational_verification_status),
    operationallyVerifiedAt: (row.operationally_verified_at as string | null) ?? null,
    reviewDueAt: (row.review_due_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTraining(row: Record<string, unknown>): TrainingSessionRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    trainingCode: row.training_code as TrainingCode,
    title: String(row.title),
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    trainingStatus: String(row.training_status),
    result: String(row.result),
    localTestOnly: Boolean(row.local_test_only),
    followUpRequired: Boolean(row.follow_up_required),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapParticipant(row: Record<string, unknown>): TrainingParticipantRecord {
  return {
    id: String(row.id),
    trainingSessionId: String(row.training_session_id),
    branchId: String(row.branch_id),
    userId: String(row.user_id),
    canonicalRoleCode: row.canonical_role_code as CanonicalRoleCode,
    attendanceStatus: String(row.attendance_status),
    assessmentResult: String(row.assessment_result),
    acknowledgedAt: (row.acknowledged_at as string | null) ?? null,
    remediationRequired: Boolean(row.remediation_required),
    remediationDueAt: (row.remediation_due_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRoleRehearsal(row: Record<string, unknown>): RoleRehearsalRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    rehearsalCode: row.rehearsal_code as RoleRehearsalCode,
    scenario: String(row.scenario),
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    rehearsalStatus: String(row.rehearsal_status),
    result: String(row.result),
    localTestOnly: Boolean(row.local_test_only),
    retestRequired: Boolean(row.retest_required),
    issuesFound: (row.issues_found as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapE2e(row: Record<string, unknown>): E2eRehearsalRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    status: String(row.status),
    result: String(row.result),
    localTestOnly: Boolean(row.local_test_only),
    criticalFailures: Number(row.critical_failures ?? 0),
    stagesCompleted: (row.stages_completed as unknown[]) ?? [],
    stagesFailed: (row.stages_failed as unknown[]) ?? [],
    retestRequired: Boolean(row.retest_required),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapFounderDecision(row: Record<string, unknown>): FounderDecisionRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    decision: row.decision as FounderDecision,
    decisionNotes: (row.decision_notes as string | null) ?? null,
    conditions: (row.conditions as string | null) ?? null,
    decidedAt: String(row.decided_at),
    completedItems: Number(row.completed_items ?? 0),
    requiredItems: Number(row.required_items ?? 0),
    readinessPercentage: (row.readiness_percentage as number | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapOwnerHandover(row: Record<string, unknown>): OwnerHandoverRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    handoverStatus: String(row.handover_status),
    intendedOwnerName: (row.intended_owner_name as string | null) ?? null,
    intendedOwnerContactReference: (row.intended_owner_contact_reference as string | null) ?? null,
    handoverScope: (row.handover_scope as string | null) ?? null,
    accessReviewStatus: String(row.access_review_status),
    operationalDocumentsReviewed: Boolean(row.operational_documents_reviewed),
    financialProcedureReviewed: Boolean(row.financial_procedure_reviewed),
    staffStructureReviewed: Boolean(row.staff_structure_reviewed),
    deviceInventoryReviewed: Boolean(row.device_inventory_reviewed),
    unresolvedItems: (row.unresolved_items as string | null) ?? null,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Loader helpers
// ---------------------------------------------------------------------------

async function loadSopRow(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("branch_sop_reviews").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "SOP_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "SOP_NOT_FOUND", "SOP review not found.");
  return data as Record<string, unknown>;
}

async function loadTrainingRow(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("branch_training_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "TRAINING_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "TRAINING_NOT_FOUND", "Training session not found.");
  return data as Record<string, unknown>;
}

async function loadParticipantRow(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("branch_training_participants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "PARTICIPANT_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "PARTICIPANT_NOT_FOUND", "Training participant not found.");
  return data as Record<string, unknown>;
}

async function loadRoleRehearsalRow(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("branch_role_rehearsals").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "REHEARSAL_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "REHEARSAL_NOT_FOUND", "Role rehearsal not found.");
  return data as Record<string, unknown>;
}

async function loadE2eRow(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("branch_e2e_rehearsals").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "E2E_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "E2E_NOT_FOUND", "E2E rehearsal not found.");
  return data as Record<string, unknown>;
}

async function loadOwnerHandoverRow(admin: SupabaseClient, branchId: string) {
  const { data, error } = await admin
    .from("branch_owner_handover_records")
    .select("*")
    .eq("branch_id", branchId)
    .maybeSingle();
  if (error) throw new ApiError(500, "HANDOVER_LOOKUP_FAILED", error.message);
  return data as Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

async function appendSopEvent(
  admin: SupabaseClient,
  params: { sopReviewId: string; branchId: string; eventType: string; fromStatus?: string; toStatus?: string; actorUserId: string; notes?: string | null },
) {
  await admin.from("branch_sop_review_events").insert({
    sop_review_id: params.sopReviewId,
    branch_id: params.branchId,
    event_type: params.eventType,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    actor_user_id: params.actorUserId,
    notes: params.notes ?? null,
  });
}

async function appendTrainingEvent(
  admin: SupabaseClient,
  params: { trainingSessionId: string; branchId: string; eventType: string; fromStatus?: string; toStatus?: string; actorUserId: string; notes?: string | null },
) {
  await admin.from("branch_training_events").insert({
    training_session_id: params.trainingSessionId,
    branch_id: params.branchId,
    event_type: params.eventType,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    actor_user_id: params.actorUserId,
    notes: params.notes ?? null,
  });
}

async function appendRoleRehearsalEvent(
  admin: SupabaseClient,
  params: { rehearsalId: string; branchId: string; eventType: string; fromStatus?: string; toStatus?: string; actorUserId: string; notes?: string | null },
) {
  await admin.from("branch_role_rehearsal_events").insert({
    rehearsal_id: params.rehearsalId,
    branch_id: params.branchId,
    event_type: params.eventType,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    actor_user_id: params.actorUserId,
    notes: params.notes ?? null,
  });
}

async function appendE2eEvent(
  admin: SupabaseClient,
  params: { rehearsalId: string; branchId: string; eventType: string; fromStatus?: string; toStatus?: string; actorUserId: string; notes?: string | null },
) {
  await admin.from("branch_e2e_rehearsal_events").insert({
    rehearsal_id: params.rehearsalId,
    branch_id: params.branchId,
    event_type: params.eventType,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    actor_user_id: params.actorUserId,
    notes: params.notes ?? null,
  });
}

async function appendOwnerHandoverEvent(
  admin: SupabaseClient,
  params: { handoverId: string; branchId: string; eventType: string; fromStatus?: string; toStatus?: string; actorUserId: string; notes?: string | null },
) {
  await admin.from("branch_owner_handover_events").insert({
    handover_id: params.handoverId,
    branch_id: params.branchId,
    event_type: params.eventType,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    actor_user_id: params.actorUserId,
    notes: params.notes ?? null,
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOpeningGovernanceService(envStatus: EnvironmentStatus): OpeningGovernanceService {
  return {
    // ------------------------------------------------------------------
    // SOPs
    // ------------------------------------------------------------------

    async listSops(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_sop_reviews")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "SOP_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapSop);
    },

    async upsertSop(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);

      if (input.id) {
        const row = await loadSopRow(admin, input.id);
        if (String(row.branch_id) !== input.branchId) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "SOP belongs to a different branch.");
        }
        const { data, error } = await admin
          .from("branch_sop_reviews")
          .update({
            document_reference: input.documentReference ?? null,
            document_version: input.documentVersion ?? null,
            notes: input.notes ?? null,
            updated_by: actor.userId,
          })
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "SOP_UPDATE_FAILED", error.message);
        return mapSop(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_sop_reviews")
        .insert({
          branch_id: input.branchId,
          sop_code: input.sopCode,
          document_reference: input.documentReference ?? null,
          document_version: input.documentVersion ?? null,
          notes: input.notes ?? null,
          created_by: actor.userId,
          updated_by: actor.userId,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "SOP_CREATE_FAILED", error.message);
      const created = mapSop(data as Record<string, unknown>);
      await appendSopEvent(admin, {
        sopReviewId: created.id,
        branchId: input.branchId,
        eventType: "CREATED",
        toStatus: "NOT_REVIEWED",
        actorUserId: actor.userId,
      });
      return created;
    },

    async approveSop(actor, id, notes) {
      const admin = createServiceClient(envStatus);
      const row = await loadSopRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.review_status);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_sop_reviews")
        .update({
          review_status: "APPROVED",
          approved_by: actor.userId,
          approved_at: now,
          notes: notes ?? (row.notes as string | null),
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "SOP_APPROVE_FAILED", error.message);
      await appendSopEvent(admin, {
        sopReviewId: id,
        branchId: String(row.branch_id),
        eventType: "APPROVED",
        fromStatus,
        toStatus: "APPROVED",
        actorUserId: actor.userId,
        notes: notes ?? null,
      });
      return mapSop(data as Record<string, unknown>);
    },

    async reviewSop(actor, id, notes) {
      const admin = createServiceClient(envStatus);
      const row = await loadSopRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.review_status);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_sop_reviews")
        .update({
          review_status: "REVIEWED",
          reviewed_by: actor.userId,
          reviewed_at: now,
          notes: notes ?? (row.notes as string | null),
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "SOP_REVIEW_FAILED", error.message);
      await appendSopEvent(admin, {
        sopReviewId: id,
        branchId: String(row.branch_id),
        eventType: "REVIEWED",
        fromStatus,
        toStatus: "REVIEWED",
        actorUserId: actor.userId,
        notes: notes ?? null,
      });
      return mapSop(data as Record<string, unknown>);
    },

    async verifySopOperational(actor, id, input) {
      const admin = createServiceClient(envStatus);
      const row = await loadSopRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_sop_reviews")
        .update({
          operational_verification_status: "VERIFIED_ONSITE",
          operationally_verified_by: actor.userId,
          operationally_verified_at: now,
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "SOP_VERIFY_FAILED", error.message);
      await appendSopEvent(admin, {
        sopReviewId: id,
        branchId: String(row.branch_id),
        eventType: "VERIFIED_ONSITE",
        fromStatus: String(row.operational_verification_status),
        toStatus: "VERIFIED_ONSITE",
        actorUserId: actor.userId,
        notes: input.summary,
      });
      return mapSop(data as Record<string, unknown>);
    },

    async failSop(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadSopRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.review_status);
      const { data, error } = await admin
        .from("branch_sop_reviews")
        .update({
          operational_verification_status: "FAILED",
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "SOP_FAIL_FAILED", error.message);
      await appendSopEvent(admin, {
        sopReviewId: id,
        branchId: String(row.branch_id),
        eventType: "FAILED",
        fromStatus,
        toStatus: "FAILED",
        actorUserId: actor.userId,
        notes: reason,
      });
      return mapSop(data as Record<string, unknown>);
    },

    async expireSop(actor, id) {
      const admin = createServiceClient(envStatus);
      const row = await loadSopRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_sop_reviews")
        .update({ operational_verification_status: "EXPIRED", updated_by: actor.userId })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "SOP_EXPIRE_FAILED", error.message);
      await appendSopEvent(admin, {
        sopReviewId: id,
        branchId: String(row.branch_id),
        eventType: "EXPIRED",
        actorUserId: actor.userId,
      });
      return mapSop(data as Record<string, unknown>);
    },

    async getSopHistory(scope, sopId) {
      const admin = createServiceClient(envStatus);
      const row = await loadSopRow(admin, sopId);
      assertBranchMembership(scope, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_sop_review_events")
        .select("*")
        .eq("sop_review_id", sopId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "SOP_HISTORY_FAILED", error.message);
      return (data ?? []) as unknown[];
    },

    // ------------------------------------------------------------------
    // Training
    // ------------------------------------------------------------------

    async listTraining(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_training_sessions")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "TRAINING_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapTraining);
    },

    async upsertTraining(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);

      if (input.id) {
        const row = await loadTrainingRow(admin, input.id);
        if (String(row.branch_id) !== input.branchId) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Training belongs to a different branch.");
        }
        const { data, error } = await admin
          .from("branch_training_sessions")
          .update({
            title: input.title,
            scheduled_at: input.scheduledAt ?? null,
            notes: input.notes ?? null,
            updated_by: actor.userId,
          })
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "TRAINING_UPDATE_FAILED", error.message);
        return mapTraining(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_training_sessions")
        .insert({
          branch_id: input.branchId,
          training_code: input.trainingCode,
          title: input.title,
          scheduled_at: input.scheduledAt ?? null,
          notes: input.notes ?? null,
          created_by: actor.userId,
          updated_by: actor.userId,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "TRAINING_CREATE_FAILED", error.message);
      const created = mapTraining(data as Record<string, unknown>);
      await appendTrainingEvent(admin, {
        trainingSessionId: created.id,
        branchId: input.branchId,
        eventType: "SCHEDULED",
        toStatus: "NOT_SCHEDULED",
        actorUserId: actor.userId,
      });
      return created;
    },

    async completeTraining(actor, id, input) {
      const admin = createServiceClient(envStatus);
      const row = await loadTrainingRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.training_status);
      const now = new Date().toISOString();
      const result = input.result ?? "PASS";
      const localTestOnly = input.localTestOnly ?? false;
      const { data, error } = await admin
        .from("branch_training_sessions")
        .update({
          training_status: "COMPLETED",
          result,
          completed_at: now,
          local_test_only: localTestOnly,
          notes: input.notes ?? (row.notes as string | null),
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "TRAINING_COMPLETE_FAILED", error.message);
      await appendTrainingEvent(admin, {
        trainingSessionId: id,
        branchId: String(row.branch_id),
        eventType: "COMPLETED",
        fromStatus,
        toStatus: "COMPLETED",
        actorUserId: actor.userId,
        notes: localTestOnly ? "LOCAL_TEST_ONLY" : null,
      });
      return mapTraining(data as Record<string, unknown>);
    },

    async failTraining(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadTrainingRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.training_status);
      const { data, error } = await admin
        .from("branch_training_sessions")
        .update({
          training_status: "FAILED",
          result: "FAIL",
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "TRAINING_FAIL_FAILED", error.message);
      await appendTrainingEvent(admin, {
        trainingSessionId: id,
        branchId: String(row.branch_id),
        eventType: "FAILED",
        fromStatus,
        toStatus: "FAILED",
        actorUserId: actor.userId,
        notes: reason,
      });
      return mapTraining(data as Record<string, unknown>);
    },

    // ------------------------------------------------------------------
    // Role rehearsals
    // ------------------------------------------------------------------

    async listRoleRehearsals(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_role_rehearsals")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "REHEARSAL_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapRoleRehearsal);
    },

    async upsertRoleRehearsal(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);

      if (input.id) {
        const row = await loadRoleRehearsalRow(admin, input.id);
        if (String(row.branch_id) !== input.branchId) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Rehearsal belongs to a different branch.");
        }
        const { data, error } = await admin
          .from("branch_role_rehearsals")
          .update({
            scenario: input.scenario,
            scheduled_at: input.scheduledAt ?? null,
            notes: input.notes ?? null,
          })
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "REHEARSAL_UPDATE_FAILED", error.message);
        return mapRoleRehearsal(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_role_rehearsals")
        .insert({
          branch_id: input.branchId,
          rehearsal_code: input.rehearsalCode,
          scenario: input.scenario,
          scheduled_at: input.scheduledAt ?? null,
          notes: input.notes ?? null,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "REHEARSAL_CREATE_FAILED", error.message);
      const created = mapRoleRehearsal(data as Record<string, unknown>);
      await appendRoleRehearsalEvent(admin, {
        rehearsalId: created.id,
        branchId: input.branchId,
        eventType: "CREATED",
        toStatus: "NOT_SCHEDULED",
        actorUserId: actor.userId,
      });
      return created;
    },

    async completeRoleRehearsal(actor, id, input) {
      const admin = createServiceClient(envStatus);
      const row = await loadRoleRehearsalRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.rehearsal_status);
      const now = new Date().toISOString();
      const result = input.result ?? "PASS";
      const localTestOnly = input.localTestOnly ?? false;
      const { data, error } = await admin
        .from("branch_role_rehearsals")
        .update({
          rehearsal_status: "COMPLETED",
          result,
          completed_at: now,
          local_test_only: localTestOnly,
          notes: input.notes ?? (row.notes as string | null),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "REHEARSAL_COMPLETE_FAILED", error.message);
      await appendRoleRehearsalEvent(admin, {
        rehearsalId: id,
        branchId: String(row.branch_id),
        eventType: "COMPLETED",
        fromStatus,
        toStatus: "COMPLETED",
        actorUserId: actor.userId,
        notes: localTestOnly ? "LOCAL_TEST_ONLY" : null,
      });
      return mapRoleRehearsal(data as Record<string, unknown>);
    },

    async failRoleRehearsal(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadRoleRehearsalRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.rehearsal_status);
      const { data, error } = await admin
        .from("branch_role_rehearsals")
        .update({
          rehearsal_status: "FAILED",
          result: "FAIL",
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "REHEARSAL_FAIL_FAILED", error.message);
      await appendRoleRehearsalEvent(admin, {
        rehearsalId: id,
        branchId: String(row.branch_id),
        eventType: "FAILED",
        fromStatus,
        toStatus: "FAILED",
        actorUserId: actor.userId,
        notes: reason,
      });
      return mapRoleRehearsal(data as Record<string, unknown>);
    },

    async retestRoleRehearsal(actor, id, notes) {
      const admin = createServiceClient(envStatus);
      const row = await loadRoleRehearsalRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.rehearsal_status);
      const { data, error } = await admin
        .from("branch_role_rehearsals")
        .update({
          rehearsal_status: "NOT_SCHEDULED",
          result: "NOT_ASSESSED",
          retest_required: true,
          notes: notes ?? (row.notes as string | null),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "REHEARSAL_RETEST_FAILED", error.message);
      await appendRoleRehearsalEvent(admin, {
        rehearsalId: id,
        branchId: String(row.branch_id),
        eventType: "RETEST_REQUESTED",
        fromStatus,
        toStatus: "NOT_SCHEDULED",
        actorUserId: actor.userId,
        notes: notes ?? null,
      });
      return mapRoleRehearsal(data as Record<string, unknown>);
    },

    // ------------------------------------------------------------------
    // E2E rehearsals
    // ------------------------------------------------------------------

    async listE2eRehearsals(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_e2e_rehearsals")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "E2E_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapE2e);
    },

    async scheduleE2eRehearsal(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_e2e_rehearsals")
        .insert({
          branch_id: input.branchId,
          scheduled_at: input.scheduledAt ?? null,
          notes: input.notes ?? null,
          facilitator_user_id: actor.userId,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "E2E_CREATE_FAILED", error.message);
      const created = mapE2e(data as Record<string, unknown>);
      await appendE2eEvent(admin, {
        rehearsalId: created.id,
        branchId: input.branchId,
        eventType: "SCHEDULED",
        toStatus: "NOT_SCHEDULED",
        actorUserId: actor.userId,
      });
      return created;
    },

    async completeE2eRehearsal(actor, id, input) {
      const admin = createServiceClient(envStatus);
      const row = await loadE2eRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.status);
      const now = new Date().toISOString();
      const result = input.result ?? "PASS";
      const localTestOnly = input.localTestOnly ?? false;
      const stagesCompleted = input.stagesCompleted ?? [];
      const { data, error } = await admin
        .from("branch_e2e_rehearsals")
        .update({
          status: "COMPLETED",
          result,
          completed_at: now,
          local_test_only: localTestOnly,
          stages_completed: stagesCompleted,
          notes: input.notes ?? (row.notes as string | null),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "E2E_COMPLETE_FAILED", error.message);
      await appendE2eEvent(admin, {
        rehearsalId: id,
        branchId: String(row.branch_id),
        eventType: "COMPLETED",
        fromStatus,
        toStatus: "COMPLETED",
        actorUserId: actor.userId,
        notes: localTestOnly ? "LOCAL_TEST_ONLY" : null,
      });
      return mapE2e(data as Record<string, unknown>);
    },

    async failE2eRehearsal(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadE2eRow(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.status);
      const { data, error } = await admin
        .from("branch_e2e_rehearsals")
        .update({
          status: "FAILED",
          result: "FAIL",
          critical_failures: 1,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "E2E_FAIL_FAILED", error.message);
      await appendE2eEvent(admin, {
        rehearsalId: id,
        branchId: String(row.branch_id),
        eventType: "FAILED",
        fromStatus,
        toStatus: "FAILED",
        actorUserId: actor.userId,
        notes: reason,
      });
      return mapE2e(data as Record<string, unknown>);
    },

    // ------------------------------------------------------------------
    // Founder decisions
    // ------------------------------------------------------------------

    async listFounderDecisions(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_founder_opening_decisions")
        .select("*")
        .eq("branch_id", branchId)
        .order("decided_at", { ascending: false });
      if (error) throw new ApiError(500, "FOUNDER_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapFounderDecision);
    },

    async recordFounderDecision(actor, input) {
      assertSuperAdmin(actor);
      const admin = createServiceClient(envStatus);

      // Validate GO_CONDITIONAL requires conditions
      if (input.decision === "GO_CONDITIONAL" && !input.conditions?.trim()) {
        throw new ApiError(400, "CONDITIONS_REQUIRED", "GO_CONDITIONAL decision requires conditions.");
      }
      if (input.decision === "NO_GO" && !input.decisionNotes?.trim()) {
        throw new ApiError(400, "NOTES_REQUIRED", "NO_GO decision requires decision notes.");
      }

      const { data, error } = await admin
        .from("branch_founder_opening_decisions")
        .insert({
          branch_id: input.branchId,
          decision: input.decision,
          decision_notes: input.decisionNotes ?? null,
          conditions: input.conditions ?? null,
          decided_by: actor.userId,
          snapshot_payload: {},
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "FOUNDER_DECISION_FAILED", error.message);
      return mapFounderDecision(data as Record<string, unknown>);
    },

    // ------------------------------------------------------------------
    // Owner handover
    // ------------------------------------------------------------------

    async getOwnerHandover(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const row = await loadOwnerHandoverRow(admin, branchId);
      return row ? mapOwnerHandover(row) : null;
    },

    async upsertOwnerHandover(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      const existing = await loadOwnerHandoverRow(admin, input.branchId);

      if (existing) {
        const { data, error } = await admin
          .from("branch_owner_handover_records")
          .update({
            intended_owner_name: input.intendedOwnerName ?? (existing.intended_owner_name as string | null),
            intended_owner_contact_reference:
              input.intendedOwnerContactReference ?? (existing.intended_owner_contact_reference as string | null),
            handover_scope: input.handoverScope ?? (existing.handover_scope as string | null),
            operational_documents_reviewed:
              input.operationalDocumentsReviewed ?? Boolean(existing.operational_documents_reviewed),
            financial_procedure_reviewed:
              input.financialProcedureReviewed ?? Boolean(existing.financial_procedure_reviewed),
            staff_structure_reviewed:
              input.staffStructureReviewed ?? Boolean(existing.staff_structure_reviewed),
            device_inventory_reviewed:
              input.deviceInventoryReviewed ?? Boolean(existing.device_inventory_reviewed),
            notes: input.notes ?? (existing.notes as string | null),
            prepared_by: actor.userId,
            prepared_at: new Date().toISOString(),
          })
          .eq("branch_id", input.branchId)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "HANDOVER_UPDATE_FAILED", error.message);
        await appendOwnerHandoverEvent(admin, {
          handoverId: String(existing.id),
          branchId: input.branchId,
          eventType: "UPDATED",
          actorUserId: actor.userId,
        });
        return mapOwnerHandover(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_owner_handover_records")
        .insert({
          branch_id: input.branchId,
          intended_owner_name: input.intendedOwnerName ?? null,
          intended_owner_contact_reference: input.intendedOwnerContactReference ?? null,
          handover_scope: input.handoverScope ?? null,
          operational_documents_reviewed: input.operationalDocumentsReviewed ?? false,
          financial_procedure_reviewed: input.financialProcedureReviewed ?? false,
          staff_structure_reviewed: input.staffStructureReviewed ?? false,
          device_inventory_reviewed: input.deviceInventoryReviewed ?? false,
          notes: input.notes ?? null,
          prepared_by: actor.userId,
          prepared_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HANDOVER_CREATE_FAILED", error.message);
      const created = mapOwnerHandover(data as Record<string, unknown>);
      await appendOwnerHandoverEvent(admin, {
        handoverId: created.id,
        branchId: input.branchId,
        eventType: "CREATED",
        toStatus: "NOT_STARTED",
        actorUserId: actor.userId,
      });
      return created;
    },

    async markOwnerHandoverReady(actor, branchId) {
      assertCanManage(actor, branchId);
      const admin = createServiceClient(envStatus);
      const existing = await loadOwnerHandoverRow(admin, branchId);
      if (!existing) {
        throw new ApiError(400, "HANDOVER_NOT_STARTED", "Prepare handover draft before marking ready.");
      }
      const fromStatus = String(existing.handover_status);
      const unresolved = String(existing.unresolved_items ?? "").trim();
      if (unresolved.length > 0) {
        throw new ApiError(400, "UNRESOLVED_ITEMS", "Unresolved handover items must be cleared before READY.");
      }
      const reviewsOk =
        Boolean(existing.operational_documents_reviewed) &&
        Boolean(existing.financial_procedure_reviewed) &&
        Boolean(existing.staff_structure_reviewed) &&
        Boolean(existing.device_inventory_reviewed);
      if (!reviewsOk) {
        throw new ApiError(
          400,
          "REVIEWS_INCOMPLETE",
          "Operational, financial, staff, and device reviews must be complete before READY.",
        );
      }
      const { data, error } = await admin
        .from("branch_owner_handover_records")
        .update({
          handover_status: "READY_FOR_HANDOVER",
          prepared_by: actor.userId,
          prepared_at: new Date().toISOString(),
        })
        .eq("branch_id", branchId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HANDOVER_READY_FAILED", error.message);
      await appendOwnerHandoverEvent(admin, {
        handoverId: String(existing.id),
        branchId,
        eventType: "READY_FOR_HANDOVER",
        fromStatus,
        toStatus: "READY_FOR_HANDOVER",
        actorUserId: actor.userId,
      });
      return mapOwnerHandover(data as Record<string, unknown>);
    },

    async submitOwnerHandoverReview(actor, branchId) {
      assertCanManage(actor, branchId);
      const admin = createServiceClient(envStatus);
      const existing = await loadOwnerHandoverRow(admin, branchId);
      if (!existing) throw new ApiError(404, "HANDOVER_NOT_FOUND", "Owner handover draft not found.");
      const fromStatus = String(existing.handover_status);
      const { data, error } = await admin
        .from("branch_owner_handover_records")
        .update({
          handover_status: "REVIEW_REQUIRED",
          access_review_status: "REVIEW_REQUIRED",
          prepared_by: actor.userId,
          prepared_at: new Date().toISOString(),
        })
        .eq("branch_id", branchId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HANDOVER_SUBMIT_FAILED", error.message);
      await appendOwnerHandoverEvent(admin, {
        handoverId: String(existing.id),
        branchId,
        eventType: "REVIEW_REQUIRED",
        fromStatus,
        toStatus: "REVIEW_REQUIRED",
        actorUserId: actor.userId,
      });
      return mapOwnerHandover(data as Record<string, unknown>);
    },

    async acceptOwnerHandover(actor, branchId, acceptedByReference) {
      assertSuperAdmin(actor);
      assertBranchMembership(actor, branchId);
      const admin = createServiceClient(envStatus);
      const existing = await loadOwnerHandoverRow(admin, branchId);
      if (!existing) throw new ApiError(404, "HANDOVER_NOT_FOUND", "Owner handover not found.");
      if (String(existing.handover_status) !== "READY_FOR_HANDOVER") {
        throw new ApiError(400, "HANDOVER_NOT_READY", "Handover must be READY_FOR_HANDOVER before acceptance.");
      }
      const fromStatus = String(existing.handover_status);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_owner_handover_records")
        .update({
          handover_status: "ACCEPTED",
          accepted_by_reference: acceptedByReference,
          accepted_at: now,
        })
        .eq("branch_id", branchId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HANDOVER_ACCEPT_FAILED", error.message);
      await appendOwnerHandoverEvent(admin, {
        handoverId: String(existing.id),
        branchId,
        eventType: "ACCEPTED",
        fromStatus,
        toStatus: "ACCEPTED",
        actorUserId: actor.userId,
        notes: acceptedByReference,
      });
      return mapOwnerHandover(data as Record<string, unknown>);
    },

    async addTrainingParticipant(actor, sessionId, input) {
      const admin = createServiceClient(envStatus);
      const session = await loadTrainingRow(admin, sessionId);
      assertCanManage(actor, String(session.branch_id));
      const forbidden = new Set(["owner", "founder", "admin", "delivery", "general-staff", "staff"]);
      if (forbidden.has(input.roleCode)) {
        throw new ApiError(400, "FORBIDDEN_ROLE_CODE", "Canonical roles only — owner/founder/admin are not allowed.");
      }
      const { data: assignment, error: aErr } = await admin
        .from("user_roles")
        .select("id, assignment_status, branch_id, roles!inner(code)")
        .eq("user_id", input.userId)
        .eq("branch_id", String(session.branch_id))
        .eq("assignment_status", "ACTIVE")
        .maybeSingle();
      if (aErr) throw new ApiError(500, "ASSIGNMENT_LOOKUP_FAILED", aErr.message);
      if (!assignment) {
        throw new ApiError(
          400,
          "INACTIVE_OR_CROSS_BRANCH",
          "Participant must be an ACTIVE assignment on the training branch.",
        );
      }
      const assignedCode = String((assignment as { roles?: { code?: string } }).roles?.code ?? "");
      if (assignedCode && assignedCode !== input.roleCode) {
        throw new ApiError(400, "ROLE_MISMATCH", "Participant role must match the ACTIVE branch assignment.");
      }
      const { data, error } = await admin
        .from("branch_training_participants")
        .insert({
          training_session_id: sessionId,
          branch_id: String(session.branch_id),
          user_id: input.userId,
          canonical_role_code: input.roleCode,
        })
        .select("*")
        .single();
      if (error) {
        if (String(error.message).toLowerCase().includes("duplicate") || error.code === "23505") {
          throw new ApiError(409, "DUPLICATE_PARTICIPANT", "Participant already added to this session.");
        }
        throw new ApiError(500, "PARTICIPANT_CREATE_FAILED", error.message);
      }
      await appendTrainingEvent(admin, {
        trainingSessionId: sessionId,
        branchId: String(session.branch_id),
        eventType: "PARTICIPANT_ADDED",
        toStatus: "INVITED",
        actorUserId: actor.userId,
        notes: input.userId,
      });
      return mapParticipant(data as Record<string, unknown>);
    },

    async recordAttendance(actor, participantId, status) {
      const admin = createServiceClient(envStatus);
      const row = await loadParticipantRow(admin, participantId);
      assertCanManage(actor, String(row.branch_id));
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_training_participants")
        .update({
          attendance_status: status,
          acknowledged_at: status === "ATTENDED" || status === "CONFIRMED" ? now : row.acknowledged_at,
        })
        .eq("id", participantId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "ATTENDANCE_UPDATE_FAILED", error.message);
      await appendTrainingEvent(admin, {
        trainingSessionId: String(row.training_session_id),
        branchId: String(row.branch_id),
        eventType: "ATTENDANCE",
        fromStatus: String(row.attendance_status),
        toStatus: status,
        actorUserId: actor.userId,
      });
      return mapParticipant(data as Record<string, unknown>);
    },

    async recordAssessment(actor, participantId, result, notes) {
      const admin = createServiceClient(envStatus);
      const row = await loadParticipantRow(admin, participantId);
      assertCanManage(actor, String(row.branch_id));
      const remediationRequired = result === "FAIL" || result === "CONDITIONAL_PASS";
      const { data, error } = await admin
        .from("branch_training_participants")
        .update({
          assessment_result: result,
          assessed_by: actor.userId,
          assessment_notes: notes ?? null,
          remediation_required: remediationRequired,
        })
        .eq("id", participantId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "ASSESSMENT_UPDATE_FAILED", error.message);
      await appendTrainingEvent(admin, {
        trainingSessionId: String(row.training_session_id),
        branchId: String(row.branch_id),
        eventType: "ASSESSMENT",
        fromStatus: String(row.assessment_result),
        toStatus: result,
        actorUserId: actor.userId,
        notes: notes ?? null,
      });
      return mapParticipant(data as Record<string, unknown>);
    },

    async scheduleRemediation(actor, participantId, dueAt) {
      const admin = createServiceClient(envStatus);
      const row = await loadParticipantRow(admin, participantId);
      assertCanManage(actor, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_training_participants")
        .update({
          remediation_required: true,
          remediation_due_at: dueAt,
        })
        .eq("id", participantId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "REMEDIATION_UPDATE_FAILED", error.message);
      await appendTrainingEvent(admin, {
        trainingSessionId: String(row.training_session_id),
        branchId: String(row.branch_id),
        eventType: "REMEDIATION_SCHEDULED",
        actorUserId: actor.userId,
        notes: dueAt,
      });
      return mapParticipant(data as Record<string, unknown>);
    },

    async getTrainingHistory(scope, sessionId) {
      const admin = createServiceClient(envStatus);
      const row = await loadTrainingRow(admin, sessionId);
      assertBranchMembership(scope, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_training_events")
        .select("*")
        .eq("training_session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "TRAINING_HISTORY_FAILED", error.message);
      return (data ?? []) as unknown[];
    },
  };
}
