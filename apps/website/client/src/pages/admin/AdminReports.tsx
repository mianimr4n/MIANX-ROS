import { useCallback, useEffect, useMemo, useState } from "react";

import { BranchComparison } from "@/components/admin/reports/BranchComparison";
import { BusinessInsights } from "@/components/admin/reports/BusinessInsights";
import { ExecutiveKPIs } from "@/components/admin/reports/ExecutiveKPIs";
import { ExportPanel } from "@/components/admin/reports/ExportPanel";
import {
  ReportsFoundationPanel,
  ReportsReadinessSections,
} from "@/components/admin/reports/ReportsFoundationPanel";
import {
  CustomerReport,
  DeliveryReport,
  FinanceReport,
  InventoryReport,
  KitchenReport,
  OrdersReport,
  SalesReport,
} from "@/components/admin/reports/ReportSections";
import {
  DEFAULT_EXECUTIVE_FILTERS,
  ReportsFilters,
  type ExecutiveDashboardFilters,
} from "@/components/admin/reports/ReportsFilters";
import { ReportsHeader } from "@/components/admin/reports/ReportsHeader";
import { ReportsStatusBanner } from "@/components/admin/reports/ReportsStatusBanner";
import { TrendAnalysis } from "@/components/admin/reports/TrendAnalysis";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminReports, primaryRoleLabel } from "@/lib/admin-access";
import { fetchAdminOperationsDashboard, type AdminOperationsDashboard } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  buildBusinessInsights,
  buildCustomerReportSnapshot,
  buildPaymentMixSnapshot,
  filteredOrdersForReports,
  integrationChecks,
  readinessGroups,
} from "@/lib/admin-reports";
import { AdminShell } from "./AdminShell";

export default function AdminReports() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();

  const allowed = canAccessAdminReports({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [data, setData] = useState<AdminOperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExecutiveDashboardFilters>(DEFAULT_EXECUTIVE_FILTERS);

  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !allowed) return;
    setLoading(true);
    try {
      const next = await fetchAdminOperationsDashboard(token, { branchId: branchIdFilter });
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load reports data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [allowed, branchIdFilter, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void load();
  }, [gateReady, load]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return filteredOrdersForReports(data.recentOrders, filters);
  }, [data, filters]);

  const customerSnapshot = useMemo(() => buildCustomerReportSnapshot(filteredOrders), [filteredOrders]);
  const paymentMix = useMemo(() => buildPaymentMixSnapshot(filteredOrders), [filteredOrders]);
  const insights = useMemo(() => buildBusinessInsights(data, branchLabel), [data, branchLabel]);

  return (
    <AdminShell title="Reports & Business Intelligence">
      <ReportsHeader
        branchLabel={branchLabel}
        roleLabel={roleLabel}
        onRefresh={() => void load()}
        generatedAt={data?.generatedAt ?? null}
      />

      <ReportsStatusBanner />

      {error ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
          aria-live="assertive"
        >
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <ReportsFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_EXECUTIVE_FILTERS)}
      />

      <ExecutiveKPIs data={data} customerSnapshot={customerSnapshot} loading={loading} />

      <SalesReport data={data} paymentMix={paymentMix} />

      <OrdersReport data={data} />

      <CustomerReport snapshot={customerSnapshot} />

      <div className="grid gap-4 lg:grid-cols-2">
        <KitchenReport kitchenWaiting={data?.kpis.kitchenWaiting ?? 0} />
        <DeliveryReport activeDeliveries={data?.kpis.activeDeliveries ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InventoryReport />
        <FinanceReport />
      </div>

      <BranchComparison rows={data?.branchPerformance ?? null} />

      <TrendAnalysis />

      <ExportPanel />

      <ReportsFoundationPanel checks={checks} />

      <ReportsReadinessSections groups={groups} />

      <BusinessInsights items={insights} />
    </AdminShell>
  );
}
