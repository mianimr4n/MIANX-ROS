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
import { fetchAdminOperationsDashboard, type AdminOperationsDashboard } from "@/lib/admin-api";
import {
  buildFinanceInsights,
  buildFinanceKpiSnapshot,
  buildOperationalSalesSnapshot,
  integrationChecks,
  readinessGroups,
} from "@/lib/admin-finance";
import { AdminShell } from "./AdminShell";

export default function AdminFinance() {
  const { permissions, isSuperAdmin, roles, session } = useAuth();
  const { label: branchLabel, branchIdFilter } = useAdminBranch();

  const allowed = canAccessAdminFinance({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const ordersApiAvailable = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [dashboard, setDashboard] = useState<AdminOperationsDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const snapshot = useMemo(() => buildFinanceKpiSnapshot(), []);
  const insights = useMemo(() => buildFinanceInsights(branchLabel), [branchLabel]);
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
    setLoading(true);
    try {
      const data = await fetchAdminOperationsDashboard(session.access_token, {
        branchId: branchIdFilter,
      });
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, ordersApiAvailable, branchIdFilter]);

  useEffect(() => {
    if (!gateReady) return;
    void loadOperationalSales();
  }, [gateReady, loadOperationalSales]);

  const onRefresh = () => {
    void loadOperationalSales();
  };

  return (
    <AdminShell title="Finance & Accounting">
      <FinanceHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <FinanceStatusBanner />

      <FinanceKPIs />

      <SalesOverview snapshot={salesSnapshot} ordersApiAvailable={ordersApiAvailable} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CashPanel />
        <ReceivablePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PayablePanel />
        <ExpensePanel />
      </div>

      <TaxPanel />

      <LedgerPanel />

      <StatementsPanel />

      <FinanceFoundationPanel checks={checks} />

      <FinanceReadinessSections groups={groups} />

      <FinanceInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Orders linked: {snapshot.ordersApiLinked ? "yes" : "no"} · Purchasing:{" "}
        {snapshot.purchasingFoundationLinked ? "foundation" : "no"} · Inventory:{" "}
        {snapshot.inventoryFoundationLinked ? "foundation" : "no"} · Customer payments:{" "}
        {snapshot.customerPaymentsPartial ? "partial" : "no"}
      </p>
    </AdminShell>
  );
}
