import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import type { BranchActorScope } from "../tables/management.js";

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const JOURNAL_STATUSES = ["draft", "posted", "voided"] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export interface ChartAccountRecord {
  id: string;
  branchId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  isActive: boolean;
  createdAt: string;
}

export interface JournalEntryLineRecord {
  id: string;
  accountId: string;
  accountCode: string | null;
  accountName: string | null;
  accountType: AccountType | null;
  debit: number;
  credit: number;
}

export interface JournalEntryRecord {
  id: string;
  branchId: string;
  entryDate: string;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  status: JournalStatus;
  createdBy: string | null;
  createdAt: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalEntryLineRecord[];
}

export interface CreateAccountInput {
  branchId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  isActive?: boolean;
}

export interface CreateJournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
}

export interface CreateJournalEntryInput {
  branchId: string;
  entryDate?: string | null;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  status?: JournalStatus;
  lines: CreateJournalLineInput[];
}

export interface TrialBalanceReport {
  branchId: string;
  asOf: string;
  rows: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface ProfitLossReport {
  branchId: string;
  fromDate: string;
  toDate: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  revenueAccounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
  }>;
  expenseAccounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
  }>;
}

export interface FinanceService {
  listAccounts(scope: BranchActorScope, branchId?: string): Promise<ChartAccountRecord[]>;
  createAccount(scope: BranchActorScope, input: CreateAccountInput): Promise<ChartAccountRecord>;
  listJournalEntries(scope: BranchActorScope, branchId?: string): Promise<JournalEntryRecord[]>;
  createJournalEntry(
    scope: BranchActorScope,
    actorUserId: string,
    input: CreateJournalEntryInput,
  ): Promise<JournalEntryRecord>;
  trialBalance(
    scope: BranchActorScope,
    branchId: string,
    asOf?: string | null,
  ): Promise<TrialBalanceReport>;
  profitLoss(
    scope: BranchActorScope,
    branchId: string,
    fromDate?: string | null,
    toDate?: string | null,
  ): Promise<ProfitLossReport>;
}

type AccountRow = {
  id: string;
  branch_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  is_active: boolean;
  created_at: string;
};

type JournalRow = {
  id: string;
  branch_id: string;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  lines?: Array<{
    id: string;
    account_id: string;
    debit: number | string;
    credit: number | string;
    chart_of_accounts?: {
      account_code: string;
      account_name: string;
      account_type: string;
    } | null;
  }>;
};

const ACCOUNT_SELECT =
  "id, branch_id, account_code, account_name, account_type, is_active, created_at";

const JOURNAL_SELECT = `
  id, branch_id, entry_date, description, reference_type, reference_id, status, created_by, created_at,
  lines:journal_entry_lines (
    id, account_id, debit, credit,
    chart_of_accounts ( account_code, account_name, account_type )
  )
`;

function mapAccount(row: AccountRow): ChartAccountRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    accountCode: row.account_code,
    accountName: row.account_name,
    accountType: row.account_type as AccountType,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapJournal(row: JournalRow): JournalEntryRecord {
  const lines = (row.lines ?? []).map((line) => ({
    id: line.id,
    accountId: line.account_id,
    accountCode: line.chart_of_accounts?.account_code ?? null,
    accountName: line.chart_of_accounts?.account_name ?? null,
    accountType: (line.chart_of_accounts?.account_type as AccountType | undefined) ?? null,
    debit: Number(line.debit),
    credit: Number(line.credit),
  }));
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  return {
    id: row.id,
    branchId: row.branch_id,
    entryDate: row.entry_date,
    description: row.description,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    status: row.status as JournalStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    totalDebit,
    totalCredit,
    lines,
  };
}

export function createFinanceService(envStatus: EnvironmentStatus): FinanceService {
  const supabase = (): SupabaseClient => {
    if (!envStatus.isReady) {
      throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
    }
    return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  };

  return {
    async listAccounts(scope, branchId) {
      const client = supabase();
      let query = client.from("chart_of_accounts").select(ACCOUNT_SELECT).order("account_code", { ascending: true });
      if (branchId) {
        assertBranchMembership(scope, branchId);
        query = query.eq("branch_id", branchId);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.in("branch_id", scope.branchIds);
      }
      const { data, error } = await query;
      if (error) throwMappedDbError("CHART_OF_ACCOUNTS_READ_FAILED", error);
      return ((data ?? []) as AccountRow[]).map(mapAccount);
    },

    async createAccount(scope, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      const { data, error } = await client
        .from("chart_of_accounts")
        .insert({
          branch_id: input.branchId,
          account_code: input.accountCode.trim().toUpperCase(),
          account_name: input.accountName.trim(),
          account_type: input.accountType,
          is_active: input.isActive ?? true,
        })
        .select(ACCOUNT_SELECT)
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "ACCOUNT_CODE_EXISTS", "Account code already exists for this branch.");
        }
        throwMappedDbError("CHART_OF_ACCOUNTS_CREATE_FAILED", error);
      }
      return mapAccount(data as AccountRow);
    },

    async listJournalEntries(scope, branchId) {
      const client = supabase();
      let query = client
        .from("journal_entries")
        .select(JOURNAL_SELECT)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (branchId) {
        assertBranchMembership(scope, branchId);
        query = query.eq("branch_id", branchId);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.in("branch_id", scope.branchIds);
      }
      const { data, error } = await query;
      if (error) throwMappedDbError("JOURNAL_ENTRIES_READ_FAILED", error);
      return ((data ?? []) as unknown as JournalRow[]).map(mapJournal);
    },

    async createJournalEntry(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const lines = (input.lines ?? []).map((line) => ({
        accountId: line.accountId,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
      }));

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      if (lines.length < 2) {
        throw new ApiError(400, "VALIDATION_ERROR", "Journal entry requires at least two lines.");
      }
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new ApiError(400, "JOURNAL_UNBALANCED", "Sum of debits must equal sum of credits.");
      }

      const client = supabase();
      const { data, error } = await client.rpc("create_journal_entry_atomic", {
        p_branch_id: input.branchId,
        p_entry_date: input.entryDate || null,
        p_description: input.description,
        p_reference_type: input.referenceType ?? null,
        p_reference_id: input.referenceId ?? null,
        p_status: input.status ?? "posted",
        p_actor_user_id: actorUserId,
        p_lines: lines,
      });

      if (error) {
        const message = error.message ?? "Journal create failed.";
        if (/JOURNAL_UNBALANCED/i.test(message)) {
          throw new ApiError(400, "JOURNAL_UNBALANCED", "Sum of debits must equal sum of credits.");
        }
        if (/JOURNAL_LINES_MIN_TWO/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Journal entry requires at least two lines.");
        }
        if (/ACCOUNT_NOT_FOUND/i.test(message)) {
          throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account not found or inactive.");
        }
        if (/ACCOUNT_BRANCH_MISMATCH/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Account must belong to the journal branch.");
        }
        if (/LINE_MUST_BE_DEBIT_OR_CREDIT/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Each line must be either a debit or a credit.");
        }
        throw new ApiError(500, "JOURNAL_CREATE_FAILED", message);
      }

      const payload = data as {
        id: string;
        branchId: string;
        entryDate: string;
        description: string;
        referenceType: string | null;
        referenceId: string | null;
        status: string;
        createdBy: string | null;
        createdAt: string;
        totalDebit: number;
        totalCredit: number;
        lines?: Array<{
          id: string;
          accountId: string;
          accountCode: string;
          accountName: string;
          accountType: string;
          debit: number;
          credit: number;
        }>;
      } | null;

      if (!payload?.id) {
        throw new ApiError(500, "JOURNAL_CREATE_FAILED", "Atomic journal create returned no payload.");
      }

      return {
        id: payload.id,
        branchId: payload.branchId,
        entryDate: payload.entryDate,
        description: payload.description,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
        status: payload.status as JournalStatus,
        createdBy: payload.createdBy,
        createdAt: payload.createdAt,
        totalDebit: Number(payload.totalDebit),
        totalCredit: Number(payload.totalCredit),
        lines: (payload.lines ?? []).map((l) => ({
          id: l.id,
          accountId: l.accountId,
          accountCode: l.accountCode,
          accountName: l.accountName,
          accountType: l.accountType as AccountType,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
      };
    },

    async trialBalance(scope, branchId, asOf) {
      assertBranchMembership(scope, branchId);
      const client = supabase();
      const { data, error } = await client.rpc("finance_trial_balance", {
        p_branch_id: branchId,
        p_as_of: asOf || null,
      });
      if (error) {
        throw new ApiError(500, "TRIAL_BALANCE_FAILED", error.message ?? "Trial balance failed.");
      }
      const payload = data as TrialBalanceReport | null;
      if (!payload) {
        return {
          branchId,
          asOf: asOf || new Date().toISOString().slice(0, 10),
          rows: [],
          totalDebit: 0,
          totalCredit: 0,
          balanced: true,
        };
      }
      return {
        ...payload,
        totalDebit: Number(payload.totalDebit),
        totalCredit: Number(payload.totalCredit),
        rows: (payload.rows ?? []).map((r) => ({
          ...r,
          debit: Number(r.debit),
          credit: Number(r.credit),
        })),
      };
    },

    async profitLoss(scope, branchId, fromDate, toDate) {
      assertBranchMembership(scope, branchId);
      const client = supabase();
      const { data, error } = await client.rpc("finance_profit_loss", {
        p_branch_id: branchId,
        p_from: fromDate || null,
        p_to: toDate || null,
      });
      if (error) {
        throw new ApiError(500, "PROFIT_LOSS_FAILED", error.message ?? "Profit & loss failed.");
      }
      const payload = data as ProfitLossReport | null;
      if (!payload) {
        return {
          branchId,
          fromDate: fromDate || "",
          toDate: toDate || "",
          revenue: 0,
          expenses: 0,
          netIncome: 0,
          revenueAccounts: [],
          expenseAccounts: [],
        };
      }
      return {
        ...payload,
        revenue: Number(payload.revenue),
        expenses: Number(payload.expenses),
        netIncome: Number(payload.netIncome),
        revenueAccounts: (payload.revenueAccounts ?? []).map((r) => ({
          ...r,
          amount: Number(r.amount),
        })),
        expenseAccounts: (payload.expenseAccounts ?? []).map((r) => ({
          ...r,
          amount: Number(r.amount),
        })),
      };
    },
  };
}
