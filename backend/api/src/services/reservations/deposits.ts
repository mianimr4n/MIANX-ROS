import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";

/**
 * D3 corrective — reservation deposit lifecycle.
 *
 * Deposits are a real, auditable ledger. We never fabricate a "provider paid"
 * success: a `provider` deposit without an external reference is rejected
 * (there is no payment gateway wired). Applying a deposit credit to a bill is
 * protected by a unique index so it can happen at most once per reservation.
 */

export const DEPOSIT_METHODS = ["cash", "card_terminal", "bank_manual", "provider", "waiver"] as const;
export type DepositMethod = (typeof DEPOSIT_METHODS)[number];

export const DEPOSIT_STATUSES = [
  "pending",
  "paid",
  "partially_paid",
  "failed",
  "refunded",
  "forfeited",
  "waived",
] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export interface DepositRecord {
  id: string;
  branchId: string;
  reservationId: string;
  amount: number;
  currency: string;
  status: DepositStatus | string;
  method: string;
  externalReference: string | null;
  paymentId: string | null;
  appliedToBillId: string | null;
  appliedAt: string | null;
  waivedReason: string | null;
  forfeitedReason: string | null;
  refundReason: string | null;
  receivedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordDepositInput {
  reservationId: string;
  amount: number;
  method: DepositMethod;
  idempotencyKey: string;
  externalReference?: string | null;
  note?: string | null;
}

export interface DepositService {
  recordDeposit(scope: BranchActorScope, input: RecordDepositInput): Promise<DepositRecord>;
  waiveDeposit(
    scope: BranchActorScope,
    input: { reservationId: string; reason: string },
  ): Promise<DepositRecord>;
  forfeitDeposit(
    scope: BranchActorScope,
    input: { reservationId: string; reason: string },
  ): Promise<DepositRecord>;
  refundDeposit(
    scope: BranchActorScope,
    input: { reservationId: string; reason: string },
  ): Promise<DepositRecord>;
  applyDepositToBill(
    scope: BranchActorScope,
    input: { reservationId: string; billId: string },
  ): Promise<DepositRecord>;
  getDeposit(scope: BranchActorScope, reservationId: string): Promise<DepositRecord | null>;
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
    throw new ApiError(403, "DEPOSIT_ACCESS_DENIED", "Resource belongs to another branch.");
  }
}

type DepositRow = Record<string, unknown>;

function toDeposit(row: DepositRow): DepositRecord {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    reservationId: row.reservation_id as string,
    amount: Number(row.amount ?? 0),
    currency: (row.currency as string) ?? "PKR",
    status: row.status as string,
    method: row.method as string,
    externalReference: (row.external_reference as string | null) ?? null,
    paymentId: (row.payment_id as string | null) ?? null,
    appliedToBillId: (row.applied_to_bill_id as string | null) ?? null,
    appliedAt: (row.applied_at as string | null) ?? null,
    waivedReason: (row.waived_reason as string | null) ?? null,
    forfeitedReason: (row.forfeited_reason as string | null) ?? null,
    refundReason: (row.refund_reason as string | null) ?? null,
    receivedBy: (row.received_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const DEPOSIT_SELECT =
  "id, branch_id, reservation_id, amount, currency, status, method, external_reference, payment_id, applied_to_bill_id, applied_at, waived_reason, forfeited_reason, refund_reason, received_by, created_at, updated_at";

export function createDepositService(envStatus: EnvironmentStatus): DepositService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadReservation(reservationId: string): Promise<{
    id: string;
    branch_id: string;
    deposit_amount: number | null;
    deposit_status: string;
  }> {
    const { data, error } = await getClient()
      .from("reservations")
      .select("id, branch_id, deposit_amount, deposit_status")
      .eq("id", reservationId)
      .maybeSingle();
    if (error) throw new ApiError(500, "RESERVATION_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "RESERVATION_NOT_FOUND", "Reservation not found.");
    return data as never;
  }

  async function loadLatestDeposit(reservationId: string): Promise<DepositRow | null> {
    const { data, error } = await getClient()
      .from("reservation_deposits")
      .select(DEPOSIT_SELECT)
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new ApiError(500, "DEPOSIT_LOOKUP_FAILED", error.message);
    return (data as DepositRow | null) ?? null;
  }

  async function setReservationDepositStatus(
    reservationId: string,
    status: string,
    actorUserId: string,
  ): Promise<void> {
    await getClient()
      .from("reservations")
      .update({ deposit_status: status, updated_by: actorUserId })
      .eq("id", reservationId);
  }

  async function audit(entry: {
    branchId: string;
    actorUserId: string | null;
    resourceId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    note?: string | null;
  }): Promise<void> {
    await getClient().from("table_service_audit").insert({
      branch_id: entry.branchId,
      actor_user_id: entry.actorUserId,
      actor_type: "staff",
      resource_type: "reservation_deposit",
      resource_id: entry.resourceId,
      action: entry.action,
      before_data: entry.before ?? null,
      after_data: entry.after ?? null,
      note: entry.note ?? null,
    });
  }

  return {
    async recordDeposit(scope, input) {
      const reservation = await loadReservation(input.reservationId);
      assertBranchInScope(scope, reservation.branch_id);

      const key = (input.idempotencyKey ?? "").trim();
      if (!key) {
        throw new ApiError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key is required to record a deposit.",
        );
      }
      if (!DEPOSIT_METHODS.includes(input.method) || input.method === "waiver") {
        throw new ApiError(400, "DEPOSIT_METHOD_INVALID", "Unsupported deposit method.");
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new ApiError(400, "DEPOSIT_AMOUNT_INVALID", "Deposit amount must be greater than zero.");
      }

      // Idempotent replay by (branch, idempotency_key).
      const { data: existing } = await getClient()
        .from("reservation_deposits")
        .select(DEPOSIT_SELECT)
        .eq("branch_id", reservation.branch_id)
        .eq("idempotency_key", key)
        .maybeSingle();
      if (existing) {
        return toDeposit(existing as DepositRow);
      }

      const externalReference = input.externalReference?.trim() || null;
      // Honesty gate: a provider deposit with no external reference is NOT a paid
      // deposit — there is no gateway to confirm it. Reject rather than fabricate.
      if (input.method === "provider" && !externalReference) {
        throw new ApiError(
          400,
          "DEPOSIT_PROVIDER_REFERENCE_REQUIRED",
          "A provider deposit requires an external payment reference; none was provided.",
        );
      }

      const status: DepositStatus = "paid";
      const nowIso = new Date().toISOString();
      const { data, error } = await getClient()
        .from("reservation_deposits")
        .insert({
          branch_id: reservation.branch_id,
          reservation_id: input.reservationId,
          amount: input.amount,
          method: input.method,
          status,
          external_reference: externalReference,
          received_by: scope.userId,
          idempotency_key: key,
          completed_at: nowIso,
        })
        .select(DEPOSIT_SELECT)
        .single();
      if (error) {
        if (error.code === "23505") {
          const replay = await getClient()
            .from("reservation_deposits")
            .select(DEPOSIT_SELECT)
            .eq("branch_id", reservation.branch_id)
            .eq("idempotency_key", key)
            .maybeSingle();
          if (replay.data) return toDeposit(replay.data as DepositRow);
          throw new ApiError(409, "DEPOSIT_CONFLICT", "Deposit already recorded.");
        }
        throw new ApiError(500, "DEPOSIT_CREATE_FAILED", error.message);
      }

      await setReservationDepositStatus(input.reservationId, status, scope.userId);
      await audit({
        branchId: reservation.branch_id,
        actorUserId: scope.userId,
        resourceId: data.id as string,
        action: "deposit_recorded",
        after: { amount: input.amount, method: input.method, status },
        note: input.note ?? null,
      });
      return toDeposit(data as DepositRow);
    },

    async waiveDeposit(scope, input) {
      const reservation = await loadReservation(input.reservationId);
      assertBranchInScope(scope, reservation.branch_id);
      const reason = (input.reason ?? "").trim();
      if (!reason) {
        throw new ApiError(400, "DEPOSIT_REASON_REQUIRED", "A reason is required to waive a deposit.");
      }
      const nowIso = new Date().toISOString();
      const existing = await loadLatestDeposit(input.reservationId);
      let record: DepositRow;
      if (existing && !["refunded", "forfeited"].includes(existing.status as string)) {
        const { data, error } = await getClient()
          .from("reservation_deposits")
          .update({ status: "waived", waived_reason: reason, waived_at: nowIso })
          .eq("id", existing.id as string)
          .select(DEPOSIT_SELECT)
          .single();
        if (error) throw new ApiError(500, "DEPOSIT_WAIVE_FAILED", error.message);
        record = data as DepositRow;
      } else {
        const { data, error } = await getClient()
          .from("reservation_deposits")
          .insert({
            branch_id: reservation.branch_id,
            reservation_id: input.reservationId,
            amount: reservation.deposit_amount ?? 0,
            method: "waiver",
            status: "waived",
            waived_reason: reason,
            waived_at: nowIso,
            received_by: scope.userId,
          })
          .select(DEPOSIT_SELECT)
          .single();
        if (error) throw new ApiError(500, "DEPOSIT_WAIVE_FAILED", error.message);
        record = data as DepositRow;
      }
      await setReservationDepositStatus(input.reservationId, "waived", scope.userId);
      await audit({
        branchId: reservation.branch_id,
        actorUserId: scope.userId,
        resourceId: record.id as string,
        action: "deposit_waived",
        after: { status: "waived" },
        note: reason,
      });
      return toDeposit(record);
    },

    async forfeitDeposit(scope, input) {
      const reservation = await loadReservation(input.reservationId);
      assertBranchInScope(scope, reservation.branch_id);
      const reason = (input.reason ?? "").trim();
      if (!reason) {
        throw new ApiError(400, "DEPOSIT_REASON_REQUIRED", "A reason is required to forfeit a deposit.");
      }
      const existing = await loadLatestDeposit(input.reservationId);
      if (!existing) {
        throw new ApiError(404, "DEPOSIT_NOT_FOUND", "No deposit exists for this reservation.");
      }
      if (!["paid", "partially_paid"].includes(existing.status as string)) {
        throw new ApiError(409, "DEPOSIT_NOT_FORFEITABLE", `A ${existing.status} deposit cannot be forfeited.`);
      }
      const nowIso = new Date().toISOString();
      const { data, error } = await getClient()
        .from("reservation_deposits")
        .update({ status: "forfeited", forfeited_reason: reason, forfeited_at: nowIso })
        .eq("id", existing.id as string)
        .in("status", ["paid", "partially_paid"])
        .select(DEPOSIT_SELECT)
        .maybeSingle();
      if (error) throw new ApiError(500, "DEPOSIT_FORFEIT_FAILED", error.message);
      if (!data) throw new ApiError(409, "DEPOSIT_FORFEIT_CONFLICT", "Deposit changed concurrently. Retry.");
      await setReservationDepositStatus(input.reservationId, "forfeited", scope.userId);
      await audit({
        branchId: reservation.branch_id,
        actorUserId: scope.userId,
        resourceId: existing.id as string,
        action: "deposit_forfeited",
        before: { status: existing.status },
        after: { status: "forfeited" },
        note: reason,
      });
      return toDeposit(data as DepositRow);
    },

    async refundDeposit(scope, input) {
      const reservation = await loadReservation(input.reservationId);
      assertBranchInScope(scope, reservation.branch_id);
      const reason = (input.reason ?? "").trim();
      if (!reason) {
        throw new ApiError(400, "DEPOSIT_REASON_REQUIRED", "A reason is required to refund a deposit.");
      }
      const existing = await loadLatestDeposit(input.reservationId);
      if (!existing) {
        throw new ApiError(404, "DEPOSIT_NOT_FOUND", "No deposit exists for this reservation.");
      }
      if (!["paid", "partially_paid"].includes(existing.status as string)) {
        throw new ApiError(409, "DEPOSIT_NOT_REFUNDABLE", `A ${existing.status} deposit cannot be refunded.`);
      }
      if (existing.applied_to_bill_id) {
        throw new ApiError(409, "DEPOSIT_ALREADY_APPLIED", "A deposit applied to a bill cannot be refunded.");
      }
      const nowIso = new Date().toISOString();
      const { data, error } = await getClient()
        .from("reservation_deposits")
        .update({ status: "refunded", refund_reason: reason, refunded_at: nowIso })
        .eq("id", existing.id as string)
        .in("status", ["paid", "partially_paid"])
        .select(DEPOSIT_SELECT)
        .maybeSingle();
      if (error) throw new ApiError(500, "DEPOSIT_REFUND_FAILED", error.message);
      if (!data) throw new ApiError(409, "DEPOSIT_REFUND_CONFLICT", "Deposit changed concurrently. Retry.");
      await setReservationDepositStatus(input.reservationId, "refunded", scope.userId);
      await audit({
        branchId: reservation.branch_id,
        actorUserId: scope.userId,
        resourceId: existing.id as string,
        action: "deposit_refunded",
        before: { status: existing.status },
        after: { status: "refunded" },
        note: reason,
      });
      return toDeposit(data as DepositRow);
    },

    async applyDepositToBill(scope, input) {
      const reservation = await loadReservation(input.reservationId);
      assertBranchInScope(scope, reservation.branch_id);

      const { data: bill, error: billErr } = await getClient()
        .from("restaurant_bills")
        .select("id, branch_id, grand_total, status")
        .eq("id", input.billId)
        .maybeSingle();
      if (billErr) throw new ApiError(500, "BILL_LOOKUP_FAILED", billErr.message);
      if (!bill) throw new ApiError(404, "BILL_NOT_FOUND", "Restaurant bill not found.");
      if (bill.branch_id !== reservation.branch_id) {
        throw new ApiError(409, "BILL_BRANCH_MISMATCH", "Bill belongs to another branch.");
      }
      if (["paid", "voided"].includes(bill.status as string)) {
        throw new ApiError(409, "BILL_NOT_SETTLEABLE", "Bill is not open for a deposit credit.");
      }

      const existing = await loadLatestDeposit(input.reservationId);
      if (!existing) {
        throw new ApiError(404, "DEPOSIT_NOT_FOUND", "No deposit exists for this reservation.");
      }
      if (existing.status !== "paid") {
        throw new ApiError(409, "DEPOSIT_NOT_APPLICABLE", `A ${existing.status} deposit cannot be applied.`);
      }
      if (existing.applied_to_bill_id) {
        throw new ApiError(409, "DEPOSIT_ALREADY_APPLIED", "Deposit has already been applied to a bill.");
      }

      const nowIso = new Date().toISOString();
      // The unique partial index uq_reservation_deposits_applied_once guarantees
      // this update wins at most once even under concurrency.
      const { data: applied, error: applyErr } = await getClient()
        .from("reservation_deposits")
        .update({ applied_to_bill_id: input.billId, applied_at: nowIso })
        .eq("id", existing.id as string)
        .is("applied_to_bill_id", null)
        .select(DEPOSIT_SELECT)
        .maybeSingle();
      if (applyErr) {
        if (applyErr.code === "23505") {
          throw new ApiError(409, "DEPOSIT_ALREADY_APPLIED", "Deposit has already been applied to a bill.");
        }
        throw new ApiError(500, "DEPOSIT_APPLY_FAILED", applyErr.message);
      }
      if (!applied) {
        throw new ApiError(409, "DEPOSIT_ALREADY_APPLIED", "Deposit has already been applied to a bill.");
      }

      // Credit the bill with a completed payment so the balance reflects the
      // pre-paid deposit. Idempotency key is deterministic per deposit.
      const depositAmount = Number(existing.amount);
      const { data: payment, error: payErr } = await getClient()
        .from("payments")
        .insert({
          branch_id: reservation.branch_id,
          restaurant_bill_id: input.billId,
          payment_method: existing.method as string,
          amount: depositAmount,
          currency: (existing.currency as string) ?? "PKR",
          status: "completed",
          received_by: scope.userId,
          idempotency_key: `deposit-apply:${existing.id as string}`,
          completed_at: nowIso,
          paid_at: nowIso,
          audit_metadata: { source: "reservation_deposit", depositId: existing.id, reservationId: input.reservationId },
        })
        .select("id")
        .maybeSingle();
      if (payErr && payErr.code !== "23505") {
        throw new ApiError(500, "DEPOSIT_APPLY_PAYMENT_FAILED", payErr.message);
      }
      if (payment?.id) {
        await getClient()
          .from("reservation_deposits")
          .update({ payment_id: payment.id as string })
          .eq("id", existing.id as string);
      }

      // Recalculate the bill after crediting the deposit.
      const { data: paidRows } = await getClient()
        .from("payments")
        .select("amount, status")
        .eq("restaurant_bill_id", input.billId)
        .in("status", ["completed", "paid"]);
      const paid = ((paidRows ?? []) as { amount: number | string }[]).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      if (paid >= Number(bill.grand_total) && Number(bill.grand_total) > 0) {
        await getClient()
          .from("restaurant_bills")
          .update({ status: "paid", closed_by_user_id: scope.userId, closed_at: nowIso })
          .eq("id", input.billId)
          .in("status", ["open", "billed"]);
      } else {
        await getClient()
          .from("restaurant_bills")
          .update({ status: "billed" })
          .eq("id", input.billId)
          .eq("status", "open");
      }

      await setReservationDepositStatus(input.reservationId, "paid", scope.userId);
      await audit({
        branchId: reservation.branch_id,
        actorUserId: scope.userId,
        resourceId: existing.id as string,
        action: "deposit_applied_to_bill",
        after: { billId: input.billId, amount: depositAmount },
      });
      return toDeposit((applied as DepositRow) ?? existing);
    },

    async getDeposit(scope, reservationId) {
      const reservation = await loadReservation(reservationId);
      assertBranchInScope(scope, reservation.branch_id);
      const row = await loadLatestDeposit(reservationId);
      return row ? toDeposit(row) : null;
    },
  };
}
