import { useMemo, useState } from "react";

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
import { fetchAdminOperationsDashboard } from "@/lib/admin-api";
import { useOperationalData } from "@/lib/op-status";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
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

  const [filters, setFilters] = useState<ExecutiveDashboardFilters>(DEFAULT_EXECUTIVE_FILTERS);

  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);

  const token = session?.access_token;
  const reportsOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId: branchIdFilter }, { signal, correlationId }),
    [token, branchIdFilter],
    { enabled: Boolean(token) && allowed && gateReady },
  );
  const { data, error, retry } = reportsOp;
  const loading = reportsOp.state === "LOADING";

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
        onRefresh={retry}
        generatedAt={data?.generatedAt ?? null}
      />

      <ReportsStatusBanner />

      <OperationalStatusBanner
        state={reportsOp.state}
        error={error}
        lastSuccessAt={reportsOp.lastSuccessAt}
        onRetry={retry}
        correlationId={reportsOp.correlationId}
        showTechnicalDetail={isSuperAdmin}
        className="mb-6"
      />

      <ReportsFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_EXECUTIVE_FILTERS)}
      />

      <ExecutiveKPIs
        data={data}
        customerSnapshot={data != null ? customerSnapshot : null}
        loading={loading}
      />

      <SalesReport data={data} paymentMix={paymentMix} />

      <OrdersReport data={data} />

      <CustomerReport snapshot={customerSnapshot} />

      {data ? (
        // D2: only render live queue counts from a successful payload — never zeros from a failed load.
        <div className="grid gap-4 lg:grid-cols-2">
          <KitchenReport kitchenWaiting={data.kpis.kitchenWaiting} />
          <DeliveryReport activeDeliveries={data.kpis.activeDeliveries} />
        </div>
      ) : null}

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
