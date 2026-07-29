import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import {
  canAdministrativelyInspectBranch,
  isOperationallyActive,
  type BranchStatus,
} from "./operational-status.js";
import { assertBranchMembership } from "./operational-status.js";
import { loadBranchRow } from "./lookup.js";

export interface BranchReadinessScope {
  isSuperAdmin: boolean;
  branchIds: string[];
}

export interface BranchReadinessReport {
  branchId: string;
  branchCode: string;
  name: string;
  status: BranchStatus | string;
  operationallyActive: boolean;
  /** READY | READY_WITH_LIMITATIONS | BLOCKED | NOT_VERIFIED | ERROR */
  readinessGrade: "READY" | "READY_WITH_LIMITATIONS" | "BLOCKED" | "NOT_VERIFIED" | "ERROR";
  blockers: Array<{ code: string; message: string; nextAction?: string }>;
  /** Ordered operator next steps derived from honest unverified / missing probes. */
  nextActions: string[];
  checks: {
    phone: boolean;
    operatingHours: boolean;
    branchManagerAssigned: boolean;
    cashierAssigned: boolean;
    hostAssigned: boolean;
    waiterAssigned: boolean;
    kitchenAssigned: boolean;
    riderAssigned: boolean;
    customerSupportAssigned: boolean;
    statusOperating: boolean;
    floorConfigured: boolean;
    tablesConfigured: boolean;
    bookingPolicyConfigured: boolean;
    menuAssigned: boolean;
    posReady: boolean;
    kdsReady: boolean;
    deliveryReady: boolean;
    paymentConfigured: boolean;
    notificationConfigured: boolean;
    deviceVerified: boolean;
    paymentMethodsConfigured: boolean;
    paymentProviderVerified: boolean;
    cardTerminalVerified: boolean;
    cashProcedureApproved: boolean;
    notifCustomerConfigured: boolean;
    notifKitchenConfigured: boolean;
    notifRiderConfigured: boolean;
    notifEscalationConfigured: boolean;
    devicePosVerified: boolean;
    deviceKdsVerified: boolean;
    devicePrinterVerified: boolean;
    deviceCardTerminalVerified: boolean;
    deviceRiderVerified: boolean;
    deviceInternetVerified: boolean;
    deviceBackupInternetVerified: boolean;
    deviceUpsVerified: boolean;
    paymentProviderFailed: boolean;
    cardTerminalFailed: boolean;
    cashProcedureFailed: boolean;
    notifCustomerFailed: boolean;
    notifKitchenFailed: boolean;
    notifRiderFailed: boolean;
    notifEscalationFailed: boolean;
    devicePosFailed: boolean;
    deviceKdsFailed: boolean;
    devicePrinterFailed: boolean;
    deviceCardTerminalFailed: boolean;
    deviceRiderFailed: boolean;
    deviceInternetFailed: boolean;
    deviceBackupInternetFailed: boolean;
    deviceUpsFailed: boolean;
    // M3: SOPs
    sopOrderConfirmApproved: boolean;
    sopOrderConfirmReviewed: boolean;
    sopOrderConfirmFailed: boolean;
    sopKitchenApproved: boolean;
    sopKitchenReviewed: boolean;
    sopKitchenFailed: boolean;
    sopDeliveryApproved: boolean;
    sopDeliveryReviewed: boolean;
    sopDeliveryFailed: boolean;
    sopCancelRefundApproved: boolean;
    sopCancelRefundReviewed: boolean;
    sopCancelRefundFailed: boolean;
    sopOpeningChecklistApproved: boolean;
    sopOpeningChecklistFailed: boolean;
    sopClosingChecklistApproved: boolean;
    sopClosingChecklistFailed: boolean;
    sopCashReconciliationApproved: boolean;
    // M3: Training
    trainingBmComplete: boolean;
    trainingBmFailed: boolean;
    trainingCashierComplete: boolean;
    trainingCashierFailed: boolean;
    trainingKitchenComplete: boolean;
    trainingKitchenFailed: boolean;
    trainingRiderComplete: boolean;
    trainingRiderFailed: boolean;
    trainingHostWaiterComplete: boolean;
    trainingHostWaiterFailed: boolean;
    // M3: E2E rehearsal
    e2eRehearsalComplete: boolean;
    e2eRehearsalFailed: boolean;
    // M3: Founder + handover
    founderGoApproved: boolean;
    founderGoFailed: boolean;
    ownerHandoverReady: boolean;
    // M4: staff seed / live config / dry-run
    staffSeedSimulated: boolean;
    staffSeedFailed: boolean;
    liveConfigCaptured: boolean;
    dryRunLocalPassed: boolean;
    dryRunProductionComplete: boolean;
    dryRunFailed: boolean;
    dryRunGoRecorded: boolean;
  };
}

const PHONE_PLACEHOLDERS = new Set(["coming soon", "n/a", "tbd", "todo", "placeholder"]);

/** Production readiness: excludes expired, FAILED, and LOCAL_TEST_ONLY evidence. */
export function isCurrentVerified(
  status: string,
  expiresAt?: string | null,
  evidenceType?: string | null,
): boolean {
  if (status === "FAILED" || status === "EXPIRED" || status === "NOT_VERIFIED" || status === "NOT_CONFIGURED") {
    return false;
  }
  if (evidenceType === "LOCAL_TEST_ONLY") return false;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return false;
  return status === "VERIFIED";
}

function defaultM2ChecksFalse() {
  return {
    paymentMethodsConfigured: false,
    paymentProviderVerified: false,
    cardTerminalVerified: false,
    cashProcedureApproved: false,
    notifCustomerConfigured: false,
    notifKitchenConfigured: false,
    notifRiderConfigured: false,
    notifEscalationConfigured: false,
    devicePosVerified: false,
    deviceKdsVerified: false,
    devicePrinterVerified: false,
    deviceCardTerminalVerified: false,
    deviceRiderVerified: false,
    deviceInternetVerified: false,
    deviceBackupInternetVerified: false,
    deviceUpsVerified: false,
    paymentProviderFailed: false,
    cardTerminalFailed: false,
    cashProcedureFailed: false,
    notifCustomerFailed: false,
    notifKitchenFailed: false,
    notifRiderFailed: false,
    notifEscalationFailed: false,
    devicePosFailed: false,
    deviceKdsFailed: false,
    devicePrinterFailed: false,
    deviceCardTerminalFailed: false,
    deviceRiderFailed: false,
    deviceInternetFailed: false,
    deviceBackupInternetFailed: false,
    deviceUpsFailed: false,
    // M3 defaults
    sopOrderConfirmApproved: false,
    sopOrderConfirmReviewed: false,
    sopOrderConfirmFailed: false,
    sopKitchenApproved: false,
    sopKitchenReviewed: false,
    sopKitchenFailed: false,
    sopDeliveryApproved: false,
    sopDeliveryReviewed: false,
    sopDeliveryFailed: false,
    sopCancelRefundApproved: false,
    sopCancelRefundReviewed: false,
    sopCancelRefundFailed: false,
    sopOpeningChecklistApproved: false,
    sopOpeningChecklistFailed: false,
    sopClosingChecklistApproved: false,
    sopClosingChecklistFailed: false,
    sopCashReconciliationApproved: false,
    trainingBmComplete: false,
    trainingBmFailed: false,
    trainingCashierComplete: false,
    trainingCashierFailed: false,
    trainingKitchenComplete: false,
    trainingKitchenFailed: false,
    trainingRiderComplete: false,
    trainingRiderFailed: false,
    trainingHostWaiterComplete: false,
    trainingHostWaiterFailed: false,
    e2eRehearsalComplete: false,
    e2eRehearsalFailed: false,
    founderGoApproved: false,
    founderGoFailed: false,
    ownerHandoverReady: false,
    staffSeedSimulated: false,
    staffSeedFailed: false,
    liveConfigCaptured: false,
    dryRunLocalPassed: false,
    dryRunProductionComplete: false,
    dryRunFailed: false,
    dryRunGoRecorded: false,
  };
}

function isConfiguredPhone(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !PHONE_PLACEHOLDERS.has(trimmed.toLowerCase());
}

async function countRoleOnBranch(
  supabase: SupabaseClient,
  branchId: string,
  roleCode: string,
): Promise<number> {
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("code", roleCode)
    .maybeSingle();
  if (roleError) throw new ApiError(500, "ROLE_LOOKUP_FAILED", roleError.message);
  if (!role) return 0;

  const { count, error } = await supabase
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("branch_id", branchId)
    .eq("role_id", (role as { id: string }).id)
    .eq("assignment_status", "ACTIVE");
  if (error) {
    // Pre-migration environments may lack assignment_status; fall back without status filter.
    if (String(error.message).toLowerCase().includes("assignment_status")) {
      const fallback = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("branch_id", branchId)
        .eq("role_id", (role as { id: string }).id);
      if (fallback.error) throw new ApiError(500, "MEMBERSHIP_LOOKUP_FAILED", fallback.error.message);
      return fallback.count ?? 0;
    }
    throw new ApiError(500, "MEMBERSHIP_LOOKUP_FAILED", error.message);
  }
  return count ?? 0;
}

function errorReport(
  branch: { id: string; branch_code: string; name: string; status: string },
  message: string,
  nextAction: string,
): BranchReadinessReport {
  return {
    branchId: branch.id,
    branchCode: branch.branch_code,
    name: branch.name,
    status: branch.status,
    operationallyActive: isOperationallyActive(branch.status),
    readinessGrade: "ERROR",
    blockers: [{ code: "PROBE_FAILED", message, nextAction }],
    nextActions: [nextAction],
    checks: {
      phone: false,
      operatingHours: false,
      branchManagerAssigned: false,
      cashierAssigned: false,
      hostAssigned: false,
      waiterAssigned: false,
      kitchenAssigned: false,
      riderAssigned: false,
      customerSupportAssigned: false,
      statusOperating: isOperationallyActive(branch.status),
      floorConfigured: false,
      tablesConfigured: false,
      bookingPolicyConfigured: false,
      menuAssigned: false,
      posReady: false,
      kdsReady: false,
      deliveryReady: false,
      paymentConfigured: false,
      notificationConfigured: false,
      deviceVerified: false,
      ...defaultM2ChecksFalse(),
    },
  };
}

export function createBranchReadinessService(envStatus: EnvironmentStatus) {
  function getClient(): SupabaseClient {
    if (!envStatus.isReady) {
      throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
    }
    return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return {
    async getBranchReadiness(
      scope: BranchReadinessScope,
      branchId: string,
    ): Promise<BranchReadinessReport> {
      assertBranchMembership(scope, branchId);
      const supabase = getClient();
      const branch = await loadBranchRow(supabase, branchId);

      if (
        !canAdministrativelyInspectBranch({
          isSuperAdmin: scope.isSuperAdmin,
          branchStatus: branch.status,
          isAssigned: scope.isSuperAdmin || scope.branchIds.includes(branchId),
        })
      ) {
        throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
      }

      const { data: details, error: detailsError } = await supabase
        .from("branches")
        .select("phone, opening_hours")
        .eq("id", branchId)
        .maybeSingle();

      if (detailsError) {
        return errorReport(
          branch,
          `Branch details probe failed: ${detailsError.message}`,
          "Retry readiness after database connectivity is restored",
        );
      }

      const phone = isConfiguredPhone((details as { phone?: string | null } | null)?.phone);
      const openingHours = (details as { opening_hours?: Record<string, unknown> } | null)
        ?.opening_hours;
      const hoursOk =
        Boolean(openingHours) &&
        JSON.stringify(openingHours).toLowerCase().includes("coming soon") === false &&
        Object.keys(openingHours ?? {}).length > 0;

      let bm: number;
      let cashier: number;
      let host: number;
      let waiter: number;
      let kitchen: number;
      let rider: number;
      let customerSupport: number;
      try {
        [bm, cashier, host, waiter, kitchen, rider, customerSupport] = await Promise.all([
          countRoleOnBranch(supabase, branchId, "branch-manager"),
          countRoleOnBranch(supabase, branchId, "cashier"),
          countRoleOnBranch(supabase, branchId, "host"),
          countRoleOnBranch(supabase, branchId, "waiter"),
          countRoleOnBranch(supabase, branchId, "kitchen"),
          countRoleOnBranch(supabase, branchId, "rider"),
          countRoleOnBranch(supabase, branchId, "customer-support"),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Staffing probe failed.";
        return errorReport(branch, message, "Retry readiness after role membership queries succeed");
      }

      const [
        floorResult,
        tableResult,
        policyResult,
        notificationResult,
        paymentMethodsResult,
        paymentProvidersResult,
        cardTerminalsResult,
        cashProcedureResult,
        notificationChannelsResult,
        devicesResult,
        sopReviewsResult,
        roleRehearsalsResult,
        e2eRehearsalsResult,
        founderDecisionsResult,
        ownerHandoverResult,
        staffSeedRunsResult,
        liveConfigResult,
        dryRunSessionsResult,
        dryRunEvidenceResult,
      ] = await Promise.all([
        supabase
          .from("restaurant_floors")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", branchId)
          .eq("is_active", true),
        supabase
          .from("restaurant_tables")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", branchId)
          .eq("is_active", true),
        supabase
          .from("branch_booking_policies")
          .select("id, booking_enabled, status, approved_at")
          .eq("branch_id", branchId)
          .eq("status", "ACTIVE")
          .maybeSingle(),
        supabase
          .from("branch_notification_settings")
          .select("email_enabled, whatsapp_enabled, provider_mode")
          .eq("branch_id", branchId)
          .maybeSingle(),
        supabase.from("branch_payment_methods").select("enabled").eq("branch_id", branchId),
        supabase
          .from("branch_payment_provider_verifications")
          .select("provider_status, expires_at")
          .eq("branch_id", branchId),
        supabase
          .from("branch_card_terminal_verifications")
          .select("verification_result, evidence_type, verified_at, recheck_due_at")
          .eq("branch_id", branchId),
        supabase
          .from("branch_cash_procedure_approvals")
          .select("documentation_status, approved_at")
          .eq("branch_id", branchId)
          .maybeSingle(),
        supabase
          .from("branch_notification_channels")
          .select(
            "purpose_code, enabled, provider_status, test_status, local_test_only",
          )
          .eq("branch_id", branchId),
        supabase
          .from("branch_device_verifications")
          .select("device_type, verification_status, expires_at, evidence_type")
          .eq("branch_id", branchId),
        // M3 queries
        supabase
          .from("branch_sop_reviews")
          .select("sop_code, review_status, operational_verification_status")
          .eq("branch_id", branchId),
        supabase
          .from("branch_role_rehearsals")
          .select("rehearsal_code, rehearsal_status, result, local_test_only")
          .eq("branch_id", branchId),
        supabase
          .from("branch_e2e_rehearsals")
          .select("status, result, local_test_only, critical_failures")
          .eq("branch_id", branchId),
        supabase
          .from("branch_founder_opening_decisions")
          .select("decision, decided_at")
          .eq("branch_id", branchId)
          .order("decided_at", { ascending: false })
          .limit(1),
        supabase
          .from("branch_owner_handover_records")
          .select("handover_status")
          .eq("branch_id", branchId)
          .maybeSingle(),
        // M4 queries
        supabase
          .from("branch_staff_seed_runs")
          .select("run_status, local_test_only, production_apply_authorized")
          .eq("branch_id", branchId),
        supabase
          .from("branch_live_config_snapshots")
          .select("id, local_test_only, snapshot_status")
          .eq("branch_id", branchId)
          .order("captured_at", { ascending: false })
          .limit(1),
        supabase
          .from("branch_dry_run_sessions")
          .select("session_status, result, local_test_only")
          .eq("branch_id", branchId),
        supabase
          .from("branch_dry_run_evidence")
          .select("decision, local_test_only")
          .eq("branch_id", branchId)
          .order("decided_at", { ascending: false })
          .limit(1),
      ]);

      if (
        floorResult.error ||
        tableResult.error ||
        policyResult.error ||
        notificationResult.error ||
        paymentMethodsResult.error ||
        paymentProvidersResult.error ||
        cardTerminalsResult.error ||
        cashProcedureResult.error ||
        notificationChannelsResult.error ||
        devicesResult.error
      ) {
        const message =
          floorResult.error?.message ??
          tableResult.error?.message ??
          policyResult.error?.message ??
          notificationResult.error?.message ??
          paymentMethodsResult.error?.message ??
          paymentProvidersResult.error?.message ??
          cardTerminalsResult.error?.message ??
          cashProcedureResult.error?.message ??
          notificationChannelsResult.error?.message ??
          devicesResult.error?.message ??
          "Configuration probe failed.";
        return errorReport(
          branch,
          `Configuration probe failed: ${message}`,
          "Retry readiness after floor / booking / notification queries succeed",
        );
      }

      // Catalog is organization-wide today; available sellable SKUs count as menu readiness.
      // Counts menu_items.price (one price per SKU) and never consults menu_item_variants.
      const { count: menuItemCount, error: menuError } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("is_available", true)
        .neq("product_type", "topping");
      if (menuError) {
        return errorReport(
          branch,
          `Menu probe failed: ${menuError.message}`,
          "Retry readiness after menu catalog query succeeds",
        );
      }
      const menuAssigned = (menuItemCount ?? 0) > 0;

      const floorConfigured = (floorResult.count ?? 0) > 0;
      const tablesConfigured = (tableResult.count ?? 0) > 0;
      const policy = policyResult.data as
        | { id: string; booking_enabled?: boolean; status?: string; approved_at?: string | null }
        | null;
      // ACTIVE + Founder-approved (approved_at set). Do not treat draft rows as configured.
      const bookingPolicyConfigured = Boolean(policy && policy.status === "ACTIVE" && policy.approved_at);
      const statusOperating = isOperationallyActive(branch.status);

      // Honest notification probe: branch_notification_settings must exist with a non-disabled
      // provider mode and at least one channel enabled. Phone is not a notification proxy.
      const notif = notificationResult.data as
        | {
            email_enabled?: boolean;
            whatsapp_enabled?: boolean;
            provider_mode?: string;
          }
        | null;
      const providerMode = String(notif?.provider_mode ?? "disabled").toLowerCase();
      const legacyNotificationConfigured = Boolean(
        notif &&
          providerMode !== "disabled" &&
          (notif.email_enabled === true || notif.whatsapp_enabled === true),
      );

      const paymentMethods = (paymentMethodsResult.data ?? []) as Array<{ enabled?: boolean }>;
      const paymentMethodsConfigured = paymentMethods.some((m) => m.enabled === true);

      const providers = (paymentProvidersResult.data ?? []) as Array<{
        provider_status: string;
        expires_at: string | null;
      }>;
      const paymentProviderVerified = providers.some((p) =>
        isCurrentVerified(p.provider_status, p.expires_at),
      );
      const paymentProviderFailed = providers.some((p) => p.provider_status === "FAILED");

      const cardTerminals = (cardTerminalsResult.data ?? []) as Array<{
        verification_result: string;
        evidence_type: string | null;
      }>;
      const cardTerminalVerified = cardTerminals.some((t) =>
        isCurrentVerified(t.verification_result, null, t.evidence_type),
      );
      const cardTerminalFailed = cardTerminals.some((t) => t.verification_result === "FAILED");

      const cashRow = cashProcedureResult.data as
        | { documentation_status?: string; approved_at?: string | null }
        | null;
      const cashProcedureApproved = Boolean(
        cashRow &&
          cashRow.documentation_status === "VERIFIED_ONSITE" &&
          cashRow.approved_at,
      );
      const cashProcedureFailed = false;

      const channels = (notificationChannelsResult.data ?? []) as Array<{
        purpose_code: string;
        enabled: boolean;
        provider_status: string;
        test_status: string;
        local_test_only: boolean;
      }>;

      const purposeConfigured = (purpose: string): boolean =>
        channels.some(
          (c) =>
            c.purpose_code === purpose &&
            c.enabled &&
            (isCurrentVerified(c.provider_status) ||
              (c.test_status === "PASSED" && c.local_test_only === false)),
        );

      const purposeFailed = (purpose: string): boolean =>
        channels.some((c) => c.purpose_code === purpose && (c.provider_status === "FAILED" || c.test_status === "FAILED"));

      const notifCustomerConfigured = purposeConfigured("CUSTOMER_ORDER");
      const notifKitchenConfigured = purposeConfigured("KITCHEN_ALERT");
      const notifRiderConfigured = purposeConfigured("RIDER_ALERT");
      const notifEscalationConfigured = purposeConfigured("ESCALATION");
      const notifCustomerFailed = purposeFailed("CUSTOMER_ORDER");
      const notifKitchenFailed = purposeFailed("KITCHEN_ALERT");
      const notifRiderFailed = purposeFailed("RIDER_ALERT");
      const notifEscalationFailed = purposeFailed("ESCALATION");

      const notificationConfigured = notifCustomerConfigured || legacyNotificationConfigured;

      const devices = (devicesResult.data ?? []) as Array<{
        device_type: string;
        verification_status: string;
        expires_at: string | null;
        evidence_type: string | null;
      }>;

      const deviceTypeVerified = (deviceType: string): boolean =>
        devices.some(
          (d) =>
            d.device_type === deviceType &&
            isCurrentVerified(d.verification_status, d.expires_at, d.evidence_type),
        );

      const deviceTypeFailed = (deviceType: string): boolean =>
        devices.some((d) => d.device_type === deviceType && d.verification_status === "FAILED");

      const devicePosVerified = deviceTypeVerified("POS_DEVICE");
      const deviceKdsVerified = deviceTypeVerified("KDS_DEVICE");
      const devicePrinterVerified = deviceTypeVerified("RECEIPT_PRINTER");
      const deviceCardTerminalVerified = deviceTypeVerified("CARD_TERMINAL");
      const deviceRiderVerified = deviceTypeVerified("RIDER_DEVICE");
      const deviceInternetVerified = deviceTypeVerified("PRIMARY_INTERNET");
      const deviceBackupInternetVerified = deviceTypeVerified("BACKUP_INTERNET");
      const deviceUpsVerified = deviceTypeVerified("UPS_POWER_BACKUP");
      const devicePosFailed = deviceTypeFailed("POS_DEVICE");
      const deviceKdsFailed = deviceTypeFailed("KDS_DEVICE");
      const devicePrinterFailed = deviceTypeFailed("RECEIPT_PRINTER");
      const deviceCardTerminalFailed = deviceTypeFailed("CARD_TERMINAL");
      const deviceRiderFailed = deviceTypeFailed("RIDER_DEVICE");
      const deviceInternetFailed = deviceTypeFailed("PRIMARY_INTERNET");
      const deviceBackupInternetFailed = deviceTypeFailed("BACKUP_INTERNET");
      const deviceUpsFailed = deviceTypeFailed("UPS_POWER_BACKUP");

      const paymentConfigured = paymentProviderVerified && paymentMethodsConfigured;

      const deviceVerified =
        devicePosVerified &&
        deviceKdsVerified &&
        devicePrinterVerified &&
        deviceCardTerminalVerified &&
        deviceRiderVerified &&
        deviceInternetVerified &&
        deviceBackupInternetVerified &&
        deviceUpsVerified;

      // ------------------------------------------------------------------
      // M3: SOPs, Training, E2E, Founder decisions, Owner handover
      // ------------------------------------------------------------------

      const sops = (sopReviewsResult.data ?? []) as Array<{
        sop_code: string;
        review_status: string;
        operational_verification_status: string;
      }>;

      // Process SOPs require APPROVED + VERIFIED_ONSITE
      const sopApproved = (code: string): boolean =>
        sops.some(
          (s) =>
            s.sop_code === code &&
            s.review_status === "APPROVED" &&
            s.operational_verification_status === "VERIFIED_ONSITE",
        );
      // Reviewed = APPROVED or REVIEWED
      const sopReviewed = (code: string): boolean =>
        sops.some((s) => s.sop_code === code && (s.review_status === "APPROVED" || s.review_status === "REVIEWED"));
      // Checklist SOPs require only APPROVED review_status
      const sopChecklistApproved = (code: string): boolean =>
        sops.some((s) => s.sop_code === code && s.review_status === "APPROVED");
      const sopFailed = (code: string): boolean =>
        sops.some((s) => s.sop_code === code && s.operational_verification_status === "FAILED");

      const sopOrderConfirmApproved = sopApproved("ORDER_CONFIRMATION");
      const sopOrderConfirmReviewed = sopReviewed("ORDER_CONFIRMATION");
      const sopOrderConfirmFailed = sopFailed("ORDER_CONFIRMATION");
      const sopKitchenApproved = sopApproved("KITCHEN_PROGRESSION");
      const sopKitchenReviewed = sopReviewed("KITCHEN_PROGRESSION");
      const sopKitchenFailed = sopFailed("KITCHEN_PROGRESSION");
      const sopDeliveryApproved = sopApproved("DELIVERY_DISPATCH");
      const sopDeliveryReviewed = sopReviewed("DELIVERY_DISPATCH");
      const sopDeliveryFailed = sopFailed("DELIVERY_DISPATCH");
      const sopCancelRefundApproved = sopApproved("CANCELLATION_REFUND");
      const sopCancelRefundReviewed = sopReviewed("CANCELLATION_REFUND");
      const sopCancelRefundFailed = sopFailed("CANCELLATION_REFUND");
      const sopOpeningChecklistApproved = sopChecklistApproved("OPENING_CHECKLIST");
      const sopOpeningChecklistFailed = sopFailed("OPENING_CHECKLIST");
      const sopClosingChecklistApproved = sopChecklistApproved("CLOSING_CHECKLIST");
      const sopClosingChecklistFailed = sopFailed("CLOSING_CHECKLIST");
      const sopCashReconciliationApproved = sopChecklistApproved("CASH_RECONCILIATION");

      // Role rehearsals drive training-* readiness items (local_test_only never COMPLETE).
      const rehearsals = (roleRehearsalsResult.data ?? []) as Array<{
        rehearsal_code: string;
        rehearsal_status: string;
        result: string;
        local_test_only: boolean;
      }>;

      const rehearsalComplete = (code: string): boolean =>
        rehearsals.some(
          (r) =>
            r.rehearsal_code === code &&
            r.rehearsal_status === "COMPLETED" &&
            (r.result === "PASS" || r.result === "CONDITIONAL_PASS") &&
            !r.local_test_only,
        );
      const rehearsalFailed = (code: string): boolean =>
        rehearsals.some((r) => r.rehearsal_code === code && r.rehearsal_status === "FAILED");

      const trainingBmComplete = rehearsalComplete("BRANCH_MANAGER_OPENING");
      const trainingBmFailed = rehearsalFailed("BRANCH_MANAGER_OPENING");
      const trainingCashierComplete = rehearsalComplete("CASHIER_POS");
      const trainingCashierFailed = rehearsalFailed("CASHIER_POS");
      const trainingKitchenComplete = rehearsalComplete("KITCHEN_ORDER_FLOW");
      const trainingKitchenFailed = rehearsalFailed("KITCHEN_ORDER_FLOW");
      const trainingRiderComplete = rehearsalComplete("RIDER_DISPATCH");
      const trainingRiderFailed = rehearsalFailed("RIDER_DISPATCH");
      const trainingHostWaiterComplete = rehearsalComplete("HOST_WAITER_FLOOR");
      const trainingHostWaiterFailed = rehearsalFailed("HOST_WAITER_FLOOR");

      // E2E rehearsal: COMPLETED + result=PASS + critical_failures=0 + local_test_only=false
      const e2eRows = (e2eRehearsalsResult.data ?? []) as Array<{
        status: string;
        result: string;
        local_test_only: boolean;
        critical_failures: number;
      }>;
      const e2eRehearsalComplete = e2eRows.some(
        (r) => r.status === "COMPLETED" && r.result === "PASS" && r.critical_failures === 0 && !r.local_test_only,
      );
      const e2eRehearsalFailed = e2eRows.some((r) => r.status === "FAILED");

      // Founder decisions: latest GO_APPROVED only (not GO_CONDITIONAL); NO_GO = failed
      const founderRows = (founderDecisionsResult.data ?? []) as Array<{ decision: string; decided_at: string }>;
      const latestFounderDecision = founderRows[0]; // already ordered by decided_at desc
      const founderGoApproved = latestFounderDecision?.decision === "GO_APPROVED";
      const founderGoFailed = latestFounderDecision?.decision === "NO_GO";

      // Owner handover: READY_FOR_HANDOVER
      const handoverRow = ownerHandoverResult.data as { handover_status?: string } | null;
      const ownerHandoverReady = handoverRow?.handover_status === "READY_FOR_HANDOVER";

      // M4 staff seed / live config / dry-run (local_test_only never Production COMPLETE)
      const seedRuns = (staffSeedRunsResult.data ?? []) as Array<{
        run_status: string;
        local_test_only: boolean;
        production_apply_authorized: boolean;
      }>;
      const staffSeedSimulated = seedRuns.some(
        (r) => r.run_status === "SIMULATED_LOCAL" || r.run_status === "APPLIED_LOCAL",
      );
      const staffSeedFailed = seedRuns.some(
        (r) => r.run_status === "FAILED" || r.run_status === "BLOCKED_PRODUCTION",
      );

      const liveConfigRows = (liveConfigResult.data ?? []) as Array<{
        id: string;
        local_test_only: boolean;
        snapshot_status: string;
      }>;
      const liveConfigCaptured = liveConfigRows.some((r) => r.snapshot_status === "CAPTURED");

      const dryRuns = (dryRunSessionsResult.data ?? []) as Array<{
        session_status: string;
        result: string;
        local_test_only: boolean;
      }>;
      const dryRunLocalPassed = dryRuns.some(
        (r) => r.session_status === "COMPLETED" && r.result === "PASS" && r.local_test_only,
      );
      const dryRunProductionComplete = dryRuns.some(
        (r) => r.session_status === "COMPLETED" && r.result === "PASS" && !r.local_test_only,
      );
      const dryRunFailed = dryRuns.some((r) => r.session_status === "FAILED" || r.result === "FAIL");

      const dryEvidence = (dryRunEvidenceResult.data ?? []) as Array<{
        decision: string;
        local_test_only: boolean;
      }>;
      const dryRunGoRecorded = dryEvidence.some((e) => e.decision === "GO");

      const checks = {
        phone,
        operatingHours: hoursOk,
        branchManagerAssigned: bm > 0,
        cashierAssigned: cashier > 0,
        hostAssigned: host > 0,
        waiterAssigned: waiter > 0,
        kitchenAssigned: kitchen > 0,
        riderAssigned: rider > 0,
        customerSupportAssigned: customerSupport > 0,
        statusOperating,
        floorConfigured,
        tablesConfigured,
        bookingPolicyConfigured,
        menuAssigned,
        posReady: cashier > 0 && statusOperating,
        kdsReady: kitchen > 0 && statusOperating,
        deliveryReady: rider > 0 && statusOperating,
        paymentConfigured,
        notificationConfigured,
        deviceVerified,
        paymentMethodsConfigured,
        paymentProviderVerified,
        cardTerminalVerified,
        cashProcedureApproved,
        notifCustomerConfigured,
        notifKitchenConfigured,
        notifRiderConfigured,
        notifEscalationConfigured,
        devicePosVerified,
        deviceKdsVerified,
        devicePrinterVerified,
        deviceCardTerminalVerified,
        deviceRiderVerified,
        deviceInternetVerified,
        deviceBackupInternetVerified,
        deviceUpsVerified,
        paymentProviderFailed,
        cardTerminalFailed,
        cashProcedureFailed,
        notifCustomerFailed,
        notifKitchenFailed,
        notifRiderFailed,
        notifEscalationFailed,
        devicePosFailed,
        deviceKdsFailed,
        devicePrinterFailed,
        deviceCardTerminalFailed,
        deviceRiderFailed,
        deviceInternetFailed,
        deviceBackupInternetFailed,
        deviceUpsFailed,
        // M3
        sopOrderConfirmApproved,
        sopOrderConfirmReviewed,
        sopOrderConfirmFailed,
        sopKitchenApproved,
        sopKitchenReviewed,
        sopKitchenFailed,
        sopDeliveryApproved,
        sopDeliveryReviewed,
        sopDeliveryFailed,
        sopCancelRefundApproved,
        sopCancelRefundReviewed,
        sopCancelRefundFailed,
        sopOpeningChecklistApproved,
        sopOpeningChecklistFailed,
        sopClosingChecklistApproved,
        sopClosingChecklistFailed,
        sopCashReconciliationApproved,
        trainingBmComplete,
        trainingBmFailed,
        trainingCashierComplete,
        trainingCashierFailed,
        trainingKitchenComplete,
        trainingKitchenFailed,
        trainingRiderComplete,
        trainingRiderFailed,
        trainingHostWaiterComplete,
        trainingHostWaiterFailed,
        e2eRehearsalComplete,
        e2eRehearsalFailed,
        founderGoApproved,
        founderGoFailed,
        ownerHandoverReady,
        staffSeedSimulated,
        staffSeedFailed,
        liveConfigCaptured,
        dryRunLocalPassed,
        dryRunProductionComplete,
        dryRunFailed,
        dryRunGoRecorded,
      };

      const blockers: Array<{ code: string; message: string; nextAction?: string }> = [];
      const nextActions: string[] = [];

      const pushBlocker = (code: string, message: string, nextAction?: string) => {
        blockers.push(nextAction ? { code, message, nextAction } : { code, message });
        if (nextAction && !nextActions.includes(nextAction)) nextActions.push(nextAction);
      };

      if (!checks.statusOperating) {
        pushBlocker(
          "STATUS_NOT_OPERATING",
          `Branch status is '${branch.status}'. Flip to operating before live service.`,
          "Set branch status to operating when launch-ready",
        );
      }
      if (!checks.phone) {
        pushBlocker(
          "PHONE_MISSING",
          "Branch phone number is required (placeholders like Coming Soon / N/A are not valid).",
          "Set a real branch phone number",
        );
      }
      if (!checks.operatingHours) {
        pushBlocker(
          "HOURS_MISSING",
          "Real operating hours are required (placeholder Coming Soon is not valid).",
          "Configure real operating hours",
        );
      }
      if (!checks.branchManagerAssigned) {
        pushBlocker(
          "MANAGER_MISSING",
          "No branch-manager membership is assigned to this branch.",
          "Assign a branch-manager to this branch",
        );
      }
      if (!checks.cashierAssigned) {
        pushBlocker(
          "CASHIER_MISSING",
          "No cashier membership is assigned to this branch.",
          "Assign a cashier to this branch",
        );
      }
      if (!checks.kitchenAssigned) {
        pushBlocker(
          "KITCHEN_MISSING",
          "No kitchen membership is assigned to this branch.",
          "Assign kitchen staff to this branch",
        );
      }
      if (!checks.riderAssigned) {
        pushBlocker(
          "RIDER_MISSING",
          "No rider membership is assigned (required for delivery).",
          "Assign a rider to this branch",
        );
      }
      if (!checks.hostAssigned) {
        pushBlocker(
          "HOST_MISSING",
          "No host membership is assigned (front desk / seating).",
          "Assign a host to this branch",
        );
      }
      if (!checks.waiterAssigned) {
        pushBlocker(
          "WAITER_MISSING",
          "No waiter membership is assigned (table service).",
          "Assign a waiter to this branch",
        );
      }
      if (!checks.customerSupportAssigned) {
        pushBlocker(
          "CUSTOMER_SUPPORT_MISSING",
          "No customer-support membership is assigned to this branch.",
          "Assign customer-support coverage to this branch",
        );
      }
      if (!checks.floorConfigured) {
        pushBlocker(
          "FLOOR_MISSING",
          "At least one active floor is required before dine-in service.",
          "Create and activate a floor plan",
        );
      }
      if (!checks.tablesConfigured) {
        pushBlocker(
          "TABLES_MISSING",
          "At least one active table is required before dine-in service.",
          "Add at least one active table on an active floor",
        );
      }
      if (!checks.bookingPolicyConfigured) {
        pushBlocker(
          "BOOKING_POLICY_MISSING",
          "No Founder-approved ACTIVE booking policy exists for this branch.",
          "Draft, submit, approve, and activate a booking policy",
        );
      }
      if (!checks.paymentConfigured) {
        if (!checks.paymentMethodsConfigured) {
          pushBlocker(
            "PAYMENT_METHODS_MISSING",
            "At least one enabled payment method is required.",
            "Enable accepted payment methods for this branch",
          );
        }
        if (!checks.paymentProviderVerified) {
          pushBlocker(
            "PAYMENT_PROVIDER_NOT_VERIFIED",
            "Payment provider verification is missing or expired.",
            "Verify payment provider (Production, not local test only)",
          );
        }
      }
      if (!checks.cardTerminalVerified) {
        pushBlocker(
          "CARD_TERMINAL_NOT_VERIFIED",
          "On-site card terminal verification is missing (LOCAL_TEST_ONLY does not count).",
          "Complete on-site card terminal verification",
        );
      }
      if (!checks.cashProcedureApproved) {
        pushBlocker(
          "CASH_PROCEDURE_NOT_APPROVED",
          "Founder-approved cash handling procedure is required.",
          "Complete and approve cash handling procedure",
        );
      }
      if (!checks.notificationConfigured) {
        pushBlocker(
          "NOTIFICATION_NOT_VERIFIED",
          "Customer order notifications must be configured (M2 channel or legacy branch_notification_settings).",
          "Configure notification provider",
        );
      }
      if (!checks.notifKitchenConfigured) {
        pushBlocker(
          "NOTIF_KITCHEN_MISSING",
          "Kitchen alert notification channel is not Production-ready.",
          "Configure KITCHEN_ALERT notification channel",
        );
      }
      if (!checks.notifRiderConfigured) {
        pushBlocker(
          "NOTIF_RIDER_MISSING",
          "Rider alert notification channel is not Production-ready.",
          "Configure RIDER_ALERT notification channel",
        );
      }
      if (!checks.notifEscalationConfigured) {
        pushBlocker(
          "NOTIF_ESCALATION_MISSING",
          "Escalation notification channel is not Production-ready.",
          "Configure ESCALATION notification channel",
        );
      }
      if (!checks.deviceVerified) {
        pushBlocker(
          "DEVICE_NOT_VERIFIED",
          "All required device/infrastructure types must be verified on-site (LOCAL_TEST_ONLY excluded).",
          "Complete on-site device/POS/KDS validation",
        );
      }

      const hardBlockCodes = new Set([
        "STATUS_NOT_OPERATING",
        "PHONE_MISSING",
        "HOURS_MISSING",
        "MANAGER_MISSING",
        "CASHIER_MISSING",
        "KITCHEN_MISSING",
      ]);
      const hardBlocks = blockers.filter((b) => hardBlockCodes.has(b.code));
      const verificationCodes = new Set([
        "PAYMENT_METHODS_MISSING",
        "PAYMENT_PROVIDER_NOT_VERIFIED",
        "CARD_TERMINAL_NOT_VERIFIED",
        "CASH_PROCEDURE_NOT_APPROVED",
        "NOTIFICATION_NOT_VERIFIED",
        "NOTIF_KITCHEN_MISSING",
        "NOTIF_RIDER_MISSING",
        "NOTIF_ESCALATION_MISSING",
        "DEVICE_NOT_VERIFIED",
      ]);
      const onlyVerificationGaps =
        blockers.length > 0 && blockers.every((b) => verificationCodes.has(b.code));

      let readinessGrade: BranchReadinessReport["readinessGrade"] = "READY";
      if (hardBlocks.length > 0 || !checks.statusOperating) {
        readinessGrade = "BLOCKED";
      } else if (onlyVerificationGaps) {
        // Payment / notification / device have no proven store evidence — do not claim READY.
        readinessGrade = "NOT_VERIFIED";
      } else if (blockers.length > 0) {
        readinessGrade = "READY_WITH_LIMITATIONS";
      }

      return {
        branchId: branch.id,
        branchCode: branch.branch_code,
        name: branch.name,
        status: branch.status,
        operationallyActive: checks.statusOperating,
        readinessGrade,
        blockers,
        nextActions,
        checks,
      };
    },
  };
}

export type BranchReadinessService = ReturnType<typeof createBranchReadinessService>;
