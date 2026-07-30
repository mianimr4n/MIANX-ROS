import { useEffect, useMemo, useState } from "react";

import { BranchComparison } from "@/components/admin/reports/BranchComparison";
import { BusinessInsights } from "@/components/admin/reports/BusinessInsights";
import { ExecutiveKPIs } from "@/components/admin/reports/ExecutiveKPIs";
import { ExportPanel } from "@/components/admin/reports/ExportPanel";
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
  type ReportsDateRange,
} from "@/components/admin/reports/ReportsFilters";
import { ReportsHeader } from "@/components/admin/reports/ReportsHeader";
import { ReportsStatusBanner } from "@/components/admin/reports/ReportsStatusBanner";
import { TrendAnalysis } from "@/components/admin/reports/TrendAnalysis";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminReports, primaryRoleLabel } from "@/lib/admin-access";
import {
  downloadOrdersReportCsv,
  downloadSalesReportCsv,
  fetchAdminOperationsDashboard,
  fetchSalesReport,
  type SalesReport as SalesReportPayload,
} from "@/lib/admin-api";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import {
  buildBusinessInsights,
  buildCustomerReportSnapshot,
  buildPaymentMixSnapshot,
  defaultReportsDateRange,
  filteredOrdersForReports,
} from "@/lib/admin-reports";
import { AdminShell } from "./AdminShell";

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return error instanceof Error ? error.message : "Request failed.";
}

export default function AdminReports() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();

  const allowed = canAccessAdminReports({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [filters, setFilters] = useState<ExecutiveDashboardFilters>(DEFAULT_EXECUTIVE_FILTERS);
  const [dateRange, setDateRange] = useState<ReportsDateRange>(() => defaultReportsDateRange());
  const [salesReport, setSalesReport] = useState<SalesReportPayload | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const token = session?.access_token;
  const canExport = Boolean(token && isApiConfigured && allowed);

  const reportsOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId: branchIdFilter }, { signal, correlationId }),
    [token, branchIdFilter],
    { enabled: Boolean(token) && allowed && gateReady },
  );
  const { data, error, retry } = reportsOp;
  const loading = reportsOp.state === "LOADING";

  useEffect(() => {
    if (!token || !allowed || !gateReady || !isApiConfigured) {
      setSalesReport(null);
      setSalesError(null);
      return;
    }
    let cancelled = false;
    setSalesLoading(true);
    void (async () => {
      try {
        const report = await fetchSalesReport(token, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          branchId: branchIdFilter,
        });
        if (!cancelled) {
          setSalesReport(report);
          setSalesError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSalesReport(null);
          setSalesError(errorMessage(err));
        }
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, branchIdFilter, dateRange.endDate, dateRange.startDate, gateReady, token]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return filteredOrdersForReports(data.recentOrders, filters);
  }, [data, filters]);

  const customerSnapshot = useMemo(() => buildCustomerReportSnapshot(filteredOrders), [filteredOrders]);
  const paymentMix = useMemo(() => buildPaymentMixSnapshot(filteredOrders), [filteredOrders]);
  const insights = useMemo(
    () => buildBusinessInsights(data, branchLabel, salesReport),
    [branchLabel, data, salesReport],
  );

  const onExportSales = async () => {
    if (!token) return;
    setExportBusy(true);
    setExportError(null);
    try {
      await downloadSalesReportCsv(token, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        branchId: branchIdFilter,
      });
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExportBusy(false);
    }
  };

  const onExportOrders = async () => {
    if (!token) return;
    setExportBusy(true);
    setExportError(null);
    try {
      await downloadOrdersReportCsv(token, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        branchId: branchIdFilter,
        status: filters.status || undefined,
      });
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExportBusy(false);
    }
  };

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
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <ExecutiveKPIs
        data={data}
        customerSnapshot={data != null ? customerSnapshot : null}
        loading={loading}
      />

      <SalesReport data={data} paymentMix={paymentMix} />

      <TrendAnalysis report={salesReport} loading={salesLoading} error={salesError} />

      <OrdersReport data={data} />

      <CustomerReport snapshot={customerSnapshot} />

      {data ? (
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

      <ExportPanel
        canExport={canExport}
        busy={exportBusy}
        error={exportError}
        onExportSales={() => void onExportSales()}
        onExportOrders={() => void onExportOrders()}
      />

      <BusinessInsights items={insights} />
    </AdminShell>
  );
}
