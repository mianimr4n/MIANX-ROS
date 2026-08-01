/**
 * RC4-8 Finance Phase 2 foundation services — AR, tax, periods, statements, auto-post, exceptions.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import type { BranchActorScope } from "../tables/management.js";
import { allocateReceiptAmount, classifyInvoiceStatus, type InvoiceStatus } from "./ar-calc.js";
import { calculateInvoiceTaxTotals, type TaxBasis } from "./tax-calc.js";
import type { FinanceService } from "./management.js";
import { MAPPING_PURPOSES } from "./operations.js";

function client(env: EnvironmentStatus): SupabaseClient {
  if (!env.config.supabaseUrl || !env.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase is not configured.");
  }
  return createClient(env.config.supabaseUrl, env.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireMapping(
  db: SupabaseClient,
  branchId: string,
  purpose: string,
): Promise<{ accountId: string }> {
  const { data, error } = await db
    .from("finance_account_mappings")
    .select("account_id")
    .eq("branch_id", branchId)
    .eq("purpose", purpose)
    .maybeSingle();
  if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
  if (!data?.account_id) {
    throw new ApiError(
      422,
      "ACCOUNT_MAPPING_REQUIRED",
      `Journal posting requires account mapping for purpose '${purpose}'.`,
      { purpose, branchId },
    );
  }
  return { accountId: String(data.account_id) };
}

async function assertPeriodAllows(db: SupabaseClient, branchId: string, entryDate: string) {
  const { error } = await db.rpc("finance_assert_period_allows_posting", {
    p_branch_id: branchId,
    p_entry_date: entryDate,
  });
  if (error) {
    if (String(error.message || "").includes("FINANCE_PERIOD_CLOSED")) {
      throw new ApiError(409, "FINANCE_PERIOD_CLOSED", "Cannot post into a closed finance period.");
    }
    throwMappedDbError("FINANCE_PHASE2_DB", error);
  }
}

async function recordException(
  db: SupabaseClient,
  input: {
    branchId?: string | null;
    exceptionType: string;
    sourceModule?: string;
    sourceId?: string;
    message: string;
    metadata?: Record<string, unknown>;
    requestId?: string | null;
  },
) {
  await db.from("finance_exceptions").insert({
    branch_id: input.branchId ?? null,
    exception_type: input.exceptionType,
    source_module: input.sourceModule ?? null,
    source_id: input.sourceId ?? null,
    message: input.message,
    metadata: input.metadata ?? {},
    request_id: input.requestId ?? null,
  });
}

export interface FinancePhase2Service {
  listTaxDefinitions(scope: BranchActorScope, branchId?: string): Promise<unknown[]>;
  upsertTaxDefinition(
    scope: BranchActorScope,
    input: {
      branchId?: string | null;
      taxCode: string;
      description?: string;
      rate: number;
      taxBasis?: TaxBasis;
      classification?: "input" | "output";
      effectiveFrom?: string;
      effectiveTo?: string | null;
      isActive?: boolean;
    },
  ): Promise<unknown>;
  createDraftInvoice(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId: string;
      customerId?: string | null;
      sourceOrderId?: string | null;
      invoiceNumber: string;
      dueDate?: string | null;
      discountAmount?: number;
      taxDefinitionId?: string | null;
      lines: Array<{ description: string; quantity: number; unitPrice: number }>;
    },
  ): Promise<unknown>;
  issueInvoice(scope: BranchActorScope, actorUserId: string, invoiceId: string, requestId?: string | null): Promise<unknown>;
  createReceipt(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId: string;
      customerId?: string | null;
      paymentMethod: "cash" | "bank" | "card" | "other";
      amount: number;
      receivedDate?: string;
      reference?: string | null;
      allocations: Array<{ invoiceId: string; amount: number }>;
      idempotencyKey?: string | null;
    },
    requestId?: string | null,
  ): Promise<unknown>;
  createCreditNote(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId: string;
      invoiceId: string;
      creditNumber: string;
      reason: string;
      subtotal: number;
      taxAmount?: number;
    },
    requestId?: string | null,
  ): Promise<unknown>;
  listPeriods(scope: BranchActorScope, branchId: string): Promise<unknown[]>;
  setPeriodStatus(
    scope: BranchActorScope,
    actorUserId: string,
    periodId: string,
    toStatus: "open" | "soft_closed" | "closed",
    reason?: string | null,
    requestId?: string | null,
  ): Promise<unknown>;
  createPeriod(
    scope: BranchActorScope,
    input: { branchId: string; periodStart: string; periodEnd: string; label?: string | null },
  ): Promise<unknown>;
  getBalanceSheet(scope: BranchActorScope, branchId: string, asOf?: string): Promise<unknown>;
  getCashFlow(scope: BranchActorScope, branchId: string, from?: string, to?: string): Promise<unknown>;
  listExceptions(scope: BranchActorScope, opts?: { branchId?: string; status?: string }): Promise<unknown[]>;
  postSalesFromOrder(
    scope: BranchActorScope,
    actorUserId: string,
    orderId: string,
    requestId?: string | null,
  ): Promise<unknown>;
  postSupplierInvoice(
    scope: BranchActorScope,
    actorUserId: string,
    invoiceId: string,
    requestId?: string | null,
  ): Promise<unknown>;
  postCogsEvent(
    scope: BranchActorScope,
    actorUserId: string,
    cogsEventId: string,
    requestId?: string | null,
  ): Promise<unknown>;
  postPayrollAccrual(
    scope: BranchActorScope,
    actorUserId: string,
    payrollRunId: string,
    requestId?: string | null,
  ): Promise<{
    ok: boolean;
    payrollRunId: string;
    journalEntryId: string | null;
    postingStatus: "posted" | "blocked" | "already_posted" | "deferred";
    postingBlockedReason: string | null;
    idempotent?: boolean;
  }>;
  postPayrollSettlement(
    scope: BranchActorScope,
    actorUserId: string,
    settlementId: string,
    requestId?: string | null,
  ): Promise<{
    ok: boolean;
    settlementId: string;
    journalEntryId: string | null;
    postingStatus: "posted" | "blocked" | "already_posted" | "deferred";
    postingBlockedReason: string | null;
    idempotent?: boolean;
  }>;
  mappingHealth(scope: BranchActorScope, branchId: string): Promise<{
    branchId: string;
    required: string[];
    present: string[];
    missing: string[];
    status: "LIVE" | "UNAVAILABLE";
  }>;
}

export function createFinancePhase2Service(
  env: EnvironmentStatus,
  finance: FinanceService,
): FinancePhase2Service {
  return {
    async listTaxDefinitions(scope, branchId) {
      const db = client(env);
      if (branchId) assertBranchMembership(scope, branchId);
      let q = db.from("tax_definitions").select("*").order("tax_code");
      if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
      const { data, error } = await q;
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      return data ?? [];
    },

    async upsertTaxDefinition(scope, input) {
      const db = client(env);
      if (input.branchId) assertBranchMembership(scope, input.branchId);
      if (!(input.rate >= 0 && input.rate <= 1)) {
        throw new ApiError(400, "TAX_RATE_INVALID", "Tax rate must be between 0 and 1 inclusive.");
      }
      const row = {
        branch_id: input.branchId ?? null,
        tax_code: input.taxCode.trim(),
        description: input.description ?? "",
        rate: input.rate,
        tax_basis: input.taxBasis ?? "exclusive",
        classification: input.classification ?? "output",
        effective_from: input.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        effective_to: input.effectiveTo ?? null,
        is_active: input.isActive ?? true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await db.from("tax_definitions").upsert(row, { onConflict: "branch_id,tax_code" }).select("*").single();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      return data;
    },

    async createDraftInvoice(scope, actorUserId, input) {
      const db = client(env);
      assertBranchMembership(scope, input.branchId);
      const lineSubs = input.lines.map((l) => Math.round(l.quantity * l.unitPrice * 100) / 100);
      let taxDef = null as null | {
        rate: number;
        tax_basis: TaxBasis;
        is_active: boolean;
        effective_from: string;
        effective_to: string | null;
      };
      if (input.taxDefinitionId) {
        const { data } = await db.from("tax_definitions").select("*").eq("id", input.taxDefinitionId).maybeSingle();
        taxDef = data as typeof taxDef;
      }
      const today = new Date().toISOString().slice(0, 10);
      const totals = calculateInvoiceTaxTotals(
        lineSubs,
        taxDef
          ? {
              rate: Number(taxDef.rate),
              taxBasis: taxDef.tax_basis,
              isActive: taxDef.is_active,
              effectiveFrom: taxDef.effective_from,
              effectiveTo: taxDef.effective_to,
            }
          : null,
        today,
        input.discountAmount ?? 0,
      );
      const { data: inv, error } = await db
        .from("customer_invoices")
        .insert({
          branch_id: input.branchId,
          customer_id: input.customerId ?? null,
          source_order_id: input.sourceOrderId ?? null,
          invoice_number: input.invoiceNumber.trim(),
          due_date: input.dueDate ?? null,
          subtotal: totals.subtotal,
          discount_amount: totals.discountAmount,
          tax_amount: totals.taxAmount,
          total_amount: totals.totalAmount,
          balance_due: totals.totalAmount,
          status: "DRAFT",
          tax_definition_id: input.taxDefinitionId ?? null,
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      const lines = input.lines.map((l, idx) => ({
        invoice_id: inv.id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        line_subtotal: lineSubs[idx],
        tax_amount: 0,
        line_total: lineSubs[idx],
        sort_order: idx,
      }));
      const { error: lineErr } = await db.from("customer_invoice_lines").insert(lines);
      if (lineErr) throwMappedDbError("FINANCE_PHASE2_DB", lineErr);
      return inv;
    },

    async issueInvoice(scope, actorUserId, invoiceId, requestId) {
      const db = client(env);
      const { data: inv, error } = await db.from("customer_invoices").select("*").eq("id", invoiceId).maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!inv) throw new ApiError(404, "INVOICE_NOT_FOUND", "Customer invoice not found.");
      assertBranchMembership(scope, inv.branch_id);
      if (inv.status !== "DRAFT") {
        throw new ApiError(409, "INVOICE_NOT_DRAFT", "Only DRAFT invoices can be issued.");
      }
      const today = new Date().toISOString().slice(0, 10);
      await assertPeriodAllows(db, inv.branch_id, today);
      const ar = await requireMapping(db, inv.branch_id, "ar_control");
      const rev = await requireMapping(db, inv.branch_id, "sales_revenue");
      const lines: Array<{ accountId: string; debit?: number; credit?: number }> = [
        { accountId: ar.accountId, debit: Number(inv.total_amount) },
      ];
      const netRevenue = Math.round((Number(inv.total_amount) - Number(inv.tax_amount)) * 100) / 100;
      lines.push({ accountId: rev.accountId, credit: netRevenue });
      if (Number(inv.tax_amount) > 0) {
        const taxMap = await requireMapping(db, inv.branch_id, "output_tax");
        lines.push({ accountId: taxMap.accountId, credit: Number(inv.tax_amount) });
      }
      let journalId: string;
      try {
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: inv.branch_id,
          entryDate: today,
          description: `AR invoice ${inv.invoice_number}`,
          referenceType: "customer_invoice",
          referenceId: inv.id,
          status: "posted",
          lines,
        });
        journalId = journal.id;
      } catch (e) {
        await recordException(db, {
          branchId: inv.branch_id,
          exceptionType: "failed_automated_posting",
          sourceModule: "customer_invoice",
          sourceId: inv.id,
          message: e instanceof ApiError ? e.message : "Failed to post AR invoice",
          requestId,
        });
        throw e;
      }
      await db.from("finance_postings").upsert(
        {
          source_module: "customer_invoice",
          source_id: inv.id,
          journal_entry_id: journalId,
          idempotency_key: `ar_invoice_post:${inv.id}`,
          status: "posted",
          branch_id: inv.branch_id,
          posted_by: actorUserId,
        },
        { onConflict: "source_module,source_id" },
      );
      const { data: updated, error: upErr } = await db
        .from("customer_invoices")
        .update({ status: "ISSUED", issue_date: today, updated_at: new Date().toISOString() })
        .eq("id", inv.id)
        .select("*")
        .single();
      if (upErr) throwMappedDbError("FINANCE_PHASE2_DB", upErr);
      return updated;
    },

    async createReceipt(scope, actorUserId, input, requestId) {
      const db = client(env);
      assertBranchMembership(scope, input.branchId);
      const invoiceIds = input.allocations.map((a) => a.invoiceId);
      const { data: invoices, error } = await db
        .from("customer_invoices")
        .select("id, branch_id, balance_due, total_amount, status, due_date")
        .in("id", invoiceIds);
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      const byId = new Map((invoices ?? []).map((i) => [i.id, i]));
      const allocRows = input.allocations.map((a) => {
        const inv = byId.get(a.invoiceId);
        if (!inv) throw new ApiError(404, "INVOICE_NOT_FOUND", "Allocation invoice not found.");
        if (inv.branch_id !== input.branchId) {
          throw new ApiError(403, "BRANCH_ISOLATION", "Cannot allocate across branches.");
        }
        return { invoiceId: a.invoiceId, amount: a.amount, balanceDue: Number(inv.balance_due) };
      });
      const alloc = allocateReceiptAmount(input.amount, allocRows);
      if (!alloc.ok) throw new ApiError(400, alloc.error, "Receipt allocation rejected.");
      const receivedDate = input.receivedDate ?? new Date().toISOString().slice(0, 10);
      await assertPeriodAllows(db, input.branchId, receivedDate);
      const cashPurpose = input.paymentMethod === "bank" || input.paymentMethod === "card" ? "bank_clearing" : "cash_on_hand";
      const cash = await requireMapping(db, input.branchId, cashPurpose);
      const ar = await requireMapping(db, input.branchId, "ar_control");
      const { data: receipt, error: rErr } = await db
        .from("customer_receipts")
        .insert({
          branch_id: input.branchId,
          customer_id: input.customerId ?? null,
          received_date: receivedDate,
          payment_method: input.paymentMethod,
          amount: input.amount,
          unapplied_amount: alloc.remaining,
          reference: input.reference ?? null,
          status: "posted",
          created_by: actorUserId,
          idempotency_key: input.idempotencyKey ?? null,
        })
        .select("*")
        .single();
      if (rErr) {
        if (String(rErr.message || "").includes("idempotency")) {
          throw new ApiError(409, "DUPLICATE_RECEIPT", "Receipt idempotency key already used.");
        }
        throwMappedDbError("FINANCE_PHASE2_DB", rErr);
      }
      const { error: aErr } = await db.from("customer_receipt_allocations").insert(
        input.allocations.map((a) => ({
          receipt_id: receipt.id,
          invoice_id: a.invoiceId,
          amount: a.amount,
        })),
      );
      if (aErr) throwMappedDbError("FINANCE_PHASE2_DB", aErr);

      try {
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: input.branchId,
          entryDate: receivedDate,
          description: `Customer receipt ${receipt.id}`,
          referenceType: "customer_receipt",
          referenceId: receipt.id,
          status: "posted",
          lines: [
            { accountId: cash.accountId, debit: input.amount },
            { accountId: ar.accountId, credit: input.amount },
          ],
        });
        await db.from("finance_postings").insert({
          source_module: "customer_receipt",
          source_id: receipt.id,
          journal_entry_id: journal.id,
          idempotency_key: `ar_receipt_post:${receipt.id}`,
          status: "posted",
          branch_id: input.branchId,
          posted_by: actorUserId,
        });
      } catch (e) {
        await recordException(db, {
          branchId: input.branchId,
          exceptionType: "failed_automated_posting",
          sourceModule: "customer_receipt",
          sourceId: receipt.id,
          message: e instanceof ApiError ? e.message : "Failed to post receipt",
          requestId,
        });
        throw e;
      }

      const today = new Date().toISOString().slice(0, 10);
      for (const a of input.allocations) {
        const inv = byId.get(a.invoiceId)!;
        const newBal = Math.round((Number(inv.balance_due) - a.amount) * 100) / 100;
        const status = classifyInvoiceStatus({
          status: inv.status as InvoiceStatus,
          balanceDue: newBal,
          totalAmount: Number(inv.total_amount),
          dueDate: inv.due_date,
          asOf: today,
        });
        await db
          .from("customer_invoices")
          .update({ balance_due: Math.max(0, newBal), status, updated_at: new Date().toISOString() })
          .eq("id", inv.id);
      }
      return receipt;
    },

    async createCreditNote(scope, actorUserId, input, requestId) {
      const db = client(env);
      assertBranchMembership(scope, input.branchId);
      const { data: inv, error } = await db.from("customer_invoices").select("*").eq("id", input.invoiceId).maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!inv) throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found for credit note.");
      if (inv.branch_id !== input.branchId) throw new ApiError(403, "BRANCH_ISOLATION", "Invoice branch mismatch.");
      const tax = input.taxAmount ?? 0;
      const total = Math.round((input.subtotal + tax) * 100) / 100;
      const today = new Date().toISOString().slice(0, 10);
      await assertPeriodAllows(db, input.branchId, today);
      const { data: note, error: nErr } = await db
        .from("customer_credit_notes")
        .insert({
          branch_id: input.branchId,
          invoice_id: input.invoiceId,
          credit_number: input.creditNumber.trim(),
          reason: input.reason,
          issue_date: today,
          subtotal: input.subtotal,
          tax_amount: tax,
          total_amount: total,
          status: "ISSUED",
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (nErr) throwMappedDbError("FINANCE_PHASE2_DB", nErr);
      const ar = await requireMapping(db, input.branchId, "ar_control");
      const rev = await requireMapping(db, input.branchId, "sales_revenue");
      const lines: Array<{ accountId: string; debit?: number; credit?: number }> = [
        { accountId: rev.accountId, debit: input.subtotal },
        { accountId: ar.accountId, credit: total },
      ];
      if (tax > 0) {
        const taxMap = await requireMapping(db, input.branchId, "output_tax");
        lines.unshift({ accountId: taxMap.accountId, debit: tax });
      }
      try {
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: input.branchId,
          entryDate: today,
          description: `Credit note ${input.creditNumber}`,
          referenceType: "customer_credit_note",
          referenceId: note.id,
          status: "posted",
          lines,
        });
        await db.from("finance_postings").insert({
          source_module: "customer_credit_note",
          source_id: note.id,
          journal_entry_id: journal.id,
          idempotency_key: `ar_credit_post:${note.id}`,
          status: "posted",
          branch_id: input.branchId,
          posted_by: actorUserId,
        });
      } catch (e) {
        await recordException(db, {
          branchId: input.branchId,
          exceptionType: "failed_automated_posting",
          sourceModule: "customer_credit_note",
          sourceId: note.id,
          message: e instanceof ApiError ? e.message : "Failed to post credit note",
          requestId,
        });
        throw e;
      }
      const newBal = Math.max(0, Math.round((Number(inv.balance_due) - total) * 100) / 100);
      await db
        .from("customer_invoices")
        .update({
          balance_due: newBal,
          status: newBal <= 0 ? "CREDITED" : inv.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
      return note;
    },

    async listPeriods(scope, branchId) {
      const db = client(env);
      assertBranchMembership(scope, branchId);
      const { data, error } = await db
        .from("finance_periods")
        .select("*")
        .eq("branch_id", branchId)
        .order("period_start", { ascending: false });
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      return data ?? [];
    },

    async createPeriod(scope, input) {
      const db = client(env);
      assertBranchMembership(scope, input.branchId);
      const { data, error } = await db
        .from("finance_periods")
        .insert({
          branch_id: input.branchId,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          label: input.label ?? null,
          status: "open",
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      return data;
    },

    async setPeriodStatus(scope, actorUserId, periodId, toStatus, reason, requestId) {
      const db = client(env);
      const { data: period, error } = await db.from("finance_periods").select("*").eq("id", periodId).maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!period) throw new ApiError(404, "PERIOD_NOT_FOUND", "Finance period not found.");
      assertBranchMembership(scope, period.branch_id);
      if (toStatus === "open" && period.status === "closed" && !scope.isSuperAdmin && !scope.roles.includes("super-admin")) {
        // reopen allowed for finance.manage callers (route-gated); still audit
      }
      const { data: updated, error: upErr } = await db
        .from("finance_periods")
        .update({ status: toStatus, updated_at: new Date().toISOString() })
        .eq("id", periodId)
        .select("*")
        .single();
      if (upErr) throwMappedDbError("FINANCE_PHASE2_DB", upErr);
      await db.from("finance_period_events").insert({
        period_id: periodId,
        actor_user_id: actorUserId,
        from_status: period.status,
        to_status: toStatus,
        reason: reason ?? null,
        request_id: requestId ?? null,
      });
      return updated;
    },

    async getBalanceSheet(scope, branchId, asOf) {
      const db = client(env);
      assertBranchMembership(scope, branchId);
      const { data, error } = await db.rpc("finance_balance_sheet", {
        p_branch_id: branchId,
        p_as_of: asOf ?? null,
      });
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      return data;
    },

    async getCashFlow(scope, branchId, from, to) {
      const db = client(env);
      assertBranchMembership(scope, branchId);
      const { data, error } = await db.rpc("finance_cash_flow_indirect", {
        p_branch_id: branchId,
        p_from: from ?? null,
        p_to: to ?? null,
      });
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      const unclassified = (data as { unclassified?: unknown[] })?.unclassified ?? [];
      if (Array.isArray(unclassified) && unclassified.length > 0) {
        await recordException(db, {
          branchId,
          exceptionType: "unclassified_cash_flow",
          message: `${unclassified.length} unclassified cash-flow movement(s)`,
          metadata: { unclassified },
        });
      }
      return data;
    },

    async listExceptions(scope, opts) {
      const db = client(env);
      if (opts?.branchId) assertBranchMembership(scope, opts.branchId);
      let q = db.from("finance_exceptions").select("*").order("created_at", { ascending: false }).limit(200);
      if (opts?.branchId) q = q.eq("branch_id", opts.branchId);
      if (opts?.status) q = q.eq("status", opts.status);
      const { data, error } = await q;
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      return data ?? [];
    },

    async postSalesFromOrder(scope, actorUserId, orderId, requestId) {
      const db = client(env);
      const { data: existing } = await db
        .from("finance_postings")
        .select("id, status")
        .eq("source_module", "order")
        .eq("source_id", orderId)
        .maybeSingle();
      if (existing?.status === "posted") {
        return { idempotent: true, orderId };
      }
      const { data: order, error } = await db
        .from("orders")
        .select("id, branch_id, status, payment_status, total_amount, tax_amount, discount_amount, subtotal")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      assertBranchMembership(scope, order.branch_id);
      if (!(order.payment_status === "paid" || order.status === "completed")) {
        throw new ApiError(409, "ORDER_NOT_SETTLED", "Sales posting requires paid or completed order.");
      }
      const today = new Date().toISOString().slice(0, 10);
      await assertPeriodAllows(db, order.branch_id, today);
      const debitPurpose = order.payment_status === "paid" ? "cash_on_hand" : "ar_control";
      try {
        const debit = await requireMapping(db, order.branch_id, debitPurpose);
        const rev = await requireMapping(db, order.branch_id, "sales_revenue");
        const total = Number(order.total_amount);
        const tax = Number(order.tax_amount ?? 0);
        const net = Math.round((total - tax) * 100) / 100;
        const lines: Array<{ accountId: string; debit?: number; credit?: number }> = [
          { accountId: debit.accountId, debit: total },
          { accountId: rev.accountId, credit: net },
        ];
        if (tax > 0) {
          const taxMap = await requireMapping(db, order.branch_id, "output_tax");
          lines.push({ accountId: taxMap.accountId, credit: tax });
        }
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: order.branch_id,
          entryDate: today,
          description: `Sales post order ${order.id}`,
          referenceType: "order",
          referenceId: order.id,
          status: "posted",
          lines,
        });
        await db.from("finance_postings").upsert(
          {
            source_module: "order",
            source_id: order.id,
            journal_entry_id: journal.id,
            idempotency_key: `sales_post:${order.id}`,
            status: "posted",
            branch_id: order.branch_id,
            posted_by: actorUserId,
          },
          { onConflict: "source_module,source_id" },
        );
        return { ok: true, orderId: order.id };
      } catch (e) {
        await recordException(db, {
          branchId: order.branch_id,
          exceptionType: e instanceof ApiError && e.code === "ACCOUNT_MAPPING_REQUIRED" ? "missing_account_mapping" : "failed_automated_posting",
          sourceModule: "order",
          sourceId: order.id,
          message: e instanceof ApiError ? e.message : "Sales post failed",
          requestId,
        });
        throw e;
      } finally {
        void actorUserId;
      }
    },

    async postSupplierInvoice(scope, actorUserId, invoiceId, requestId) {
      const db = client(env);
      const { data: existing } = await db
        .from("finance_postings")
        .select("id, status")
        .eq("source_module", "supplier_invoice")
        .eq("source_id", invoiceId)
        .maybeSingle();
      if (existing?.status === "posted") return { idempotent: true, invoiceId };
      const { data: inv, error } = await db
        .from("supplier_invoices")
        .select("id, branch_id, total_amount, status")
        .eq("id", invoiceId)
        .maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!inv) throw new ApiError(404, "SUPPLIER_INVOICE_NOT_FOUND", "Supplier invoice not found.");
      assertBranchMembership(scope, inv.branch_id);
      const today = new Date().toISOString().slice(0, 10);
      await assertPeriodAllows(db, inv.branch_id, today);
      try {
        const invMap = await requireMapping(db, inv.branch_id, "inventory_asset").catch(async () =>
          requireMapping(db, inv.branch_id, "expense_default"),
        );
        const ap = await requireMapping(db, inv.branch_id, "ap_control");
        const amount = Number(inv.total_amount);
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: inv.branch_id,
          entryDate: today,
          description: `AP invoice accrual ${inv.id}`,
          referenceType: "supplier_invoice",
          referenceId: inv.id,
          status: "posted",
          lines: [
            { accountId: invMap.accountId, debit: amount },
            { accountId: ap.accountId, credit: amount },
          ],
        });
        await db.from("finance_postings").upsert(
          {
            source_module: "supplier_invoice",
            source_id: inv.id,
            journal_entry_id: journal.id,
            idempotency_key: `supplier_invoice_post:${inv.id}`,
            status: "posted",
            branch_id: inv.branch_id,
            posted_by: actorUserId,
          },
          { onConflict: "source_module,source_id" },
        );
        return { ok: true, invoiceId: inv.id };
      } catch (e) {
        await recordException(db, {
          branchId: inv.branch_id,
          exceptionType: "failed_automated_posting",
          sourceModule: "supplier_invoice",
          sourceId: inv.id,
          message: e instanceof ApiError ? e.message : "AP invoice post failed",
          requestId,
        });
        throw e;
      } finally {
        void actorUserId;
      }
    },

    async postCogsEvent(scope, actorUserId, cogsEventId, requestId) {
      const db = client(env);
      const { data: ev, error } = await db.from("inventory_cogs_events").select("*").eq("id", cogsEventId).maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!ev) throw new ApiError(404, "COGS_EVENT_NOT_FOUND", "COGS event not found.");
      assertBranchMembership(scope, ev.branch_id);
      if (ev.status === "posted") return { idempotent: true, cogsEventId };
      if (ev.amount == null) {
        await recordException(db, {
          branchId: ev.branch_id,
          exceptionType: "cogs_event_pending",
          sourceModule: "inventory_cogs_event",
          sourceId: ev.id,
          message: "COGS amount unavailable — cannot post without fabricating cost",
          requestId,
        });
        throw new ApiError(422, "COGS_AMOUNT_UNAVAILABLE", "COGS event has no amount; refusing to fabricate.");
      }
      const today = new Date().toISOString().slice(0, 10);
      await assertPeriodAllows(db, ev.branch_id, today);
      try {
        const cogs = await requireMapping(db, ev.branch_id, "cogs");
        const inv = await requireMapping(db, ev.branch_id, "inventory_asset");
        const amount = Number(ev.amount);
        const isReverse = ev.event_type === "cogs_reverse_ready";
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: ev.branch_id,
          entryDate: today,
          description: `COGS ${ev.event_type} ${ev.id}`,
          referenceType: "inventory_cogs_event",
          referenceId: ev.id,
          status: "posted",
          lines: isReverse
            ? [
                { accountId: inv.accountId, debit: amount },
                { accountId: cogs.accountId, credit: amount },
              ]
            : [
                { accountId: cogs.accountId, debit: amount },
                { accountId: inv.accountId, credit: amount },
              ],
        });
        await db
          .from("inventory_cogs_events")
          .update({ status: "posted", posting_deferred_reason: null })
          .eq("id", ev.id);
        await db.from("finance_postings").upsert(
          {
            source_module: "inventory_cogs_event",
            source_id: ev.id,
            journal_entry_id: journal.id,
            idempotency_key: ev.idempotency_key,
            status: "posted",
            branch_id: ev.branch_id,
            posted_by: actorUserId,
          },
          { onConflict: "source_module,source_id" },
        );
        return { ok: true, cogsEventId: ev.id };
      } catch (e) {
        await recordException(db, {
          branchId: ev.branch_id,
          exceptionType: "cogs_event_pending",
          sourceModule: "inventory_cogs_event",
          sourceId: ev.id,
          message: e instanceof ApiError ? e.message : "COGS post failed",
          requestId,
        });
        throw e;
      } finally {
        void actorUserId;
      }
    },

    async postPayrollAccrual(scope, actorUserId, payrollRunId, requestId) {
      const db = client(env);
      const { data: existing } = await db
        .from("finance_postings")
        .select("id, journal_entry_id, status")
        .eq("source_module", "payroll_run")
        .eq("source_id", payrollRunId)
        .maybeSingle();
      if (existing?.status === "posted" && existing.journal_entry_id) {
        return {
          ok: true,
          payrollRunId,
          journalEntryId: String(existing.journal_entry_id),
          postingStatus: "already_posted" as const,
          postingBlockedReason: null,
          idempotent: true,
        };
      }

      const { data: run, error } = await db
        .from("hr_payroll_runs")
        .select("id, branch_id, status, accrual_posting_status, accrual_journal_entry_id")
        .eq("id", payrollRunId)
        .maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!run) throw new ApiError(404, "HR_PAYROLL_RUN_NOT_FOUND", "Payroll run not found.");
      assertBranchMembership(scope, run.branch_id);

      if (!["approved", "payment_ready", "locked"].includes(String(run.status))) {
        throw new ApiError(409, "HR_PAYROLL_NOT_APPROVED", "Accrual posting requires an approved payroll run.");
      }

      const { data: lines, error: lineErr } = await db
        .from("hr_payroll_lines")
        .select("gross_pay, net_pay, deductions, line_status")
        .eq("payroll_run_id", payrollRunId);
      if (lineErr) throwMappedDbError("FINANCE_PHASE2_DB", lineErr);

      const postable = (lines ?? []).filter((l) => l.line_status !== "blocked");
      const gross = Math.round(postable.reduce((s, l) => s + Number(l.gross_pay ?? 0), 0) * 100) / 100;
      const net = Math.round(postable.reduce((s, l) => s + Number(l.net_pay ?? 0), 0) * 100) / 100;
      const deductions = Math.round(postable.reduce((s, l) => s + Number(l.deductions ?? 0), 0) * 100) / 100;

      if (gross <= 0) {
        await db
          .from("hr_payroll_runs")
          .update({
            accrual_posting_status: "deferred",
            accrual_posting_blocked_reason: "No postable gross pay on run lines.",
          })
          .eq("id", payrollRunId);
        return {
          ok: true,
          payrollRunId,
          journalEntryId: null,
          postingStatus: "deferred" as const,
          postingBlockedReason: "No postable gross pay on run lines.",
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      try {
        await assertPeriodAllows(db, run.branch_id, today);
        const expense = await requireMapping(db, run.branch_id, "salary_expense");
        const payable = await requireMapping(db, run.branch_id, "payroll_payable");
        const journalLines: Array<{ accountId: string; debit?: number; credit?: number }> = [
          { accountId: expense.accountId, debit: gross },
          { accountId: payable.accountId, credit: net },
        ];
        if (deductions > 0) {
          const dedMap = await requireMapping(db, run.branch_id, "payroll_deduction_payable");
          journalLines.push({ accountId: dedMap.accountId, credit: deductions });
        }

        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: run.branch_id,
          entryDate: today,
          description: `Payroll accrual run ${payrollRunId}`,
          referenceType: "payroll_run",
          referenceId: payrollRunId,
          status: "posted",
          lines: journalLines,
        });

        await db.from("finance_postings").upsert(
          {
            source_module: "payroll_run",
            source_id: payrollRunId,
            journal_entry_id: journal.id,
            idempotency_key: `payroll_accrual:${payrollRunId}`,
            status: "posted",
            branch_id: run.branch_id,
            posted_by: actorUserId,
          },
          { onConflict: "source_module,source_id" },
        );

        await db
          .from("hr_payroll_runs")
          .update({
            accrual_journal_entry_id: journal.id,
            accrual_posting_status: "posted",
            accrual_posting_blocked_reason: null,
          })
          .eq("id", payrollRunId);

        await db.from("hr_payroll_posting_events").upsert(
          {
            payroll_run_id: payrollRunId,
            branch_id: run.branch_id,
            event_type: "payroll_accrual_ready",
            status: "posted",
            idempotency_key: `payroll_accrual_ready:${payrollRunId}`,
            payload: { journalEntryId: journal.id, gross, net, deductions },
            deferred_reason: "",
          },
          { onConflict: "idempotency_key" },
        );

        return {
          ok: true,
          payrollRunId,
          journalEntryId: journal.id,
          postingStatus: "posted" as const,
          postingBlockedReason: null,
        };
      } catch (e) {
        const reason = e instanceof ApiError ? e.message : "Payroll accrual post failed";
        const status = e instanceof ApiError && e.code === "ACCOUNT_MAPPING_REQUIRED" ? "blocked" : "blocked";
        await recordException(db, {
          branchId: run.branch_id,
          exceptionType:
            e instanceof ApiError && e.code === "ACCOUNT_MAPPING_REQUIRED"
              ? "missing_account_mapping"
              : "failed_automated_posting",
          sourceModule: "payroll_run",
          sourceId: payrollRunId,
          message: reason,
          requestId,
        });
        await db
          .from("hr_payroll_runs")
          .update({
            accrual_posting_status: status,
            accrual_posting_blocked_reason: reason,
          })
          .eq("id", payrollRunId);
        await db.from("hr_payroll_posting_events").upsert(
          {
            payroll_run_id: payrollRunId,
            branch_id: run.branch_id,
            event_type: "payroll_accrual_ready",
            status: "deferred",
            idempotency_key: `payroll_accrual_ready:${payrollRunId}`,
            payload: { gross, net, deductions },
            deferred_reason: reason,
          },
          { onConflict: "idempotency_key" },
        );
        return {
          ok: false,
          payrollRunId,
          journalEntryId: null,
          postingStatus: "blocked" as const,
          postingBlockedReason: reason,
        };
      }
    },

    async postPayrollSettlement(scope, actorUserId, settlementId, requestId) {
      const db = client(env);
      const { data: existing } = await db
        .from("finance_postings")
        .select("id, journal_entry_id, status")
        .eq("source_module", "payroll_settlement")
        .eq("source_id", settlementId)
        .maybeSingle();
      if (existing?.status === "posted" && existing.journal_entry_id) {
        return {
          ok: true,
          settlementId,
          journalEntryId: String(existing.journal_entry_id),
          postingStatus: "already_posted" as const,
          postingBlockedReason: null,
          idempotent: true,
        };
      }

      const { data: settlement, error } = await db
        .from("hr_payroll_settlements")
        .select("id, payroll_run_id, employee_id, amount, currency, status, payment_reference")
        .eq("id", settlementId)
        .maybeSingle();
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      if (!settlement) throw new ApiError(404, "HR_PAYROLL_SETTLEMENT_NOT_FOUND", "Settlement not found.");
      if (settlement.status !== "settled") {
        throw new ApiError(409, "SETTLEMENT_NOT_SETTLED", "Only settled settlements can post payment journals.");
      }

      const { data: run, error: runErr } = await db
        .from("hr_payroll_runs")
        .select("id, branch_id, status")
        .eq("id", settlement.payroll_run_id)
        .maybeSingle();
      if (runErr) throwMappedDbError("FINANCE_PHASE2_DB", runErr);
      if (!run) throw new ApiError(404, "HR_PAYROLL_RUN_NOT_FOUND", "Payroll run not found.");
      assertBranchMembership(scope, run.branch_id);

      const amount = Number(settlement.amount);
      const today = new Date().toISOString().slice(0, 10);
      try {
        await assertPeriodAllows(db, run.branch_id, today);
        const payable = await requireMapping(db, run.branch_id, "payroll_payable");
        const cash = await requireMapping(db, run.branch_id, "cash_on_hand").catch(async () =>
          requireMapping(db, run.branch_id, "bank_clearing"),
        );
        const journal = await finance.createJournalEntry(scope, actorUserId, {
          branchId: run.branch_id,
          entryDate: today,
          description: `Payroll settlement ${settlement.payment_reference}`,
          referenceType: "payroll_settlement",
          referenceId: settlement.id,
          status: "posted",
          lines: [
            { accountId: payable.accountId, debit: amount },
            { accountId: cash.accountId, credit: amount },
          ],
        });
        await db.from("finance_postings").upsert(
          {
            source_module: "payroll_settlement",
            source_id: settlement.id,
            journal_entry_id: journal.id,
            idempotency_key: `payroll_settlement:${settlement.id}`,
            status: "posted",
            branch_id: run.branch_id,
            posted_by: actorUserId,
          },
          { onConflict: "source_module,source_id" },
        );
        await db.from("hr_payroll_posting_events").upsert(
          {
            payroll_run_id: run.id,
            branch_id: run.branch_id,
            event_type: "payroll_payment_ready",
            status: "posted",
            idempotency_key: `payroll_settlement_post:${settlement.id}`,
            payload: { settlementId: settlement.id, journalEntryId: journal.id, amount },
            deferred_reason: "",
          },
          { onConflict: "idempotency_key" },
        );
        return {
          ok: true,
          settlementId,
          journalEntryId: journal.id,
          postingStatus: "posted" as const,
          postingBlockedReason: null,
        };
      } catch (e) {
        const reason = e instanceof ApiError ? e.message : "Payroll settlement post failed";
        await recordException(db, {
          branchId: run.branch_id,
          exceptionType:
            e instanceof ApiError && e.code === "ACCOUNT_MAPPING_REQUIRED"
              ? "missing_account_mapping"
              : "failed_automated_posting",
          sourceModule: "payroll_settlement",
          sourceId: settlementId,
          message: reason,
          requestId,
        });
        return {
          ok: false,
          settlementId,
          journalEntryId: null,
          postingStatus: "blocked" as const,
          postingBlockedReason: reason,
        };
      } finally {
        void actorUserId;
      }
    },

    async mappingHealth(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const db = client(env);
      const required = [
        "cash_on_hand",
        "bank_clearing",
        "ap_control",
        "ar_control",
        "sales_revenue",
        "inventory_asset",
        "cogs",
        "salary_expense",
        "payroll_payable",
      ];
      const { data, error } = await db
        .from("finance_account_mappings")
        .select("purpose")
        .eq("branch_id", branchId);
      if (error) throwMappedDbError("FINANCE_PHASE2_DB", error);
      const present = (data ?? []).map((r) => String(r.purpose));
      const missing = required.filter((p) => !present.includes(p));
      return {
        branchId,
        required,
        present: present.filter(
          (p) => (MAPPING_PURPOSES as readonly string[]).includes(p) || p.startsWith("expense_category:"),
        ),
        missing,
        status: missing.length === 0 ? "LIVE" : "UNAVAILABLE",
      };
    },
  };
}
