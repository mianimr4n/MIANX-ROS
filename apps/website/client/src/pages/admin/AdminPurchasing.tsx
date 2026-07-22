import { useMemo } from "react";

import {
  ApprovalTimelinePanel,
  InvoiceMatchingPanel,
  ProcurementFoundationPanel,
  ProcurementReadinessSections,
  PurchaseDemandPanel,
  ReceivingGrnPanel,
  SupplierPerformancePanel,
} from "@/components/admin/purchasing/ProcurementPanels";
import { ProcurementInsights } from "@/components/admin/purchasing/ProcurementInsights";
import { ProcurementStatusBanner } from "@/components/admin/purchasing/ProcurementStatusBanner";
import { PurchasingFilters } from "@/components/admin/purchasing/PurchasingFilters";
import { PurchasingHeader } from "@/components/admin/purchasing/PurchasingHeader";
import { PurchasingKPIs } from "@/components/admin/purchasing/PurchasingKPIs";
import {
  PurchaseOrderTable,
  RequisitionPanel,
  SupplierTable,
} from "@/components/admin/purchasing/PurchasingTables";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminPurchasing, primaryRoleLabel } from "@/lib/admin-access";
import {
  buildProcurementInsights,
  buildPurchasingKpis,
  integrationChecks,
  readinessGroups,
} from "@/lib/admin-purchasing";
import { AdminShell } from "./AdminShell";

export default function AdminPurchasing() {
  const { permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel } = useAdminBranch();

  const allowed = canAccessAdminPurchasing({ roles, permissions, isSuperAdmin });
  useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const snapshot = useMemo(() => buildPurchasingKpis(), []);
  const insights = useMemo(() => buildProcurementInsights(branchLabel), [branchLabel]);
  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);

  const onRefresh = () => {
    // Readiness-only refresh — no procurement API to reload.
  };

  return (
    <AdminShell title="Purchasing & Suppliers">
      <PurchasingHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <ProcurementStatusBanner />

      <PurchasingKPIs />

      <PurchasingFilters />

      <PurchaseDemandPanel />

      <RequisitionPanel />

      <PurchaseOrderTable />

      <SupplierTable />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReceivingGrnPanel />
        <ApprovalTimelinePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InvoiceMatchingPanel />
        <SupplierPerformancePanel />
      </div>

      <ProcurementFoundationPanel checks={checks} />

      <ProcurementReadinessSections groups={groups} />

      <ProcurementInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Inventory linked: {snapshot.inventoryFoundationLinked ? "foundation" : "no"} · Stock ledger:{" "}
        {snapshot.stockLedgerAvailable ? "yes" : "no"}
      </p>
    </AdminShell>
  );
}
