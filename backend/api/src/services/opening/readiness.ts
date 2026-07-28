import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ROLE_REHEARSAL_CODES,
  type RoleRehearsalCode,
  type SopCode,
} from "./governance.js";

/** M3 opening readiness probe flags (default false on error). */
export interface OpeningM3ReadinessChecks {
  sopOrderConfirmApproved: boolean;
  sopKitchenApproved: boolean;
  sopDeliveryApproved: boolean;
  sopCancelRefundApproved: boolean;
  sopOpeningChecklistApproved: boolean;
  sopClosingChecklistApproved: boolean;
  sopCashReconciliationApproved: boolean;
  sopOrderConfirmFailed: boolean;
  sopKitchenFailed: boolean;
  sopDeliveryFailed: boolean;
  sopCancelRefundFailed: boolean;
  sopOrderConfirmActive: boolean;
  sopKitchenActive: boolean;
  sopDeliveryActive: boolean;
  sopCancelRefundActive: boolean;
  trainingBmComplete: boolean;
  trainingCashierComplete: boolean;
  trainingKitchenComplete: boolean;
  trainingRiderComplete: boolean;
  trainingHostWaiterComplete: boolean;
  trainingCustomerSupportComplete: boolean;
  trainingBmFailed: boolean;
  trainingCashierFailed: boolean;
  trainingKitchenFailed: boolean;
  trainingRiderFailed: boolean;
  trainingHostWaiterFailed: boolean;
  trainingCustomerSupportFailed: boolean;
  trainingBmScheduled: boolean;
  trainingCashierScheduled: boolean;
  trainingKitchenScheduled: boolean;
  trainingRiderScheduled: boolean;
  trainingHostWaiterScheduled: boolean;
  trainingCustomerSupportScheduled: boolean;
  e2eRehearsalComplete: boolean;
  e2eRehearsalFailed: boolean;
  e2eRehearsalScheduled: boolean;
  founderGoApproved: boolean;
  founderGoActive: boolean;
  ownerHandoverReady: boolean;
}

const PROCESS_SOP_CODES: SopCode[] = [
  "ORDER_CONFIRMATION",
  "KITCHEN_PROGRESSION",
  "DELIVERY_DISPATCH",
  "CANCELLATION_REFUND",
];

const CHECKLIST_SOP_CODES: SopCode[] = [
  "OPENING_CHECKLIST",
  "CLOSING_CHECKLIST",
  "CASH_RECONCILIATION",
];

const TRAINING_REHEARSAL_MAP: Record<
  keyof Pick<
    OpeningM3ReadinessChecks,
    | "trainingBmComplete"
    | "trainingCashierComplete"
    | "trainingKitchenComplete"
    | "trainingRiderComplete"
    | "trainingHostWaiterComplete"
    | "trainingCustomerSupportComplete"
  >,
  RoleRehearsalCode
> = {
  trainingBmComplete: "BRANCH_MANAGER_OPENING",
  trainingCashierComplete: "CASHIER_POS",
  trainingKitchenComplete: "KITCHEN_ORDER_FLOW",
  trainingRiderComplete: "RIDER_DISPATCH",
  trainingHostWaiterComplete: "HOST_WAITER_FLOOR",
  trainingCustomerSupportComplete: "CUSTOMER_SUPPORT_ESCALATION",
};

export function defaultOpeningM3ReadinessChecks(): OpeningM3ReadinessChecks {
  return {
    sopOrderConfirmApproved: false,
    sopKitchenApproved: false,
    sopDeliveryApproved: false,
    sopCancelRefundApproved: false,
    sopOpeningChecklistApproved: false,
    sopClosingChecklistApproved: false,
    sopCashReconciliationApproved: false,
    sopOrderConfirmFailed: false,
    sopKitchenFailed: false,
    sopDeliveryFailed: false,
    sopCancelRefundFailed: false,
    sopOrderConfirmActive: false,
    sopKitchenActive: false,
    sopDeliveryActive: false,
    sopCancelRefundActive: false,
    trainingBmComplete: false,
    trainingCashierComplete: false,
    trainingKitchenComplete: false,
    trainingRiderComplete: false,
    trainingHostWaiterComplete: false,
    trainingCustomerSupportComplete: false,
    trainingBmFailed: false,
    trainingCashierFailed: false,
    trainingKitchenFailed: false,
    trainingRiderFailed: false,
    trainingHostWaiterFailed: false,
    trainingCustomerSupportFailed: false,
    trainingBmScheduled: false,
    trainingCashierScheduled: false,
    trainingKitchenScheduled: false,
    trainingRiderScheduled: false,
    trainingHostWaiterScheduled: false,
    trainingCustomerSupportScheduled: false,
    e2eRehearsalComplete: false,
    e2eRehearsalFailed: false,
    e2eRehearsalScheduled: false,
    founderGoApproved: false,
    founderGoActive: false,
    ownerHandoverReady: false,
  };
}

type SopRow = {
  sop_code: string;
  review_status: string;
  operational_verification_status: string;
};

type RehearsalRow = {
  rehearsal_code: string;
  rehearsal_status: string;
  result: string;
  local_test_only: boolean;
};

type E2eRow = {
  status: string;
  result: string;
  critical_failures: number;
  local_test_only: boolean;
};

function processSopComplete(row: SopRow): boolean {
  return (
    row.review_status === "APPROVED" &&
    row.operational_verification_status === "VERIFIED_ONSITE"
  );
}

function checklistSopComplete(row: SopRow): boolean {
  return (
    row.review_status === "APPROVED" &&
    row.operational_verification_status !== "EXPIRED" &&
    row.operational_verification_status !== "FAILED"
  );
}

function processSopActive(row: SopRow): boolean {
  return (
    row.review_status === "APPROVED" &&
    row.operational_verification_status !== "VERIFIED_ONSITE" &&
    row.operational_verification_status !== "FAILED" &&
    row.operational_verification_status !== "EXPIRED"
  );
}

function rehearsalComplete(row: RehearsalRow): boolean {
  return (
    row.local_test_only === false &&
    row.rehearsal_status === "COMPLETED" &&
    (row.result === "PASS" || row.result === "CONDITIONAL_PASS")
  );
}

function rehearsalFailed(row: RehearsalRow): boolean {
  return row.rehearsal_status === "FAILED" || row.result === "FAIL";
}

function rehearsalScheduled(row: RehearsalRow): boolean {
  return row.rehearsal_status === "SCHEDULED" || row.rehearsal_status === "IN_PROGRESS";
}

function pickLatestRehearsal(rows: RehearsalRow[], code: RoleRehearsalCode): RehearsalRow | undefined {
  return rows.find((r) => r.rehearsal_code === code);
}

function sopByCode(rows: SopRow[], code: SopCode): SopRow | undefined {
  return rows.find((r) => r.sop_code === code);
}

/**
 * Loads M3 governance probes for branch opening readiness. Returns all-false on any query error.
 */
export async function probeOpeningM3Readiness(
  supabase: SupabaseClient,
  branchId: string,
): Promise<OpeningM3ReadinessChecks> {
  const defaults = defaultOpeningM3ReadinessChecks();
  try {
    const [sopsResult, rehearsalsResult, e2eResult, founderResult, handoverResult] = await Promise.all([
      supabase
        .from("branch_sop_reviews")
        .select("sop_code, review_status, operational_verification_status")
        .eq("branch_id", branchId),
      supabase
        .from("branch_role_rehearsals")
        .select("rehearsal_code, rehearsal_status, result, local_test_only, updated_at")
        .eq("branch_id", branchId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("branch_e2e_rehearsals")
        .select("status, result, critical_failures, local_test_only, updated_at")
        .eq("branch_id", branchId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("branch_founder_opening_decisions")
        .select("decision, conditions")
        .eq("branch_id", branchId)
        .order("decided_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("branch_owner_handover_records")
        .select("handover_status")
        .eq("branch_id", branchId)
        .maybeSingle(),
    ]);

    if (
      sopsResult.error ||
      rehearsalsResult.error ||
      e2eResult.error ||
      founderResult.error ||
      handoverResult.error
    ) {
      return defaults;
    }

    const sops = (sopsResult.data ?? []) as SopRow[];
    const rehearsals = (rehearsalsResult.data ?? []) as RehearsalRow[];
    const e2eRows = (e2eResult.data ?? []) as E2eRow[];

    const processFlags = (code: SopCode, approvedKey: keyof OpeningM3ReadinessChecks, failedKey: keyof OpeningM3ReadinessChecks, activeKey: keyof OpeningM3ReadinessChecks) => {
      const row = sopByCode(sops, code);
      if (!row) return;
      (defaults[approvedKey] as boolean) = processSopComplete(row);
      (defaults[failedKey] as boolean) = row.operational_verification_status === "FAILED";
      (defaults[activeKey] as boolean) = processSopActive(row);
    };

    processFlags("ORDER_CONFIRMATION", "sopOrderConfirmApproved", "sopOrderConfirmFailed", "sopOrderConfirmActive");
    processFlags("KITCHEN_PROGRESSION", "sopKitchenApproved", "sopKitchenFailed", "sopKitchenActive");
    processFlags("DELIVERY_DISPATCH", "sopDeliveryApproved", "sopDeliveryFailed", "sopDeliveryActive");
    processFlags("CANCELLATION_REFUND", "sopCancelRefundApproved", "sopCancelRefundFailed", "sopCancelRefundActive");

    for (const code of CHECKLIST_SOP_CODES) {
      const row = sopByCode(sops, code);
      if (!row) continue;
      if (code === "OPENING_CHECKLIST") defaults.sopOpeningChecklistApproved = checklistSopComplete(row);
      if (code === "CLOSING_CHECKLIST") defaults.sopClosingChecklistApproved = checklistSopComplete(row);
      if (code === "CASH_RECONCILIATION") defaults.sopCashReconciliationApproved = checklistSopComplete(row);
    }

    for (const [checkKey, rehearsalCode] of Object.entries(TRAINING_REHEARSAL_MAP) as Array<
      [keyof typeof TRAINING_REHEARSAL_MAP, RoleRehearsalCode]
    >) {
      const row = pickLatestRehearsal(rehearsals, rehearsalCode);
      if (!row) continue;
      defaults[checkKey] = rehearsalComplete(row);
      const prefix = checkKey.replace("Complete", "");
      const failedKey = `${prefix}Failed` as keyof OpeningM3ReadinessChecks;
      const scheduledKey = `${prefix}Scheduled` as keyof OpeningM3ReadinessChecks;
      if (failedKey in defaults) defaults[failedKey] = rehearsalFailed(row);
      if (scheduledKey in defaults) defaults[scheduledKey] = rehearsalScheduled(row);
    }

    const e2e = e2eRows[0];
    if (e2e) {
      defaults.e2eRehearsalComplete =
        e2e.local_test_only === false &&
        e2e.status === "COMPLETED" &&
        e2e.result === "PASS" &&
        e2e.critical_failures === 0;
      defaults.e2eRehearsalFailed = e2e.status === "FAILED" || e2e.result === "FAIL";
      defaults.e2eRehearsalScheduled = e2e.status === "SCHEDULED" || e2e.status === "IN_PROGRESS";
    }

    const founder = founderResult.data as { decision: string; conditions: string | null } | null;
    if (founder) {
      defaults.founderGoApproved = founder.decision === "GO_APPROVED";
      defaults.founderGoActive =
        founder.decision === "GO_CONDITIONAL" ||
        (founder.decision === "GO_APPROVED" &&
          Boolean(founder.conditions && founder.conditions.trim().length > 0));
      if (founder.decision === "GO_CONDITIONAL") {
        defaults.founderGoApproved = false;
      }
    }

    const handover = handoverResult.data as { handover_status: string } | null;
    if (handover) {
      defaults.ownerHandoverReady =
        handover.handover_status === "READY_FOR_HANDOVER" || handover.handover_status === "ACCEPTED";
    }

    void PROCESS_SOP_CODES;
    void ROLE_REHEARSAL_CODES;

    return defaults;
  } catch {
    return defaultOpeningM3ReadinessChecks();
  }
}
