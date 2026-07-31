/**
 * RC3 Finance PR1 — cash reconciliation, expenses, account mappings,
 * controlled journal posting adapters, attention feed.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import type { BranchActorScope } from "../tables/management.js";
import { startOfTodayKarachiIso } from "../orders/management.js";
import type { FinanceService, JournalEntryRecord } from "./management.js";

export const CASH_RECON_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "posted",
  "voided",
] as const;
export type CashReconStatus = (typeof CASH_RECON_STATUSES)[number];

export const EXPENSE_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
  "voided",
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const MAPPING_PURPOSES = [
  "cash_on_hand",
  "cash_over_short",
  "ap_control",
  "bank_clearing",
  "expense_default",
] as const;

export type MappingPurpose = (typeof MAPPING_PURPOSES)[number] | `expense_category:${string}`;

export interface AccountMappingRecord {
  id: string;
  branchId: string;
  purpose: string;
  accountId: string;
  accountCode: string | null;
  accountName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashReconciliationRecord {
  id: string;
  branchId: string;
  businessDate: string;
  registerId: string | null;
  openingFloat: number;
  cashSales: number;
  cashRefunds: number;
  cashDrops: number;
  paidOutExpenses: number;
  otherInflows: number;
  otherOutflows: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  closingNote: string | null;
  status: CashReconStatus;
  preparedBy: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  journalEntryId: string | null;
  postingStatus: string;
  postingBlockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseClaimRecord {
  id: string;
  expenseNumber: string;
  branchId: string;
  category: string;
  expenseDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  payee: string | null;
  description: string;
  receiptRef: string | null;
  status: ExpenseStatus;
  submittedBy: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  journalEntryId: string | null;
  postingStatus: string;
  postingBlockedReason: string | null;
  sourceContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAttentionSnapshot {
  branchId: string | null;
  state: "available" | "unavailable";
  unavailableReason: string | null;
  cashClosesAwaitingReconciliation: number;
  cashClosesAwaitingApproval: number;
  unresolvedCashVariance: number;
  pendingExpenseApprovals: number;
  approvedExpensesAwaitingPosting: number;
  overdueSupplierInvoices: number;
  invoicesBlockedByMismatch: number;
  paymentsAwaitingJournalPosting: number;
  totalApprovedExpensesInPeriod: number | null;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** Server-side expected cash — never trust client totals. */
export function computeExpectedCash(input: {
  openingFloat: number;
  cashSales: number;
  cashRefunds: number;
  cashDrops: number;
  paidOutExpenses: number;
  otherInflows: number;
  otherOutflows: number;
}): number {
  return money(
    input.openingFloat +
      input.cashSales -
      input.cashRefunds -
      input.cashDrops -
      input.paidOutExpenses +
      input.otherInflows -
      input.otherOutflows,
  );
}

export function computeVariance(countedCash: number | null, expectedCash: number): number | null {
  if (countedCash === null || countedCash === undefined) return null;
  return money(countedCash - expectedCash);
}

function karachiBusinessDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function generateExpenseNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `EXP-${stamp}-${suffix}`;
}

type CashRow = {
  id: string;
  branch_id: string;
  business_date: string;
  register_id: string | null;
  opening_float: number | string;
  cash_sales: number | string;
  cash_refunds: number | string;
  cash_drops: number | string;
  paid_out_expenses: number | string;
  other_inflows: number | string;
  other_outflows: number | string;
  expected_cash: number | string;
  counted_cash: number | string | null;
  variance: number | string | null;
  closing_note: string | null;
  status: string;
  prepared_by: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  journal_entry_id: string | null;
  posting_status: string;
  posting_blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: string;
  expense_number: string;
  branch_id: string;
  category: string;
  expense_date: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  payee: string | null;
  description: string;
  receipt_ref: string | null;
  status: string;
  submitted_by: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  journal_entry_id: string | null;
  posting_status: string;
  posting_blocked_reason: string | null;
  source_context: string | null;
  created_at: string;
  updated_at: string;
};

const CASH_SELECT = `id, branch_id, business_date, register_id, opening_float, cash_sales, cash_refunds,
  cash_drops, paid_out_expenses, other_inflows, other_outflows, expected_cash, counted_cash, variance,
  closing_note, status, prepared_by, reviewed_by, rejection_reason, journal_entry_id, posting_status,
  posting_blocked_reason, created_at, updated_at`;

const EXPENSE_SELECT = `id, expense_number, branch_id, category, expense_date, amount, currency, payment_method,
  payee, description, receipt_ref, status, submitted_by, approved_by, rejection_reason, journal_entry_id,
  posting_status, posting_blocked_reason, source_context, created_at, updated_at`;

function mapCash(row: CashRow): CashReconciliationRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    businessDate: row.business_date,
    registerId: row.register_id,
    openingFloat: money(Number(row.opening_float)),
    cashSales: money(Number(row.cash_sales)),
    cashRefunds: money(Number(row.cash_refunds)),
    cashDrops: money(Number(row.cash_drops)),
    paidOutExpenses: money(Number(row.paid_out_expenses)),
    otherInflows: money(Number(row.other_inflows)),
    otherOutflows: money(Number(row.other_outflows)),
    expectedCash: money(Number(row.expected_cash)),
    countedCash: row.counted_cash == null ? null : money(Number(row.counted_cash)),
    variance: row.variance == null ? null : money(Number(row.variance)),
    closingNote: row.closing_note,
    status: row.status as CashReconStatus,
    preparedBy: row.prepared_by,
    reviewedBy: row.reviewed_by,
    rejectionReason: row.rejection_reason,
    journalEntryId: row.journal_entry_id,
    postingStatus: row.posting_status,
    postingBlockedReason: row.posting_blocked_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExpense(row: ExpenseRow): ExpenseClaimRecord {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    branchId: row.branch_id,
    category: row.category,
    expenseDate: row.expense_date,
    amount: money(Number(row.amount)),
    currency: row.currency,
    paymentMethod: row.payment_method,
    payee: row.payee,
    description: row.description,
    receiptRef: row.receipt_ref,
    status: row.status as ExpenseStatus,
    submittedBy: row.submitted_by,
    approvedBy: row.approved_by,
    rejectionReason: row.rejection_reason,
    journalEntryId: row.journal_entry_id,
    postingStatus: row.posting_status,
    postingBlockedReason: row.posting_blocked_reason,
    sourceContext: row.source_context,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function writeAudit(
  client: SupabaseClient,
  table: "cash_reconciliation_events" | "expense_claim_events",
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from(table).insert(payload);
  if (error) {
    // Audit failure must not silently succeed operationally — surface as dependency error.
    throwMappedDbError("FINANCE_AUDIT_WRITE_FAILED", error);
  }
}

async function resolveMappingAccountId(
  client: SupabaseClient,
  branchId: string,
  purposes: string[],
): Promise<{ accountId: string | null; missing: string[] }> {
  const { data, error } = await client
    .from("finance_account_mappings")
    .select("purpose, account_id")
    .eq("branch_id", branchId)
    .in("purpose", purposes);
  if (error) throwMappedDbError("FINANCE_MAPPINGS_READ_FAILED", error);
  const byPurpose = new Map((data ?? []).map((r) => [String(r.purpose), String(r.account_id)]));
  const missing: string[] = [];
  let accountId: string | null = null;
  for (const purpose of purposes) {
    const id = byPurpose.get(purpose);
    if (id) {
      accountId = id;
      break;
    }
    missing.push(purpose);
  }
  return { accountId, missing };
}

export interface FinanceOperationsService {
  listAccountMappings(scope: BranchActorScope, branchId: string): Promise<AccountMappingRecord[]>;
  upsertAccountMapping(
    scope: BranchActorScope,
    input: { branchId: string; purpose: string; accountId: string },
  ): Promise<AccountMappingRecord>;

  listCashReconciliations(scope: BranchActorScope, branchId?: string): Promise<CashReconciliationRecord[]>;
  createCashReconciliation(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId: string;
      businessDate?: string;
      registerId?: string | null;
      openingFloat: number;
      cashRefunds?: number;
      cashDrops?: number;
      otherInflows?: number;
      otherOutflows?: number;
      countedCash?: number | null;
      closingNote?: string | null;
      idempotencyKey?: string | null;
    },
  ): Promise<CashReconciliationRecord>;
  updateCashReconciliationDraft(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    input: Partial<{
      openingFloat: number;
      cashRefunds: number;
      cashDrops: number;
      otherInflows: number;
      otherOutflows: number;
      countedCash: number | null;
      closingNote: string | null;
    }>,
  ): Promise<CashReconciliationRecord>;
  transitionCashReconciliation(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    action: "submit" | "approve" | "reject" | "void" | "post",
    reason?: string | null,
  ): Promise<CashReconciliationRecord>;

  listExpenseClaims(scope: BranchActorScope, branchId?: string): Promise<ExpenseClaimRecord[]>;
  createExpenseClaim(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId: string;
      category: string;
      expenseDate?: string;
      amount: number;
      currency?: string;
      paymentMethod?: string;
      payee?: string | null;
      description: string;
      receiptRef?: string | null;
      sourceContext?: string | null;
      idempotencyKey?: string | null;
    },
  ): Promise<ExpenseClaimRecord>;
  updateExpenseClaimDraft(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    input: Partial<{
      category: string;
      expenseDate: string;
      amount: number;
      paymentMethod: string;
      payee: string | null;
      description: string;
      receiptRef: string | null;
    }>,
  ): Promise<ExpenseClaimRecord>;
  transitionExpenseClaim(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    action: "submit" | "approve" | "reject" | "pay" | "void" | "post",
    reason?: string | null,
  ): Promise<ExpenseClaimRecord>;

  reverseJournal(
    scope: BranchActorScope,
    actorUserId: string,
    journalId: string,
    reason: string,
  ): Promise<{ originalJournalId: string; reversalJournalId: string; reversal: JournalEntryRecord }>;

  getAttention(scope: BranchActorScope, branchId?: string): Promise<FinanceAttentionSnapshot>;
}

export function createFinanceOperationsService(
  envStatus: EnvironmentStatus,
  finance: FinanceService,
): FinanceOperationsService {
  const supabase = () => createServiceClient(envStatus);

  async function loadCashSales(branchId: string, businessDate: string): Promise<number> {
    const client = supabase();
    // Align with Z-report: cash paid payments for Karachi business day of orders.
    // When reconciling "today", use dayStart; for historical dates approximate via date filter on orders.
    const dayStart =
      businessDate === karachiBusinessDate()
        ? startOfTodayKarachiIso()
        : `${businessDate}T00:00:00+05:00`;
    const dayEnd = `${businessDate}T23:59:59.999+05:00`;

    const { data, error } = await client
      .from("payments")
      .select("amount, status, payment_method, order_id, orders!inner(id, branch_id, created_at, status)")
      .eq("orders.branch_id", branchId)
      .gte("orders.created_at", dayStart)
      .lte("orders.created_at", dayEnd);

    if (error) throw new ApiError(500, "CASH_SALES_LOAD_FAILED", error.message);

    const rows = (data ?? []) as unknown as Array<{
      amount?: number;
      status?: string;
      payment_method?: string;
      order_id?: string;
      orders?: { status: string } | Array<{ status: string }>;
    }>;

    let total = 0;
    for (const row of rows) {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      if (!order) continue;
      if (String(order.status).toLowerCase() === "cancelled") continue;
      const method = String(row.payment_method ?? "")
        .trim()
        .toLowerCase();
      const paymentStatus = String(row.status ?? "")
        .trim()
        .toLowerCase();
      if (method !== "cash" || paymentStatus !== "paid") continue;
      total += Number(row.amount ?? 0);
    }
    return money(total);
  }

  async function loadPaidOutCashExpenses(branchId: string, businessDate: string): Promise<number> {
    const client = supabase();
    const { data, error } = await client
      .from("expense_claims")
      .select("amount")
      .eq("branch_id", branchId)
      .eq("expense_date", businessDate)
      .eq("payment_method", "cash")
      .in("status", ["approved", "paid"]);
    if (error) {
      // Table may not exist yet in environments without migration — treat as zero only if relation missing.
      if (/relation .* does not exist/i.test(error.message)) return 0;
      throwMappedDbError("EXPENSE_CLAIMS_READ_FAILED", error);
    }
    return money((data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0));
  }

  async function refreshTotals(
    client: SupabaseClient,
    row: CashRow,
    overrides: Partial<{
      opening_float: number;
      cash_refunds: number;
      cash_drops: number;
      other_inflows: number;
      other_outflows: number;
      counted_cash: number | null;
      paid_out_expenses: number;
      cash_sales: number;
    }> = {},
  ): Promise<{ expected: number; variance: number | null; patch: Record<string, unknown> }> {
    const openingFloat = money(Number(overrides.opening_float ?? row.opening_float));
    const cashSales = money(Number(overrides.cash_sales ?? row.cash_sales));
    const cashRefunds = money(Number(overrides.cash_refunds ?? row.cash_refunds));
    const cashDrops = money(Number(overrides.cash_drops ?? row.cash_drops));
    const paidOut = money(Number(overrides.paid_out_expenses ?? row.paid_out_expenses));
    const otherIn = money(Number(overrides.other_inflows ?? row.other_inflows));
    const otherOut = money(Number(overrides.other_outflows ?? row.other_outflows));
    const counted =
      overrides.counted_cash !== undefined
        ? overrides.counted_cash
        : row.counted_cash == null
          ? null
          : money(Number(row.counted_cash));

    const expected = computeExpectedCash({
      openingFloat,
      cashSales,
      cashRefunds,
      cashDrops,
      paidOutExpenses: paidOut,
      otherInflows: otherIn,
      otherOutflows: otherOut,
    });
    const variance = computeVariance(counted, expected);
    return {
      expected,
      variance,
      patch: {
        opening_float: openingFloat,
        cash_sales: cashSales,
        cash_refunds: cashRefunds,
        cash_drops: cashDrops,
        paid_out_expenses: paidOut,
        other_inflows: otherIn,
        other_outflows: otherOut,
        counted_cash: counted,
        expected_cash: expected,
        variance,
        updated_at: new Date().toISOString(),
      },
    };
  }

  async function tryPostCashVarianceJournal(
    scope: BranchActorScope,
    actorUserId: string,
    record: CashReconciliationRecord,
  ): Promise<{ journalId: string | null; postingStatus: string; blockedReason: string | null }> {
    const variance = record.variance ?? 0;
    if (Math.abs(variance) < 0.001) {
      return { journalId: null, postingStatus: "not_applicable", blockedReason: null };
    }

    const client = supabase();
    const cashMap = await resolveMappingAccountId(client, record.branchId, ["cash_on_hand"]);
    const overShortMap = await resolveMappingAccountId(client, record.branchId, ["cash_over_short"]);
    if (!cashMap.accountId || !overShortMap.accountId) {
      return {
        journalId: null,
        postingStatus: "blocked",
        blockedReason: "Journal posting requires account mapping",
      };
    }

    // Existing posting?
    const { data: existing } = await client
      .from("finance_postings")
      .select("id, journal_entry_id, status")
      .eq("source_module", "cash_reconciliation")
      .eq("source_id", record.id)
      .maybeSingle();
    if (existing?.journal_entry_id && existing.status === "posted") {
      return {
        journalId: String(existing.journal_entry_id),
        postingStatus: "posted",
        blockedReason: null,
      };
    }

    const abs = money(Math.abs(variance));
    const lines =
      variance > 0
        ? [
            { accountId: cashMap.accountId, debit: abs, credit: 0 },
            { accountId: overShortMap.accountId, debit: 0, credit: abs },
          ]
        : [
            { accountId: overShortMap.accountId, debit: abs, credit: 0 },
            { accountId: cashMap.accountId, debit: 0, credit: abs },
          ];

    const journal = await finance.createJournalEntry(scope, actorUserId, {
      branchId: record.branchId,
      entryDate: record.businessDate,
      description: `Cash reconciliation variance ${record.businessDate}`,
      referenceType: "cash_reconciliation",
      referenceId: record.id,
      status: "posted",
      lines,
    });

    const { error: postErr } = await client.from("finance_postings").insert({
      branch_id: record.branchId,
      source_module: "cash_reconciliation",
      source_id: record.id,
      journal_entry_id: journal.id,
      idempotency_key: `cash_recon_post:${record.id}`,
      status: "posted",
      posted_by: actorUserId,
    });
    if (postErr && postErr.code !== "23505") {
      throwMappedDbError("FINANCE_POSTING_CREATE_FAILED", postErr);
    }

    return { journalId: journal.id, postingStatus: "posted", blockedReason: null };
  }

  async function tryPostExpenseJournal(
    scope: BranchActorScope,
    actorUserId: string,
    record: ExpenseClaimRecord,
  ): Promise<{ journalId: string | null; postingStatus: string; blockedReason: string | null }> {
    const client = supabase();
    const categoryPurpose = `expense_category:${record.category.trim().toLowerCase()}`;
    const expenseMap = await resolveMappingAccountId(client, record.branchId, [
      categoryPurpose,
      "expense_default",
    ]);
    const cashOrBankPurpose = record.paymentMethod === "cash" ? "cash_on_hand" : "bank_clearing";
    const creditMap = await resolveMappingAccountId(client, record.branchId, [cashOrBankPurpose]);

    if (!expenseMap.accountId || !creditMap.accountId) {
      return {
        journalId: null,
        postingStatus: "blocked",
        blockedReason: "Journal posting requires account mapping",
      };
    }

    const { data: existing } = await client
      .from("finance_postings")
      .select("id, journal_entry_id, status")
      .eq("source_module", "expense_claim")
      .eq("source_id", record.id)
      .maybeSingle();
    if (existing?.journal_entry_id && existing.status === "posted") {
      return {
        journalId: String(existing.journal_entry_id),
        postingStatus: "posted",
        blockedReason: null,
      };
    }

    const amount = money(record.amount);
    const journal = await finance.createJournalEntry(scope, actorUserId, {
      branchId: record.branchId,
      entryDate: record.expenseDate,
      description: `Expense ${record.expenseNumber}: ${record.description}`.slice(0, 2000),
      referenceType: "expense_claim",
      referenceId: record.id,
      status: "posted",
      lines: [
        { accountId: expenseMap.accountId, debit: amount, credit: 0 },
        { accountId: creditMap.accountId, debit: 0, credit: amount },
      ],
    });

    const { error: postErr } = await client.from("finance_postings").insert({
      branch_id: record.branchId,
      source_module: "expense_claim",
      source_id: record.id,
      journal_entry_id: journal.id,
      idempotency_key: `expense_post:${record.id}`,
      status: "posted",
      posted_by: actorUserId,
    });
    if (postErr && postErr.code !== "23505") {
      throwMappedDbError("FINANCE_POSTING_CREATE_FAILED", postErr);
    }

    return { journalId: journal.id, postingStatus: "posted", blockedReason: null };
  }

  return {
    async listAccountMappings(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const client = supabase();
      const { data, error } = await client
        .from("finance_account_mappings")
        .select(
          "id, branch_id, purpose, account_id, created_at, updated_at, chart_of_accounts(account_code, account_name)",
        )
        .eq("branch_id", branchId)
        .order("purpose");
      if (error) throwMappedDbError("FINANCE_MAPPINGS_READ_FAILED", error);
      return (data ?? []).map((row) => {
        const coa = Array.isArray(row.chart_of_accounts)
          ? row.chart_of_accounts[0]
          : row.chart_of_accounts;
        return {
          id: String(row.id),
          branchId: String(row.branch_id),
          purpose: String(row.purpose),
          accountId: String(row.account_id),
          accountCode: coa?.account_code ?? null,
          accountName: coa?.account_name ?? null,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
      });
    },

    async upsertAccountMapping(scope, input) {
      assertBranchMembership(scope, input.branchId);
      const purpose = input.purpose.trim();
      const allowed =
        (MAPPING_PURPOSES as readonly string[]).includes(purpose) ||
        /^expense_category:[a-z0-9_-]+$/i.test(purpose);
      if (!allowed) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid mapping purpose.");
      }
      const client = supabase();
      const { data: account, error: accErr } = await client
        .from("chart_of_accounts")
        .select("id, branch_id, is_active")
        .eq("id", input.accountId)
        .maybeSingle();
      if (accErr) throwMappedDbError("CHART_OF_ACCOUNTS_READ_FAILED", accErr);
      if (!account || !account.is_active) {
        throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account not found or inactive.");
      }
      if (account.branch_id !== input.branchId) {
        throw new ApiError(400, "VALIDATION_ERROR", "Account must belong to the mapping branch.");
      }

      const { data, error } = await client
        .from("finance_account_mappings")
        .upsert(
          {
            branch_id: input.branchId,
            purpose,
            account_id: input.accountId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "branch_id,purpose" },
        )
        .select(
          "id, branch_id, purpose, account_id, created_at, updated_at, chart_of_accounts(account_code, account_name)",
        )
        .single();
      if (error) throwMappedDbError("FINANCE_MAPPINGS_UPSERT_FAILED", error);
      const coa = Array.isArray(data.chart_of_accounts)
        ? data.chart_of_accounts[0]
        : data.chart_of_accounts;
      return {
        id: String(data.id),
        branchId: String(data.branch_id),
        purpose: String(data.purpose),
        accountId: String(data.account_id),
        accountCode: coa?.account_code ?? null,
        accountName: coa?.account_name ?? null,
        createdAt: String(data.created_at),
        updatedAt: String(data.updated_at),
      };
    },

    async listCashReconciliations(scope, branchId) {
      const client = supabase();
      let query = client
        .from("cash_reconciliations")
        .select(CASH_SELECT)
        .order("business_date", { ascending: false })
        .limit(200);
      if (branchId) {
        assertBranchMembership(scope, branchId);
        query = query.eq("branch_id", branchId);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.in("branch_id", scope.branchIds);
      }
      const { data, error } = await query;
      if (error) throwMappedDbError("CASH_RECONCILIATIONS_READ_FAILED", error);
      return ((data ?? []) as CashRow[]).map(mapCash);
    },

    async createCashReconciliation(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const businessDate = input.businessDate || karachiBusinessDate();
      const cashSales = await loadCashSales(input.branchId, businessDate);
      const paidOut = await loadPaidOutCashExpenses(input.branchId, businessDate);
      const openingFloat = money(input.openingFloat);
      const cashRefunds = money(input.cashRefunds ?? 0);
      const cashDrops = money(input.cashDrops ?? 0);
      const otherInflows = money(input.otherInflows ?? 0);
      const otherOutflows = money(input.otherOutflows ?? 0);
      const countedCash =
        input.countedCash === undefined || input.countedCash === null
          ? null
          : money(input.countedCash);
      const expected = computeExpectedCash({
        openingFloat,
        cashSales,
        cashRefunds,
        cashDrops,
        paidOutExpenses: paidOut,
        otherInflows,
        otherOutflows,
      });
      const variance = computeVariance(countedCash, expected);

      if (input.idempotencyKey) {
        const client = supabase();
        const { data: existing } = await client
          .from("cash_reconciliations")
          .select(CASH_SELECT)
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (existing) return mapCash(existing as CashRow);
      }

      const client = supabase();
      const { data, error } = await client
        .from("cash_reconciliations")
        .insert({
          branch_id: input.branchId,
          business_date: businessDate,
          register_id: input.registerId ?? null,
          opening_float: openingFloat,
          cash_sales: cashSales,
          cash_refunds: cashRefunds,
          cash_drops: cashDrops,
          paid_out_expenses: paidOut,
          other_inflows: otherInflows,
          other_outflows: otherOutflows,
          expected_cash: expected,
          counted_cash: countedCash,
          variance,
          closing_note: input.closingNote ?? null,
          status: "draft",
          prepared_by: actorUserId,
          posting_status: "pending",
          idempotency_key: input.idempotencyKey ?? null,
        })
        .select(CASH_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "CASH_RECON_EXISTS",
            "An active cash reconciliation already exists for this branch and business date.",
          );
        }
        throwMappedDbError("CASH_RECONCILIATION_CREATE_FAILED", error);
      }

      const record = mapCash(data as CashRow);
      await writeAudit(client, "cash_reconciliation_events", {
        cash_reconciliation_id: record.id,
        branch_id: record.branchId,
        actor_user_id: actorUserId,
        action: "create",
        after_state: record,
      });
      return record;
    },

    async updateCashReconciliationDraft(scope, actorUserId, id, input) {
      const client = supabase();
      const { data: row, error } = await client
        .from("cash_reconciliations")
        .select(CASH_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throwMappedDbError("CASH_RECONCILIATIONS_READ_FAILED", error);
      if (!row) throw new ApiError(404, "CASH_RECON_NOT_FOUND", "Cash reconciliation not found.");
      const before = mapCash(row as CashRow);
      assertBranchMembership(scope, before.branchId);
      if (before.status !== "draft" && before.status !== "rejected") {
        throw new ApiError(409, "CASH_RECON_IMMUTABLE", "Only draft or returned reconciliations can be edited.");
      }

      const { patch } = await refreshTotals(client, row as CashRow, {
        opening_float: input.openingFloat,
        cash_refunds: input.cashRefunds,
        cash_drops: input.cashDrops,
        other_inflows: input.otherInflows,
        other_outflows: input.otherOutflows,
        counted_cash: input.countedCash,
      });
      if (input.closingNote !== undefined) patch.closing_note = input.closingNote;
      if (before.status === "rejected") patch.status = "draft";

      const { data: updated, error: updErr } = await client
        .from("cash_reconciliations")
        .update(patch)
        .eq("id", id)
        .select(CASH_SELECT)
        .single();
      if (updErr) throwMappedDbError("CASH_RECONCILIATION_UPDATE_FAILED", updErr);
      const after = mapCash(updated as CashRow);
      await writeAudit(client, "cash_reconciliation_events", {
        cash_reconciliation_id: id,
        branch_id: after.branchId,
        actor_user_id: actorUserId,
        action: "update",
        before_state: before,
        after_state: after,
      });
      return after;
    },

    async transitionCashReconciliation(scope, actorUserId, id, action, reason) {
      const client = supabase();
      const { data: row, error } = await client
        .from("cash_reconciliations")
        .select(CASH_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throwMappedDbError("CASH_RECONCILIATIONS_READ_FAILED", error);
      if (!row) throw new ApiError(404, "CASH_RECON_NOT_FOUND", "Cash reconciliation not found.");
      let record = mapCash(row as CashRow);
      assertBranchMembership(scope, record.branchId);
      const before = { ...record };

      // Refresh server-side cash sales / paid-outs on submit/approve.
      if (action === "submit" || action === "approve") {
        const cashSales = await loadCashSales(record.branchId, record.businessDate);
        const paidOut = await loadPaidOutCashExpenses(record.branchId, record.businessDate);
        const { patch } = await refreshTotals(client, row as CashRow, {
          cash_sales: cashSales,
          paid_out_expenses: paidOut,
        });
        const { data: refreshed, error: refErr } = await client
          .from("cash_reconciliations")
          .update(patch)
          .eq("id", id)
          .select(CASH_SELECT)
          .single();
        if (refErr) throwMappedDbError("CASH_RECONCILIATION_UPDATE_FAILED", refErr);
        record = mapCash(refreshed as CashRow);
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (action === "submit") {
        if (record.status !== "draft" && record.status !== "rejected") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only draft or returned reconciliations can be submitted.");
        }
        if (record.countedCash === null) {
          throw new ApiError(400, "VALIDATION_ERROR", "Counted cash is required before submit.");
        }
        patch.status = "submitted";
      } else if (action === "approve") {
        if (record.status !== "submitted") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only submitted reconciliations can be approved.");
        }
        patch.status = "approved";
        patch.reviewed_by = actorUserId;
      } else if (action === "reject") {
        if (record.status !== "submitted") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only submitted reconciliations can be rejected.");
        }
        if (!reason?.trim()) {
          throw new ApiError(400, "VALIDATION_ERROR", "A rejection reason is required.");
        }
        patch.status = "rejected";
        patch.rejection_reason = reason.trim();
        patch.reviewed_by = actorUserId;
      } else if (action === "void") {
        if (!["draft", "submitted", "rejected", "approved"].includes(record.status)) {
          throw new ApiError(409, "INVALID_TRANSITION", "This reconciliation cannot be voided.");
        }
        if (!reason?.trim()) {
          throw new ApiError(400, "VALIDATION_ERROR", "A void reason is required.");
        }
        patch.status = "voided";
        patch.rejection_reason = reason.trim();
      } else if (action === "post") {
        if (record.status !== "approved" && record.status !== "posted") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only approved reconciliations can be posted.");
        }
        const postResult = await tryPostCashVarianceJournal(scope, actorUserId, record);
        patch.posting_status = postResult.postingStatus;
        patch.posting_blocked_reason = postResult.blockedReason;
        patch.journal_entry_id = postResult.journalId;
        if (postResult.postingStatus === "posted" || postResult.postingStatus === "not_applicable") {
          patch.status = "posted";
        } else if (postResult.postingStatus === "blocked") {
          // Operational approval retained; posting blocked honestly.
          patch.status = "approved";
        }
      } else {
        throw new ApiError(400, "VALIDATION_ERROR", "Unknown cash reconciliation action.");
      }

      const { data: updated, error: updErr } = await client
        .from("cash_reconciliations")
        .update(patch)
        .eq("id", id)
        .select(CASH_SELECT)
        .single();
      if (updErr) throwMappedDbError("CASH_RECONCILIATION_UPDATE_FAILED", updErr);
      const after = mapCash(updated as CashRow);
      await writeAudit(client, "cash_reconciliation_events", {
        cash_reconciliation_id: id,
        branch_id: after.branchId,
        actor_user_id: actorUserId,
        action,
        reason: reason ?? null,
        before_state: before,
        after_state: after,
      });
      return after;
    },

    async listExpenseClaims(scope, branchId) {
      const client = supabase();
      let query = client
        .from("expense_claims")
        .select(EXPENSE_SELECT)
        .order("expense_date", { ascending: false })
        .limit(200);
      if (branchId) {
        assertBranchMembership(scope, branchId);
        query = query.eq("branch_id", branchId);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.in("branch_id", scope.branchIds);
      }
      const { data, error } = await query;
      if (error) throwMappedDbError("EXPENSE_CLAIMS_READ_FAILED", error);
      return ((data ?? []) as ExpenseRow[]).map(mapExpense);
    },

    async createExpenseClaim(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      if (input.amount <= 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "Expense amount must be greater than zero.");
      }
      if (input.idempotencyKey) {
        const client = supabase();
        const { data: existing } = await client
          .from("expense_claims")
          .select(EXPENSE_SELECT)
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (existing) return mapExpense(existing as ExpenseRow);
      }

      const client = supabase();
      const { data, error } = await client
        .from("expense_claims")
        .insert({
          expense_number: generateExpenseNumber(),
          branch_id: input.branchId,
          category: input.category.trim(),
          expense_date: input.expenseDate || karachiBusinessDate(),
          amount: money(input.amount),
          currency: (input.currency ?? "PKR").toUpperCase(),
          payment_method: input.paymentMethod ?? "cash",
          payee: input.payee ?? null,
          description: input.description.trim(),
          receipt_ref: input.receiptRef ?? null,
          status: "draft",
          submitted_by: actorUserId,
          source_context: input.sourceContext ?? null,
          posting_status: "pending",
          idempotency_key: input.idempotencyKey ?? null,
        })
        .select(EXPENSE_SELECT)
        .single();
      if (error) throwMappedDbError("EXPENSE_CLAIM_CREATE_FAILED", error);
      const record = mapExpense(data as ExpenseRow);
      await writeAudit(client, "expense_claim_events", {
        expense_claim_id: record.id,
        branch_id: record.branchId,
        actor_user_id: actorUserId,
        action: "create",
        after_state: record,
      });
      return record;
    },

    async updateExpenseClaimDraft(scope, actorUserId, id, input) {
      const client = supabase();
      const { data: row, error } = await client
        .from("expense_claims")
        .select(EXPENSE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throwMappedDbError("EXPENSE_CLAIMS_READ_FAILED", error);
      if (!row) throw new ApiError(404, "EXPENSE_NOT_FOUND", "Expense claim not found.");
      const before = mapExpense(row as ExpenseRow);
      assertBranchMembership(scope, before.branchId);

      // Amount changes after submission return to review (draft) — never silent overwrite while approved.
      if (before.status === "approved" || before.status === "paid") {
        throw new ApiError(409, "EXPENSE_IMMUTABLE", "Approved or paid expenses cannot be edited in place.");
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.category !== undefined) patch.category = input.category.trim();
      if (input.expenseDate !== undefined) patch.expense_date = input.expenseDate;
      if (input.amount !== undefined) {
        if (input.amount <= 0) {
          throw new ApiError(400, "VALIDATION_ERROR", "Expense amount must be greater than zero.");
        }
        patch.amount = money(input.amount);
        if (before.status === "submitted") {
          patch.status = "draft";
        }
      }
      if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod;
      if (input.payee !== undefined) patch.payee = input.payee;
      if (input.description !== undefined) patch.description = input.description.trim();
      if (input.receiptRef !== undefined) patch.receipt_ref = input.receiptRef;
      if (before.status === "rejected") patch.status = "draft";

      if (!["draft", "submitted", "rejected"].includes(before.status)) {
        throw new ApiError(409, "EXPENSE_IMMUTABLE", "This expense cannot be edited.");
      }

      const { data: updated, error: updErr } = await client
        .from("expense_claims")
        .update(patch)
        .eq("id", id)
        .select(EXPENSE_SELECT)
        .single();
      if (updErr) throwMappedDbError("EXPENSE_CLAIM_UPDATE_FAILED", updErr);
      const after = mapExpense(updated as ExpenseRow);
      await writeAudit(client, "expense_claim_events", {
        expense_claim_id: id,
        branch_id: after.branchId,
        actor_user_id: actorUserId,
        action: "update",
        before_state: before,
        after_state: after,
      });
      return after;
    },

    async transitionExpenseClaim(scope, actorUserId, id, action, reason) {
      const client = supabase();
      const { data: row, error } = await client
        .from("expense_claims")
        .select(EXPENSE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throwMappedDbError("EXPENSE_CLAIMS_READ_FAILED", error);
      if (!row) throw new ApiError(404, "EXPENSE_NOT_FOUND", "Expense claim not found.");
      const before = mapExpense(row as ExpenseRow);
      assertBranchMembership(scope, before.branchId);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (action === "submit") {
        if (before.status !== "draft" && before.status !== "rejected") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only draft expenses can be submitted.");
        }
        patch.status = "submitted";
        patch.submitted_by = actorUserId;
      } else if (action === "approve") {
        if (before.status !== "submitted") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only submitted expenses can be approved.");
        }
        // Approver must not silently overwrite amount — amount stays as submitted.
        patch.status = "approved";
        patch.approved_by = actorUserId;
      } else if (action === "reject") {
        if (before.status !== "submitted") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only submitted expenses can be rejected.");
        }
        if (!reason?.trim()) {
          throw new ApiError(400, "VALIDATION_ERROR", "A rejection reason is required.");
        }
        patch.status = "rejected";
        patch.rejection_reason = reason.trim();
        patch.approved_by = actorUserId;
      } else if (action === "pay") {
        if (before.status !== "approved" && before.status !== "paid") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only approved expenses can be marked paid.");
        }
        patch.status = "paid";
      } else if (action === "void") {
        if (["paid", "voided"].includes(before.status) && before.journalEntryId) {
          throw new ApiError(409, "INVALID_TRANSITION", "Posted expenses require journal reversal before void.");
        }
        if (!reason?.trim()) {
          throw new ApiError(400, "VALIDATION_ERROR", "A void reason is required.");
        }
        patch.status = "voided";
        patch.rejection_reason = reason.trim();
      } else if (action === "post") {
        if (before.status !== "approved" && before.status !== "paid") {
          throw new ApiError(409, "INVALID_TRANSITION", "Only approved or paid expenses can be posted.");
        }
        const postResult = await tryPostExpenseJournal(scope, actorUserId, before);
        patch.posting_status = postResult.postingStatus;
        patch.posting_blocked_reason = postResult.blockedReason;
        if (postResult.journalId) patch.journal_entry_id = postResult.journalId;
      } else {
        throw new ApiError(400, "VALIDATION_ERROR", "Unknown expense action.");
      }

      const { data: updated, error: updErr } = await client
        .from("expense_claims")
        .update(patch)
        .eq("id", id)
        .select(EXPENSE_SELECT)
        .single();
      if (updErr) throwMappedDbError("EXPENSE_CLAIM_UPDATE_FAILED", updErr);
      const after = mapExpense(updated as ExpenseRow);
      await writeAudit(client, "expense_claim_events", {
        expense_claim_id: id,
        branch_id: after.branchId,
        actor_user_id: actorUserId,
        action,
        reason: reason ?? null,
        before_state: before,
        after_state: after,
      });
      return after;
    },

    async reverseJournal(scope, actorUserId, journalId, reason) {
      const client = supabase();
      const { data: journal, error } = await client
        .from("journal_entries")
        .select("id, branch_id, status")
        .eq("id", journalId)
        .maybeSingle();
      if (error) throwMappedDbError("JOURNAL_ENTRIES_READ_FAILED", error);
      if (!journal) throw new ApiError(404, "JOURNAL_NOT_FOUND", "Journal entry not found.");
      assertBranchMembership(scope, String(journal.branch_id));

      const { data, error: rpcError } = await client.rpc("reverse_journal_entry_atomic", {
        p_journal_id: journalId,
        p_actor_user_id: actorUserId,
        p_reason: reason,
      });
      if (rpcError) {
        const message = rpcError.message ?? "Journal reverse failed.";
        if (/JOURNAL_NOT_FOUND/i.test(message)) {
          throw new ApiError(404, "JOURNAL_NOT_FOUND", "Journal entry not found.");
        }
        if (/JOURNAL_NOT_POSTED/i.test(message)) {
          throw new ApiError(409, "JOURNAL_NOT_POSTED", "Only posted journals can be reversed.");
        }
        if (/JOURNAL_ALREADY_REVERSED/i.test(message)) {
          throw new ApiError(409, "JOURNAL_ALREADY_REVERSED", "Journal was already reversed.");
        }
        if (/REVERSAL_REASON_REQUIRED/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "A reversal reason is required.");
        }
        throw new ApiError(500, "JOURNAL_REVERSE_FAILED", message);
      }

      const payload = data as {
        originalJournalId: string;
        reversalJournalId: string;
        reversal: JournalEntryRecord;
      };
      return payload;
    },

    async getAttention(scope, branchId) {
      try {
        const client = supabase();
        let branchFilter: string[] | "all";
        if (branchId) {
          assertBranchMembership(scope, branchId);
          branchFilter = [branchId];
        } else if (scope.isSuperAdmin) {
          branchFilter = "all";
        } else if (scope.branchIds.length === 0) {
          return {
            branchId: null,
            state: "available" as const,
            unavailableReason: null,
            cashClosesAwaitingReconciliation: 0,
            cashClosesAwaitingApproval: 0,
            unresolvedCashVariance: 0,
            pendingExpenseApprovals: 0,
            approvedExpensesAwaitingPosting: 0,
            overdueSupplierInvoices: 0,
            invoicesBlockedByMismatch: 0,
            paymentsAwaitingJournalPosting: 0,
            totalApprovedExpensesInPeriod: 0,
          };
        } else {
          branchFilter = scope.branchIds;
        }

        const today = karachiBusinessDate();

        let cashQ = client.from("cash_reconciliations").select("id, status, variance, business_date");
        let expQ = client.from("expense_claims").select("id, status, posting_status, amount, expense_date");
        let invQ = client
          .from("supplier_invoices")
          .select("id, status, matching_status, due_date, invoice_date, exception_approved_at, total_amount");
        let payQ = client.from("supplier_payments").select("id, branch_id");

        if (branchFilter !== "all") {
          cashQ = cashQ.in("branch_id", branchFilter);
          expQ = expQ.in("branch_id", branchFilter);
          invQ = invQ.in("branch_id", branchFilter);
          payQ = payQ.in("branch_id", branchFilter);
        }

        const [cashRes, expRes, invRes, payRes, postingRes] = await Promise.all([
          cashQ,
          expQ,
          invQ,
          payQ,
          branchFilter === "all"
            ? client
                .from("finance_postings")
                .select("source_id")
                .eq("source_module", "supplier_payment")
                .eq("status", "posted")
            : client
                .from("finance_postings")
                .select("source_id")
                .eq("source_module", "supplier_payment")
                .eq("status", "posted")
                .in("branch_id", branchFilter),
        ]);

        if (cashRes.error || expRes.error || invRes.error) {
          return {
            branchId: branchId ?? null,
            state: "unavailable" as const,
            unavailableReason: "Finance attention sources are temporarily unavailable.",
            cashClosesAwaitingReconciliation: 0,
            cashClosesAwaitingApproval: 0,
            unresolvedCashVariance: 0,
            pendingExpenseApprovals: 0,
            approvedExpensesAwaitingPosting: 0,
            overdueSupplierInvoices: 0,
            invoicesBlockedByMismatch: 0,
            paymentsAwaitingJournalPosting: 0,
            totalApprovedExpensesInPeriod: null,
          };
        }

        const cash = cashRes.data ?? [];
        const expenses = expRes.data ?? [];
        const invoices = invRes.data ?? [];
        const payments = payRes.data ?? [];
        const postedPaymentIds = new Set((postingRes.data ?? []).map((p) => String(p.source_id)));

        const draftOrRejected = cash.filter((c) => c.status === "draft" || c.status === "rejected").length;
        const awaitingApproval = cash.filter((c) => c.status === "submitted").length;
        const unresolvedVariance = cash.filter(
          (c) =>
            ["submitted", "approved", "posted"].includes(String(c.status)) &&
            c.variance != null &&
            Math.abs(Number(c.variance)) > 0.001,
        ).length;

        const pendingExpenseApprovals = expenses.filter((e) => e.status === "submitted").length;
        const approvedExpensesAwaitingPosting = expenses.filter(
          (e) =>
            (e.status === "approved" || e.status === "paid") &&
            (e.posting_status === "pending" || e.posting_status === "blocked"),
        ).length;

        const overdueSupplierInvoices = invoices.filter((inv) => {
          if (inv.status === "paid") return false;
          const due = inv.due_date || inv.invoice_date;
          if (!due) return false;
          return String(due) < today;
        }).length;

        const invoicesBlockedByMismatch = invoices.filter(
          (inv) =>
            inv.matching_status === "DISCREPANCY" &&
            inv.exception_approved_at == null &&
            inv.status !== "paid",
        ).length;

        const paymentsAwaitingJournalPosting = payments.filter(
          (p) => !postedPaymentIds.has(String(p.id)),
        ).length;

        const totalApprovedExpensesInPeriod = money(
          expenses
            .filter((e) => e.status === "approved" || e.status === "paid")
            .reduce((s, e) => s + Number(e.amount ?? 0), 0),
        );

        return {
          branchId: branchId ?? null,
          state: "available" as const,
          unavailableReason: null,
          cashClosesAwaitingReconciliation: draftOrRejected,
          cashClosesAwaitingApproval: awaitingApproval,
          unresolvedCashVariance: unresolvedVariance,
          pendingExpenseApprovals,
          approvedExpensesAwaitingPosting,
          overdueSupplierInvoices,
          invoicesBlockedByMismatch,
          paymentsAwaitingJournalPosting,
          totalApprovedExpensesInPeriod,
        };
      } catch (err) {
        if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 401)) throw err;
        return {
          branchId: branchId ?? null,
          state: "unavailable" as const,
          unavailableReason: "Finance attention sources are temporarily unavailable.",
          cashClosesAwaitingReconciliation: 0,
          cashClosesAwaitingApproval: 0,
          unresolvedCashVariance: 0,
          pendingExpenseApprovals: 0,
          approvedExpensesAwaitingPosting: 0,
          overdueSupplierInvoices: 0,
          invoicesBlockedByMismatch: 0,
          paymentsAwaitingJournalPosting: 0,
          totalApprovedExpensesInPeriod: null,
        };
      }
    },
  };
}
