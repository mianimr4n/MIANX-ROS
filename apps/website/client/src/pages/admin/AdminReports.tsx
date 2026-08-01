import { useState } from "react";

import { BusinessInsights } from "@/components/admin/reports/BusinessInsights";
import { ExportPanel } from "@/components/admin/reports/ExportPanel";
import { OwnerBiWorkspacePanel } from "@/components/admin/reports/OwnerBiWorkspacePanel";
import {
  DEFAULT_EXECUTIVE_FILTERS,
  ReportsFilters,
  type ExecutiveDashboardFilters,
  type ReportsDateRange,
} from "@/components/admin/reports/ReportsFilters";
import { ReportsHeader } from "@/components/admin/reports/ReportsHeader";
import { ReportsStatusBanner } from "@/components/admin/reports/ReportsStatusBanner";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminReports, primaryRoleLabel } from "@/lib/admin-access";
import {
  downloadAnalyticsExport,
  downloadOrdersReportCsv,
  downloadSalesReportCsv,
  fetchAnalyticsWorkspace,
  type OwnerBiWorkspace,
} from "@/lib/admin-api";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { buildWorkspaceInsights, defaultReportsDateRange } from "@/lib/admin-reports";
import { useOperationalData } from "@/lib/op-status";
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
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const token = session?.access_token;
  const canExport = Boolean(token && isApiConfigured && allowed);

  const workspaceOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAnalyticsWorkspace(
        token!,
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          branchId: branchIdFilter,
        },
        { signal, correlationId },
      ),
    [token, branchIdFilter, dateRange.startDate, dateRange.endDate],
    { enabled: Boolean(token) && allowed && gateReady && isApiConfigured },
  );
  const workspace: OwnerBiWorkspace | null = workspaceOp.data;
  const loading = workspaceOp.state === "LOADING";
  const insights = buildWorkspaceInsights(workspace, branchLabel);

  const periodQuery = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    branchId: branchIdFilter,
  };

  const runExport = async (fn: () => Promise<void>) => {
    if (!token) return;
    setExportBusy(true);
    setExportError(null);
    try {
      await fn();
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
        onRefresh={workspaceOp.retry}
        generatedAt={workspace?.generatedAt ?? null}
      />

      <ReportsStatusBanner />

      <OperationalStatusBanner
        state={workspaceOp.state}
        error={workspaceOp.error}
        lastSuccessAt={workspaceOp.lastSuccessAt}
        onRetry={workspaceOp.retry}
        correlationId={workspaceOp.correlationId}
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

      <OwnerBiWorkspacePanel workspace={workspace} loading={loading} />

      <ExportPanel
        canExport={canExport}
        busy={exportBusy}
        error={exportError}
        onExportSales={() =>
          void runExport(() => downloadSalesReportCsv(token!, periodQuery))
        }
        onExportOrders={() =>
          void runExport(() =>
            downloadOrdersReportCsv(token!, {
              ...periodQuery,
              status: filters.status || undefined,
            }),
          )
        }
        onExportAnalyticsCsv={() =>
          void runExport(() => downloadAnalyticsExport(token!, "csv", periodQuery))
        }
        onExportAnalyticsExcel={() =>
          void runExport(() => downloadAnalyticsExport(token!, "excel", periodQuery))
        }
        onExportAnalyticsPdf={() =>
          void runExport(() => downloadAnalyticsExport(token!, "pdf", periodQuery))
        }
      />

      <BusinessInsights items={insights} />
    </AdminShell>
  );
}
