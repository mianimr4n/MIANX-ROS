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
  };
}

const PHONE_PLACEHOLDERS = new Set(["coming soon", "n/a", "tbd", "todo", "placeholder"]);

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

      const [floorResult, tableResult, policyResult, notificationResult] = await Promise.all([
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
      ]);

      if (floorResult.error || tableResult.error || policyResult.error || notificationResult.error) {
        const message =
          floorResult.error?.message ??
          tableResult.error?.message ??
          policyResult.error?.message ??
          notificationResult.error?.message ??
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
      const notificationConfigured = Boolean(
        notif &&
          providerMode !== "disabled" &&
          (notif.email_enabled === true || notif.whatsapp_enabled === true),
      );

      // No branch payment_settings / provider table exists in repository evidence.
      // Do not equate cashier staffing to payment readiness.
      const paymentConfigured = false;

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
        // POS/KDS/delivery staffing readiness (device verification stays explicit / separate).
        posReady: cashier > 0 && statusOperating,
        kdsReady: kitchen > 0 && statusOperating,
        deliveryReady: rider > 0 && statusOperating,
        paymentConfigured,
        notificationConfigured,
        deviceVerified: false,
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
        pushBlocker(
          "PAYMENT_NOT_VERIFIED",
          "Branch payment provider configuration is not verified (no payment settings table probe available).",
          "Configure payment provider",
        );
      }
      if (!checks.notificationConfigured) {
        pushBlocker(
          "NOTIFICATION_NOT_VERIFIED",
          "Branch notification provider is not configured (requires branch_notification_settings with a non-disabled provider mode and an enabled channel).",
          "Configure notification provider",
        );
      }
      if (!checks.deviceVerified) {
        pushBlocker(
          "DEVICE_NOT_VERIFIED",
          "On-site device/POS/KDS verification has not been recorded.",
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
        "PAYMENT_NOT_VERIFIED",
        "NOTIFICATION_NOT_VERIFIED",
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
