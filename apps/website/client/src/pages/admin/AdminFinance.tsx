import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CashPanel,
  ExpensePanel,
  PayablePanel,
  ReceivablePanel,
  TaxPanel,
} from "@/components/admin/finance/FinancePanels";
import { FinanceHeader } from "@/components/admin/finance/FinanceHeader";
import { FinanceInsights } from "@/components/admin/finance/FinanceInsights";
import { FinanceKPIs } from "@/components/admin/finance/FinanceKPIs";
import { FinanceStatusBanner } from "@/components/admin/finance/FinanceStatusBanner";
import { LedgerPanel, StatementsPanel } from "@/components/admin/finance/LedgerPanel";
import { SalesOverview } from "@/components/admin/finance/SalesOverview";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import {
  canAccessAdminFinance,
  canAccessAdminOrdersApi,
  primaryRoleLabel,
} from "@/lib/admin-access";
import {
  fetchAdminOperationsDashboard,
  fetchProfitLoss,
  fetchTrialBalance,
  listCashReconciliations,
  listExpenseClaims,
  listFinanceAccounts,
  listFinanceJournalEntries,
  listSupplierInvoices,
  type AdminOperationsDashboard,
  type CashReconciliation,
  type ExpenseClaim,
  type FinanceAccount,
  type FinanceJournalEntry,
  type ProfitLossReport,
  type SupplierInvoice,
  type TrialBalanceReport,
} from "@/lib/admin-api";
import {
  buildFinanceInsights,
  buildFinanceKpiSnapshot,
  buildOperationalSalesSnapshot,
} from "@/lib/admin-finance";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

export default function AdminFinance() {
  const { permissions, isSuperAdmin, roles, session } = useAuth();
  const { label: branchLabel, branchIdFilter } = useAdminBranch();

  const allowed = canAccessAdminFinance({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const ordersApiAvailable = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);
  const canManage =
    isSuperAdmin ||
    permissions.includes("finance.manage") ||
    permissions.includes("admin.access");

  const [dashboard, setDashboard] = useState<AdminOperationsDashboard | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [accounts, setAccounts] = useState<FinanceAccount[] | null>(null);
  const [entries, setEntries] = useState<FinanceJournalEntry[] | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [glLoading, setGlLoading] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);
  const [stmtError, setStmtError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SupplierInvoice[] | null>(null);
  const [apLoading, setApLoading] = useState(false);
  const [apError, setApError] = useState<string | null>(null);
  const [cashRecons, setCashRecons] = useState<CashReconciliation[] | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseClaim[] | null>(null);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const snapshot = useMemo(() => buildFinanceKpiSnapshot(), []);
  const outstandingPayables = useMemo(() => {
    if (invoices == null) return null;
    return invoices
      .filter((i) => i.status === "pending" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.totalAmount, 0);
  }, [invoices]);
  const insights = useMemo(
    () => buildFinanceInsights(branchLabel, profitLoss),
    [branchLabel, profitLoss],
  );
  const salesSnapshot = useMemo(
    () => buildOperationalSalesSnapshot(dashboard, ordersApiAvailable),
    [dashboard, ordersApiAvailable],
  );

  const loadOperationalSales = useCallback(async () => {
    if (!ordersApiAvailable || !session?.access_token) {
      setDashboard(null);
      return;
    }
    setSalesLoading(true);
    try {
      const data = await fetchAdminOperationsDashboard(session.access_token, {
        branchId: branchIdFilter,
      });
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setSalesLoading(false);
    }
  }, [session?.access_token, ordersApiAvailable, branchIdFilter]);

  const loadFinance = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setAccounts(null);
      setEntries(null);
      setTrialBalance(null);
      setProfitLoss(null);
      setInvoices(null);
      setCashRecons(null);
      setExpenses(null);
      setGlError("Sign in required.");
      return;
    }
    if (!branchIdFilter) {
      setAccounts([]);
      setEntries([]);
      setTrialBalance(null);
      setProfitLoss(null);
      setInvoices([]);
      setCashRecons([]);
      setExpenses([]);
      setGlError(null);
      setStmtError(null);
      setApError(null);
      setCashError(null);
      setExpenseError(null);
      return;
    }

    setGlLoading(true);
    setGlError(null);
    setStmtError(null);
    try {
      const [acct, je] = await Promise.all([
        listFinanceAccounts(token, { branchId: branchIdFilter }),
        listFinanceJournalEntries(token, { branchId: branchIdFilter }),
      ]);
      setAccounts(acct);
      setEntries(je);
    } catch (err) {
      setAccounts(null);
      setEntries(null);
      setGlError(err instanceof ApiRequestError ? err.message : "Failed to load general ledger.");
    }

    try {
      const [tb, pl] = await Promise.all([
        fetchTrialBalance(token, { branchId: branchIdFilter }),
        fetchProfitLoss(token, { branchId: branchIdFilter }),
      ]);
      setTrialBalance(tb);
      setProfitLoss(pl);
    } catch (err) {
      setTrialBalance(null);
      setProfitLoss(null);
      setStmtError(err instanceof ApiRequestError ? err.message : "Failed to load financial statements.");
    } finally {
      setGlLoading(false);
    }

    setApLoading(true);
    setApError(null);
    try {
      setInvoices(await listSupplierInvoices(token, { branchId: branchIdFilter }));
    } catch (err) {
      setInvoices(null);
      setApError(err instanceof ApiRequestError ? err.message : "Failed to load supplier invoices.");
    } finally {
      setApLoading(false);
    }

    setCashLoading(true);
    setCashError(null);
    try {
      setCashRecons(await listCashReconciliations(token, { branchId: branchIdFilter }));
    } catch (err) {
      setCashRecons(null);
      setCashError(err instanceof ApiRequestError ? err.message : "Failed to load cash closes.");
    } finally {
      setCashLoading(false);
    }

    setExpenseLoading(true);
    setExpenseError(null);
    try {
      setExpenses(await listExpenseClaims(token, { branchId: branchIdFilter }));
    } catch (err) {
      setExpenses(null);
      setExpenseError(err instanceof ApiRequestError ? err.message : "Failed to load expenses.");
    } finally {
      setExpenseLoading(false);
    }
  }, [branchIdFilter, session?.access_token]);

  useEffect(() => {
    if (!gateReady || !allowed) return;
    void loadOperationalSales();
    void loadFinance();
  }, [allowed, gateReady, loadFinance, loadOperationalSales]);

  const onRefresh = () => {
    void loadOperationalSales();
    void loadFinance();
  };

  if (!allowed) {
    return (
      <AdminShell title="Finance & Accounting">
        <p className="text-sm text-[var(--admin-muted)]">You do not have access to finance.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Finance & Accounting">
      <FinanceHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <FinanceStatusBanner />

      <FinanceKPIs profitLoss={profitLoss} outstandingPayables={outstandingPayables} />

      <SalesOverview snapshot={salesSnapshot} ordersApiAvailable={ordersApiAvailable} loading={salesLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CashPanel
          items={cashRecons}
          loading={cashLoading}
          error={cashError}
          accessToken={session?.access_token}
          branchId={branchIdFilter}
          canManage={canManage}
          onRefresh={onRefresh}
        />
        <ReceivablePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PayablePanel invoices={invoices} loading={apLoading} error={apError} />
        <ExpensePanel
          items={expenses}
          loading={expenseLoading}
          error={expenseError}
          accessToken={session?.access_token}
          branchId={branchIdFilter}
          canManage={canManage}
          onRefresh={onRefresh}
        />
      </div>

      <TaxPanel />

      <LedgerPanel
        accessToken={session?.access_token}
        branchId={branchIdFilter}
        canManage={canManage}
        accounts={accounts}
        entries={entries}
        loading={glLoading}
        error={glError}
        onRefresh={onRefresh}
      />

      <StatementsPanel
        trialBalance={trialBalance}
        profitLoss={profitLoss}
        loading={glLoading}
        error={stmtError}
        hasBranch={Boolean(branchIdFilter)}
      />

      <FinanceInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Orders linked: {snapshot.ordersApiLinked ? "yes" : "no"} · Purchasing:{" "}
        {snapshot.purchasingFoundationLinked ? "yes" : "no"} · Inventory:{" "}
        {snapshot.inventoryFoundationLinked ? "yes" : "no"} · Customer payments:{" "}
        {snapshot.customerPaymentsPartial ? "partial" : "no"}
      </p>
    </AdminShell>
  );
}
