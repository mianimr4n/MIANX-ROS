import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership, isOperationallyActive } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";

export const PAYMENT_METHOD_CODES = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "ONLINE_PAYMENT",
] as const;
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export const NOTIFICATION_PURPOSE_CODES = [
  "CUSTOMER_ORDER",
  "KITCHEN_ALERT",
  "RIDER_ALERT",
  "ESCALATION",
] as const;
export type NotificationPurposeCode = (typeof NOTIFICATION_PURPOSE_CODES)[number];

export const NOTIFICATION_CHANNEL_CODES = [
  "IN_APP",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PHONE_MANUAL",
] as const;
export type NotificationChannelCode = (typeof NOTIFICATION_CHANNEL_CODES)[number];

export const DEVICE_TYPES = [
  "POS_DEVICE",
  "KDS_DEVICE",
  "RECEIPT_PRINTER",
  "CARD_TERMINAL",
  "RIDER_DEVICE",
  "PRIMARY_INTERNET",
  "BACKUP_INTERNET",
  "UPS_POWER_BACKUP",
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const REQUIRED_DEVICE_TYPES: DeviceType[] = [...DEVICE_TYPES];

export const EVIDENCE_TYPES = [
  "ONSITE_CHECK",
  "SUPPLIER_CONFIRMATION",
  "MANUAL_TEST",
  "DOCUMENTED_CONTINGENCY",
  "LOCAL_TEST_ONLY",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

const SECRET_FIELD_PATTERN =
  /^(api[_-]?key|secret|token|password|cvv|card[_-]?number|private[_-]?key|webhook[_-]?secret)$/i;

export interface PaymentMethodRecord {
  id: string;
  branchId: string;
  methodCode: PaymentMethodCode;
  displayName: string;
  enabled: boolean;
  configurationStatus: string;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProviderRecord {
  id: string;
  branchId: string;
  paymentMethodId: string | null;
  providerName: string;
  providerEnvironment: string;
  providerStatus: string;
  terminalRequired: boolean;
  terminalVerified: boolean;
  verificationMethod: string | null;
  verificationSummary: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardTerminalRecord {
  id: string;
  branchId: string;
  terminalLabel: string;
  terminalProvider: string | null;
  physicalLocation: string | null;
  verificationResult: string;
  verificationNote: string | null;
  evidenceType: EvidenceType | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  recheckDueAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashProcedureRecord {
  id: string;
  branchId: string;
  procedureDocumented: boolean;
  procedureReviewed: boolean;
  cashDrawerProcessApproved: boolean;
  shiftReconciliationApproved: boolean;
  discrepancyEscalationDefined: boolean;
  documentationStatus: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationChannelRecord {
  id: string;
  branchId: string;
  purposeCode: NotificationPurposeCode;
  channelCode: NotificationChannelCode;
  enabled: boolean;
  providerName: string | null;
  providerStatus: string;
  destinationReference: string | null;
  testStatus: string;
  localTestOnly: boolean;
  testedBy: string | null;
  testedAt: string | null;
  failureReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceVerificationRecord {
  id: string;
  branchId: string;
  deviceType: DeviceType;
  deviceLabel: string;
  location: string | null;
  verificationStatus: string;
  evidenceType: EvidenceType | null;
  evidenceSummary: string | null;
  serialOrAssetReference: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  recheckDueAt: string | null;
  failureReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningOperationsService {
  listPaymentMethods(scope: BranchActorScope, branchId: string): Promise<PaymentMethodRecord[]>;
  upsertPaymentMethod(
    actor: AuthPrincipal,
    input: {
      branchId: string;
      methodCode: PaymentMethodCode;
      displayName: string;
      enabled: boolean;
      notes?: string | null;
    },
  ): Promise<PaymentMethodRecord>;
  setPaymentMethodEnabled(
    actor: AuthPrincipal,
    id: string,
    enabled: boolean,
  ): Promise<PaymentMethodRecord>;
  listProviderVerifications(
    scope: BranchActorScope,
    branchId: string,
  ): Promise<PaymentProviderRecord[]>;
  upsertProviderVerification(
    actor: AuthPrincipal,
    input: {
      id?: string;
      branchId: string;
      paymentMethodId?: string | null;
      providerName: string;
      providerEnvironment?: "TEST" | "SANDBOX" | "PRODUCTION";
      terminalRequired?: boolean;
      verificationMethod?: string | null;
    },
  ): Promise<PaymentProviderRecord>;
  recordProviderVerification(
    actor: AuthPrincipal,
    id: string,
    input: { summary: string; expiresAt?: string | null; terminalVerified?: boolean },
  ): Promise<PaymentProviderRecord>;
  recordProviderFailure(actor: AuthPrincipal, id: string, reason: string): Promise<PaymentProviderRecord>;
  listCardTerminals(scope: BranchActorScope, branchId: string): Promise<CardTerminalRecord[]>;
  recordCardTerminalVerification(
    actor: AuthPrincipal,
    input: {
      id?: string;
      branchId: string;
      terminalLabel: string;
      terminalProvider?: string | null;
      physicalLocation?: string | null;
      evidenceType: EvidenceType;
      verificationNote?: string | null;
      recheckDueAt?: string | null;
    },
  ): Promise<CardTerminalRecord>;
  recordCardTerminalFailure(actor: AuthPrincipal, id: string, reason: string): Promise<CardTerminalRecord>;
  getCashProcedure(scope: BranchActorScope, branchId: string): Promise<CashProcedureRecord | null>;
  upsertCashProcedure(
    actor: AuthPrincipal,
    input: {
      branchId: string;
      procedureDocumented?: boolean;
      procedureReviewed?: boolean;
      cashDrawerProcessApproved?: boolean;
      shiftReconciliationApproved?: boolean;
      discrepancyEscalationDefined?: boolean;
      notes?: string | null;
    },
  ): Promise<CashProcedureRecord>;
  approveCashProcedure(actor: AuthPrincipal, branchId: string): Promise<CashProcedureRecord>;
  listNotificationChannels(
    scope: BranchActorScope,
    branchId: string,
  ): Promise<NotificationChannelRecord[]>;
  upsertNotificationChannel(
    actor: AuthPrincipal,
    input: {
      branchId: string;
      purposeCode: NotificationPurposeCode;
      channelCode: NotificationChannelCode;
      enabled: boolean;
      providerName?: string | null;
      destinationReference?: string | null;
      notes?: string | null;
    },
  ): Promise<NotificationChannelRecord>;
  recordNotificationLocalTest(
    actor: AuthPrincipal,
    id: string,
    passed: boolean,
  ): Promise<NotificationChannelRecord>;
  recordNotificationVerified(actor: AuthPrincipal, id: string): Promise<NotificationChannelRecord>;
  recordNotificationFailure(
    actor: AuthPrincipal,
    id: string,
    reason: string,
  ): Promise<NotificationChannelRecord>;
  listDevices(scope: BranchActorScope, branchId: string): Promise<DeviceVerificationRecord[]>;
  upsertDevice(
    actor: AuthPrincipal,
    input: {
      id?: string;
      branchId: string;
      deviceType: DeviceType;
      deviceLabel: string;
      location?: string | null;
      serialOrAssetReference?: string | null;
      notes?: string | null;
    },
  ): Promise<DeviceVerificationRecord>;
  recordDeviceVerification(
    actor: AuthPrincipal,
    id: string,
    input: {
      evidenceType: EvidenceType;
      evidenceSummary: string;
      expiresAt?: string | null;
      recheckDueAt?: string | null;
    },
  ): Promise<DeviceVerificationRecord>;
  recordDeviceFailure(actor: AuthPrincipal, id: string, reason: string): Promise<DeviceVerificationRecord>;
  markDeviceExpired(actor: AuthPrincipal, id: string): Promise<DeviceVerificationRecord>;
  listMissingRequiredDeviceTypes(scope: BranchActorScope, branchId: string): Promise<DeviceType[]>;
}

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
    throw new ApiError(403, "FORBIDDEN", "Opening operations require super-admin or branch-manager.");
  }
  if (!actor.branchIds.includes(branchId)) {
    throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Branch-manager may only manage their assigned branch.");
  }
}

function assertCanRead(scope: BranchActorScope, branchId: string): void {
  assertBranchMembership(scope, branchId);
}

function rejectSecretFields(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if (SECRET_FIELD_PATTERN.test(key)) {
      throw new ApiError(400, "SECRET_FIELD_FORBIDDEN", `Field '${key}' must not be stored.`);
    }
    const value = payload[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      rejectSecretFields(value as Record<string, unknown>);
    }
  }
}

async function assertOperatingBranchForVerificationWrite(
  admin: SupabaseClient,
  branchId: string,
): Promise<void> {
  const branch = await loadBranchRow(admin, branchId);
  if (!isOperationallyActive(branch.status)) {
    throw new ApiError(
      409,
      "BRANCH_NOT_OPERATING",
      "Verification writes that affect launch readiness require an operating branch.",
    );
  }
}

async function loadPaymentMethod(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("branch_payment_methods").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "PAYMENT_METHOD_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "PAYMENT_METHOD_NOT_FOUND", "Payment method not found.");
  return data;
}

async function loadProvider(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("branch_payment_provider_verifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "PROVIDER_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "PROVIDER_NOT_FOUND", "Payment provider verification not found.");
  return data;
}

async function loadCardTerminal(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("branch_card_terminal_verifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "CARD_TERMINAL_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "CARD_TERMINAL_NOT_FOUND", "Card terminal not found.");
  return data;
}

async function loadNotificationChannel(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("branch_notification_channels")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "NOTIFICATION_CHANNEL_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "NOTIFICATION_CHANNEL_NOT_FOUND", "Notification channel not found.");
  return data;
}

async function loadDevice(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("branch_device_verifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "DEVICE_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "DEVICE_NOT_FOUND", "Device verification not found.");
  return data;
}

function mapPaymentMethod(row: Record<string, unknown>): PaymentMethodRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    methodCode: row.method_code as PaymentMethodCode,
    displayName: String(row.display_name),
    enabled: Boolean(row.enabled),
    configurationStatus: String(row.configuration_status),
    verificationStatus: String(row.verification_status),
    verifiedBy: (row.verified_by as string | null) ?? null,
    verifiedAt: (row.verified_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProvider(row: Record<string, unknown>): PaymentProviderRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    paymentMethodId: (row.payment_method_id as string | null) ?? null,
    providerName: String(row.provider_name),
    providerEnvironment: String(row.provider_environment),
    providerStatus: String(row.provider_status),
    terminalRequired: Boolean(row.terminal_required),
    terminalVerified: Boolean(row.terminal_verified),
    verificationMethod: (row.verification_method as string | null) ?? null,
    verificationSummary: (row.verification_summary as string | null) ?? null,
    verifiedBy: (row.verified_by as string | null) ?? null,
    verifiedAt: (row.verified_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCardTerminal(row: Record<string, unknown>): CardTerminalRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    terminalLabel: String(row.terminal_label),
    terminalProvider: (row.terminal_provider as string | null) ?? null,
    physicalLocation: (row.physical_location as string | null) ?? null,
    verificationResult: String(row.verification_result),
    verificationNote: (row.verification_note as string | null) ?? null,
    evidenceType: (row.evidence_type as EvidenceType | null) ?? null,
    verifiedBy: (row.verified_by as string | null) ?? null,
    verifiedAt: (row.verified_at as string | null) ?? null,
    recheckDueAt: (row.recheck_due_at as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCashProcedure(row: Record<string, unknown>): CashProcedureRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    procedureDocumented: Boolean(row.procedure_documented),
    procedureReviewed: Boolean(row.procedure_reviewed),
    cashDrawerProcessApproved: Boolean(row.cash_drawer_process_approved),
    shiftReconciliationApproved: Boolean(row.shift_reconciliation_approved),
    discrepancyEscalationDefined: Boolean(row.discrepancy_escalation_defined),
    documentationStatus: String(row.documentation_status),
    approvedBy: (row.approved_by as string | null) ?? null,
    approvedAt: (row.approved_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapNotificationChannel(row: Record<string, unknown>): NotificationChannelRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    purposeCode: row.purpose_code as NotificationPurposeCode,
    channelCode: row.channel_code as NotificationChannelCode,
    enabled: Boolean(row.enabled),
    providerName: (row.provider_name as string | null) ?? null,
    providerStatus: String(row.provider_status),
    destinationReference: (row.destination_reference as string | null) ?? null,
    testStatus: String(row.test_status),
    localTestOnly: Boolean(row.local_test_only),
    testedBy: (row.tested_by as string | null) ?? null,
    testedAt: (row.tested_at as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDevice(row: Record<string, unknown>): DeviceVerificationRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    deviceType: row.device_type as DeviceType,
    deviceLabel: String(row.device_label),
    location: (row.location as string | null) ?? null,
    verificationStatus: String(row.verification_status),
    evidenceType: (row.evidence_type as EvidenceType | null) ?? null,
    evidenceSummary: (row.evidence_summary as string | null) ?? null,
    serialOrAssetReference: (row.serial_or_asset_reference as string | null) ?? null,
    verifiedBy: (row.verified_by as string | null) ?? null,
    verifiedAt: (row.verified_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    recheckDueAt: (row.recheck_due_at as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function appendPaymentMethodEvent(
  admin: SupabaseClient,
  input: {
    paymentMethodId: string;
    branchId: string;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorUserId: string;
    notes?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("branch_payment_method_events").insert({
    payment_method_id: input.paymentMethodId,
    branch_id: input.branchId,
    event_type: input.eventType,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    actor_user_id: input.actorUserId,
    notes: input.notes ?? null,
  });
  if (error) throw new ApiError(500, "PAYMENT_METHOD_EVENT_FAILED", error.message);
}

async function appendNotificationChannelEvent(
  admin: SupabaseClient,
  input: {
    channelId: string;
    branchId: string;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorUserId: string;
    notes?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("branch_notification_channel_events").insert({
    channel_id: input.channelId,
    branch_id: input.branchId,
    event_type: input.eventType,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    actor_user_id: input.actorUserId,
    notes: input.notes ?? null,
  });
  if (error) throw new ApiError(500, "NOTIFICATION_CHANNEL_EVENT_FAILED", error.message);
}

async function appendDeviceEvent(
  admin: SupabaseClient,
  input: {
    deviceId: string;
    branchId: string;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorUserId: string;
    notes?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("branch_device_verification_events").insert({
    device_id: input.deviceId,
    branch_id: input.branchId,
    event_type: input.eventType,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    actor_user_id: input.actorUserId,
    notes: input.notes ?? null,
  });
  if (error) throw new ApiError(500, "DEVICE_EVENT_FAILED", error.message);
}

function deviceCountsForReadiness(
  status: string,
  expiresAt: string | null | undefined,
  evidenceType: string | null | undefined,
): boolean {
  if (status === "FAILED" || status === "EXPIRED" || status === "NOT_VERIFIED") return false;
  if (evidenceType === "LOCAL_TEST_ONLY") return false;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return false;
  return status === "VERIFIED";
}

export function createOpeningOperationsService(envStatus: EnvironmentStatus): OpeningOperationsService {
  return {
    async listPaymentMethods(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_payment_methods")
        .select("*")
        .eq("branch_id", branchId)
        .order("method_code");
      if (error) throw new ApiError(500, "PAYMENT_METHOD_LIST_FAILED", error.message);
      return (data ?? []).map((row) => mapPaymentMethod(row as Record<string, unknown>));
    },

    async upsertPaymentMethod(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      await loadBranchRow(admin, input.branchId);

      const payload = {
        branch_id: input.branchId,
        method_code: input.methodCode,
        display_name: input.displayName,
        enabled: input.enabled,
        notes: input.notes ?? null,
        configuration_status: input.enabled ? "CONFIGURED" : "NOT_CONFIGURED",
        updated_by: actor.userId,
      };

      const { data: existing } = await admin
        .from("branch_payment_methods")
        .select("id, verification_status")
        .eq("branch_id", input.branchId)
        .eq("method_code", input.methodCode)
        .maybeSingle();

      if (existing) {
        const fromStatus = (existing as { verification_status: string }).verification_status;
        const { data, error } = await admin
          .from("branch_payment_methods")
          .update(payload)
          .eq("id", (existing as { id: string }).id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "PAYMENT_METHOD_UPDATE_FAILED", error.message);
        await appendPaymentMethodEvent(admin, {
          paymentMethodId: (existing as { id: string }).id,
          branchId: input.branchId,
          eventType: "UPDATED",
          fromStatus,
          toStatus: String((data as { verification_status: string }).verification_status),
          actorUserId: actor.userId,
        });
        return mapPaymentMethod(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_payment_methods")
        .insert({
          ...payload,
          created_by: actor.userId,
        })
        .select("*")
        .single();
      if (error) {
        if (String(error.code) === "23505") {
          throw new ApiError(409, "DUPLICATE_PAYMENT_METHOD", "Payment method already exists for this branch.");
        }
        throw new ApiError(500, "PAYMENT_METHOD_CREATE_FAILED", error.message);
      }
      await appendPaymentMethodEvent(admin, {
        paymentMethodId: String((data as { id: string }).id),
        branchId: input.branchId,
        eventType: "CREATED",
        fromStatus: null,
        toStatus: String((data as { verification_status: string }).verification_status),
        actorUserId: actor.userId,
      });
      return mapPaymentMethod(data as Record<string, unknown>);
    },

    async setPaymentMethodEnabled(actor, id, enabled) {
      const admin = createServiceClient(envStatus);
      const row = await loadPaymentMethod(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.verification_status);
      const { data, error } = await admin
        .from("branch_payment_methods")
        .update({
          enabled,
          configuration_status: enabled ? "CONFIGURED" : "DISABLED",
          updated_by: actor.userId,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "PAYMENT_METHOD_UPDATE_FAILED", error.message);
      await appendPaymentMethodEvent(admin, {
        paymentMethodId: id,
        branchId: String(row.branch_id),
        eventType: enabled ? "ENABLED" : "DISABLED",
        fromStatus,
        toStatus: String((data as { verification_status: string }).verification_status),
        actorUserId: actor.userId,
      });
      return mapPaymentMethod(data as Record<string, unknown>);
    },

    async listProviderVerifications(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_payment_provider_verifications")
        .select("*")
        .eq("branch_id", branchId)
        .order("provider_name");
      if (error) throw new ApiError(500, "PROVIDER_LIST_FAILED", error.message);
      return (data ?? []).map((row) => mapProvider(row as Record<string, unknown>));
    },

    async upsertProviderVerification(actor, input) {
      rejectSecretFields(input as unknown as Record<string, unknown>);
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      await loadBranchRow(admin, input.branchId);

      const base = {
        branch_id: input.branchId,
        payment_method_id: input.paymentMethodId ?? null,
        provider_name: input.providerName,
        provider_environment: input.providerEnvironment ?? "TEST",
        terminal_required: input.terminalRequired ?? false,
        verification_method: input.verificationMethod ?? null,
        provider_status: "CONFIGURED",
      };

      if (input.id) {
        const existing = await loadProvider(admin, input.id);
        if (String(existing.branch_id) !== input.branchId) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Provider belongs to another branch.");
        }
        const { data, error } = await admin
          .from("branch_payment_provider_verifications")
          .update(base)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "PROVIDER_UPDATE_FAILED", error.message);
        return mapProvider(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_payment_provider_verifications")
        .insert(base)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "PROVIDER_CREATE_FAILED", error.message);
      return mapProvider(data as Record<string, unknown>);
    },

    async recordProviderVerification(actor, id, input) {
      const admin = createServiceClient(envStatus);
      const row = await loadProvider(admin, id);
      assertCanManage(actor, String(row.branch_id));
      await assertOperatingBranchForVerificationWrite(admin, String(row.branch_id));

      const nextStatus = actor.isSuperAdmin ? "VERIFIED" : "VERIFICATION_REQUIRED";
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_payment_provider_verifications")
        .update({
          provider_status: nextStatus,
          verification_summary: input.summary,
          verified_by: actor.userId,
          verified_at: now,
          expires_at: input.expiresAt ?? null,
          terminal_verified: input.terminalVerified ?? false,
          failure_reason: null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "PROVIDER_VERIFY_FAILED", error.message);
      return mapProvider(data as Record<string, unknown>);
    },

    async recordProviderFailure(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadProvider(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_payment_provider_verifications")
        .update({
          provider_status: "FAILED",
          failure_reason: reason,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "PROVIDER_FAIL_FAILED", error.message);
      return mapProvider(data as Record<string, unknown>);
    },

    async listCardTerminals(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_card_terminal_verifications")
        .select("*")
        .eq("branch_id", branchId)
        .order("terminal_label");
      if (error) throw new ApiError(500, "CARD_TERMINAL_LIST_FAILED", error.message);
      return (data ?? []).map((row) => mapCardTerminal(row as Record<string, unknown>));
    },

    async recordCardTerminalVerification(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      await assertOperatingBranchForVerificationWrite(admin, input.branchId);

      const verificationResult = "VERIFIED";
      const now = new Date().toISOString();
      const patch = {
        branch_id: input.branchId,
        terminal_label: input.terminalLabel,
        terminal_provider: input.terminalProvider ?? null,
        physical_location: input.physicalLocation ?? null,
        verification_result: verificationResult,
        verification_note: input.verificationNote ?? null,
        evidence_type: input.evidenceType,
        verified_by: actor.userId,
        verified_at: now,
        recheck_due_at: input.recheckDueAt ?? null,
        failure_reason: null,
      };

      if (input.id) {
        const existing = await loadCardTerminal(admin, input.id);
        if (String(existing.branch_id) !== input.branchId) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Card terminal belongs to another branch.");
        }
        const { data, error } = await admin
          .from("branch_card_terminal_verifications")
          .update(patch)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "CARD_TERMINAL_VERIFY_FAILED", error.message);
        return mapCardTerminal(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_card_terminal_verifications")
        .insert(patch)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "CARD_TERMINAL_VERIFY_FAILED", error.message);
      return mapCardTerminal(data as Record<string, unknown>);
    },

    async recordCardTerminalFailure(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadCardTerminal(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_card_terminal_verifications")
        .update({
          verification_result: "FAILED",
          failure_reason: reason,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "CARD_TERMINAL_FAIL_FAILED", error.message);
      return mapCardTerminal(data as Record<string, unknown>);
    },

    async getCashProcedure(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_cash_procedure_approvals")
        .select("*")
        .eq("branch_id", branchId)
        .maybeSingle();
      if (error) throw new ApiError(500, "CASH_PROCEDURE_LOOKUP_FAILED", error.message);
      return data ? mapCashProcedure(data as Record<string, unknown>) : null;
    },

    async upsertCashProcedure(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      await loadBranchRow(admin, input.branchId);

      const { data: existing } = await admin
        .from("branch_cash_procedure_approvals")
        .select("id")
        .eq("branch_id", input.branchId)
        .maybeSingle();

      const patch = {
        procedure_documented: input.procedureDocumented ?? false,
        procedure_reviewed: input.procedureReviewed ?? false,
        cash_drawer_process_approved: input.cashDrawerProcessApproved ?? false,
        shift_reconciliation_approved: input.shiftReconciliationApproved ?? false,
        discrepancy_escalation_defined: input.discrepancyEscalationDefined ?? false,
        notes: input.notes ?? null,
      };

      if (existing) {
        const { data, error } = await admin
          .from("branch_cash_procedure_approvals")
          .update(patch)
          .eq("branch_id", input.branchId)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "CASH_PROCEDURE_UPDATE_FAILED", error.message);
        return mapCashProcedure(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_cash_procedure_approvals")
        .insert({ branch_id: input.branchId, ...patch })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "CASH_PROCEDURE_CREATE_FAILED", error.message);
      return mapCashProcedure(data as Record<string, unknown>);
    },

    async approveCashProcedure(actor, branchId) {
      if (!actor.isSuperAdmin) {
        throw new ApiError(403, "FOUNDER_APPROVAL_REQUIRED", "Only super-admin may approve cash procedures.");
      }
      assertCanManage(actor, branchId);
      const admin = createServiceClient(envStatus);
      const { data: row, error: loadError } = await admin
        .from("branch_cash_procedure_approvals")
        .select("*")
        .eq("branch_id", branchId)
        .maybeSingle();
      if (loadError) throw new ApiError(500, "CASH_PROCEDURE_LOOKUP_FAILED", loadError.message);
      if (!row) {
        throw new ApiError(404, "CASH_PROCEDURE_NOT_FOUND", "Cash procedure record not found.");
      }
      const r = row as Record<string, unknown>;
      if (
        !r.procedure_documented ||
        !r.procedure_reviewed ||
        !r.cash_drawer_process_approved ||
        !r.shift_reconciliation_approved ||
        !r.discrepancy_escalation_defined
      ) {
        throw new ApiError(
          409,
          "CASH_PROCEDURE_INCOMPLETE",
          "All cash procedure checklist items must be true before approval.",
        );
      }
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_cash_procedure_approvals")
        .update({
          documentation_status: "VERIFIED_ONSITE",
          approved_by: actor.userId,
          approved_at: now,
        })
        .eq("branch_id", branchId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "CASH_PROCEDURE_APPROVE_FAILED", error.message);
      return mapCashProcedure(data as Record<string, unknown>);
    },

    async listNotificationChannels(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_notification_channels")
        .select("*")
        .eq("branch_id", branchId)
        .order("purpose_code");
      if (error) throw new ApiError(500, "NOTIFICATION_CHANNEL_LIST_FAILED", error.message);
      return (data ?? []).map((row) => mapNotificationChannel(row as Record<string, unknown>));
    },

    async upsertNotificationChannel(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      await loadBranchRow(admin, input.branchId);

      const payload = {
        branch_id: input.branchId,
        purpose_code: input.purposeCode,
        channel_code: input.channelCode,
        enabled: input.enabled,
        provider_name: input.providerName ?? null,
        destination_reference: input.destinationReference ?? null,
        notes: input.notes ?? null,
        provider_status: input.enabled ? "CONFIGURED" : "NOT_CONFIGURED",
        updated_by: actor.userId,
      };

      const { data: existing } = await admin
        .from("branch_notification_channels")
        .select("id, provider_status")
        .eq("branch_id", input.branchId)
        .eq("purpose_code", input.purposeCode)
        .eq("channel_code", input.channelCode)
        .maybeSingle();

      if (existing) {
        const fromStatus = (existing as { provider_status: string }).provider_status;
        const { data, error } = await admin
          .from("branch_notification_channels")
          .update(payload)
          .eq("id", (existing as { id: string }).id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "NOTIFICATION_CHANNEL_UPDATE_FAILED", error.message);
        await appendNotificationChannelEvent(admin, {
          channelId: (existing as { id: string }).id,
          branchId: input.branchId,
          eventType: "UPDATED",
          fromStatus,
          toStatus: String((data as { provider_status: string }).provider_status),
          actorUserId: actor.userId,
        });
        return mapNotificationChannel(data as Record<string, unknown>);
      }

      const { data, error } = await admin
        .from("branch_notification_channels")
        .insert({ ...payload, created_by: actor.userId })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "NOTIFICATION_CHANNEL_CREATE_FAILED", error.message);
      await appendNotificationChannelEvent(admin, {
        channelId: String((data as { id: string }).id),
        branchId: input.branchId,
        eventType: "CREATED",
        fromStatus: null,
        toStatus: String((data as { provider_status: string }).provider_status),
        actorUserId: actor.userId,
      });
      return mapNotificationChannel(data as Record<string, unknown>);
    },

    async recordNotificationLocalTest(actor, id, passed) {
      const admin = createServiceClient(envStatus);
      const row = await loadNotificationChannel(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.provider_status);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_notification_channels")
        .update({
          test_status: passed ? "PASSED" : "FAILED",
          local_test_only: true,
          provider_status: "VERIFICATION_REQUIRED",
          tested_by: actor.userId,
          tested_at: now,
          failure_reason: passed ? null : "Local test failed",
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "NOTIFICATION_LOCAL_TEST_FAILED", error.message);
      await appendNotificationChannelEvent(admin, {
        channelId: id,
        branchId: String(row.branch_id),
        eventType: passed ? "LOCAL_TEST_PASSED" : "LOCAL_TEST_FAILED",
        fromStatus,
        toStatus: "VERIFICATION_REQUIRED",
        actorUserId: actor.userId,
        notes: "local_test_only=true; not Production VERIFIED",
      });
      return mapNotificationChannel(data as Record<string, unknown>);
    },

    async recordNotificationVerified(actor, id) {
      if (!actor.isSuperAdmin) {
        throw new ApiError(403, "FOUNDER_VERIFICATION_REQUIRED", "Only super-admin may mark Production VERIFIED.");
      }
      const admin = createServiceClient(envStatus);
      const row = await loadNotificationChannel(admin, id);
      assertCanManage(actor, String(row.branch_id));
      await assertOperatingBranchForVerificationWrite(admin, String(row.branch_id));
      const fromStatus = String(row.provider_status);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_notification_channels")
        .update({
          provider_status: "VERIFIED",
          test_status: "PASSED",
          local_test_only: false,
          tested_by: actor.userId,
          tested_at: now,
          failure_reason: null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "NOTIFICATION_VERIFY_FAILED", error.message);
      await appendNotificationChannelEvent(admin, {
        channelId: id,
        branchId: String(row.branch_id),
        eventType: "PRODUCTION_VERIFIED",
        fromStatus,
        toStatus: "VERIFIED",
        actorUserId: actor.userId,
      });
      return mapNotificationChannel(data as Record<string, unknown>);
    },

    async recordNotificationFailure(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadNotificationChannel(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const { data, error } = await admin
        .from("branch_notification_channels")
        .update({
          provider_status: "FAILED",
          test_status: "FAILED",
          failure_reason: reason,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "NOTIFICATION_FAIL_FAILED", error.message);
      return mapNotificationChannel(data as Record<string, unknown>);
    },

    async listDevices(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_device_verifications")
        .select("*")
        .eq("branch_id", branchId)
        .order("device_type");
      if (error) throw new ApiError(500, "DEVICE_LIST_FAILED", error.message);
      return (data ?? []).map((row) => mapDevice(row as Record<string, unknown>));
    },

    async upsertDevice(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      await loadBranchRow(admin, input.branchId);

      const payload = {
        branch_id: input.branchId,
        device_type: input.deviceType,
        device_label: input.deviceLabel,
        location: input.location ?? null,
        serial_or_asset_reference: input.serialOrAssetReference ?? null,
        notes: input.notes ?? null,
      };

      if (input.id) {
        const existing = await loadDevice(admin, input.id);
        if (String(existing.branch_id) !== input.branchId) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Device belongs to another branch.");
        }
        const { data, error } = await admin
          .from("branch_device_verifications")
          .update(payload)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw new ApiError(500, "DEVICE_UPDATE_FAILED", error.message);
        return mapDevice(data as Record<string, unknown>);
      }

      const { data, error } = await admin.from("branch_device_verifications").insert(payload).select("*").single();
      if (error) throw new ApiError(500, "DEVICE_CREATE_FAILED", error.message);
      return mapDevice(data as Record<string, unknown>);
    },

    async recordDeviceVerification(actor, id, input) {
      const admin = createServiceClient(envStatus);
      const row = await loadDevice(admin, id);
      assertCanManage(actor, String(row.branch_id));
      await assertOperatingBranchForVerificationWrite(admin, String(row.branch_id));

      const verificationStatus = "VERIFIED";
      const now = new Date().toISOString();
      const fromStatus = String(row.verification_status);
      const { data, error } = await admin
        .from("branch_device_verifications")
        .update({
          verification_status: verificationStatus,
          evidence_type: input.evidenceType,
          evidence_summary: input.evidenceSummary,
          verified_by: actor.userId,
          verified_at: now,
          expires_at: input.expiresAt ?? null,
          recheck_due_at: input.recheckDueAt ?? null,
          failure_reason: null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "DEVICE_VERIFY_FAILED", error.message);
      await appendDeviceEvent(admin, {
        deviceId: id,
        branchId: String(row.branch_id),
        eventType: "VERIFIED",
        fromStatus,
        toStatus: verificationStatus,
        actorUserId: actor.userId,
        notes:
          input.evidenceType === "LOCAL_TEST_ONLY"
            ? "LOCAL_TEST_ONLY — excluded from Production readiness"
            : null,
      });
      return mapDevice(data as Record<string, unknown>);
    },

    async recordDeviceFailure(actor, id, reason) {
      const admin = createServiceClient(envStatus);
      const row = await loadDevice(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.verification_status);
      const { data, error } = await admin
        .from("branch_device_verifications")
        .update({
          verification_status: "FAILED",
          failure_reason: reason,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "DEVICE_FAIL_FAILED", error.message);
      await appendDeviceEvent(admin, {
        deviceId: id,
        branchId: String(row.branch_id),
        eventType: "FAILED",
        fromStatus,
        toStatus: "FAILED",
        actorUserId: actor.userId,
        notes: reason,
      });
      return mapDevice(data as Record<string, unknown>);
    },

    async markDeviceExpired(actor, id) {
      const admin = createServiceClient(envStatus);
      const row = await loadDevice(admin, id);
      assertCanManage(actor, String(row.branch_id));
      const fromStatus = String(row.verification_status);
      const { data, error } = await admin
        .from("branch_device_verifications")
        .update({ verification_status: "EXPIRED" })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "DEVICE_EXPIRE_FAILED", error.message);
      await appendDeviceEvent(admin, {
        deviceId: id,
        branchId: String(row.branch_id),
        eventType: "EXPIRED",
        fromStatus,
        toStatus: "EXPIRED",
        actorUserId: actor.userId,
      });
      return mapDevice(data as Record<string, unknown>);
    },

    async listMissingRequiredDeviceTypes(scope, branchId) {
      assertCanRead(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_device_verifications")
        .select("device_type, verification_status, expires_at, evidence_type")
        .eq("branch_id", branchId);
      if (error) throw new ApiError(500, "DEVICE_LIST_FAILED", error.message);

      const satisfied = new Set<DeviceType>();
      for (const row of data ?? []) {
        const r = row as {
          device_type: DeviceType;
          verification_status: string;
          expires_at: string | null;
          evidence_type: string | null;
        };
        if (
          deviceCountsForReadiness(r.verification_status, r.expires_at, r.evidence_type)
        ) {
          satisfied.add(r.device_type);
        }
      }
      return REQUIRED_DEVICE_TYPES.filter((t) => !satisfied.has(t));
    },
  };
}
