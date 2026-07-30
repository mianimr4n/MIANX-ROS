import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CashPanel,
  ExpensePanel,
  PayablePanel,
  ReceivablePanel,
  TaxPanel,
} from "@/components/admin/finance/FinancePanels";
import {
  FinanceFoundationPanel,
  FinanceReadinessSections,
} from "@/components/admin/finance/FinanceFoundationPanel";
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
  listFinanceAccounts,
  listFinanceJournalEntries,
  type AdminOperationsDashboard,
  type FinanceAccount,
  type FinanceJournalEntry,
  type ProfitLossReport,
  type TrialBalanceReport,
} from "@/lib/admin-api";
import {
  buildFinanceInsights,
  buildFinanceKpiSnapshot,
  buildOperationalSalesSnapshot,
  integrationChecks,
  readinessGroups,
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

  const snapshot = useMemo(() => buildFinanceKpiSnapshot(), []);
  const insights = useMemo(
    () => buildFinanceInsights(branchLabel, profitLoss),
    [branchLabel, profitLoss],
  );
  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);
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
      setGlError("Sign in required.");
      return;
    }
    if (!branchIdFilter) {
      setAccounts([]);
      setEntries([]);
      setTrialBalance(null);
      setProfitLoss(null);
      setGlError(null);
      setStmtError(null);
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

      <FinanceKPIs profitLoss={profitLoss} />

      <SalesOverview snapshot={salesSnapshot} ordersApiAvailable={ordersApiAvailable} loading={salesLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CashPanel />
        <ReceivablePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PayablePanel />
        <ExpensePanel />
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

      <FinanceFoundationPanel checks={checks} />

      <FinanceReadinessSections groups={groups} />

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
