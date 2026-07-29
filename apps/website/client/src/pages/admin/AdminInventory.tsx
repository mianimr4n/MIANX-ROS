import { useMemo } from "react";

import {
  InventoryFoundationPanel,
  InventoryReadinessSections,
} from "@/components/admin/inventory/InventoryFoundationPanel";
import { InventoryFilters } from "@/components/admin/inventory/InventoryFilters";
import { InventoryHeader } from "@/components/admin/inventory/InventoryHeader";
import { InventoryInsights } from "@/components/admin/inventory/InventoryInsights";
import { InventoryKPIs } from "@/components/admin/inventory/InventoryKPIs";
import { InventoryStatusBanner } from "@/components/admin/inventory/InventoryStatusBanner";
import { InventoryTable } from "@/components/admin/inventory/InventoryTable";
import {
  InventoryValuationPanel,
  LowStockPanel,
  RecipeMappingPanel,
  ReceivingPanel,
  ReorderPlanningPanel,
  StockAdjustmentPanel,
  StockMovementTimeline,
  StockTransferPanel,
  WastePanel,
} from "@/components/admin/inventory/InventoryWorkflowPanels";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { canAccessAdminInventory, primaryRoleLabel } from "@/lib/admin-access";
import {
  buildInventoryInsights,
  buildInventoryKpis,
  integrationChecks,
  readinessGroups,
} from "@/lib/admin-inventory";
import { AdminShell } from "./AdminShell";

export default function AdminInventory() {
  const { permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel } = useAdminBranch();
  const { items, toppings, isLoading, reloadCatalog } = useMenuCatalog();

  const allowed = canAccessAdminInventory({ roles, permissions, isSuperAdmin });
  useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const snapshot = useMemo(() => buildInventoryKpis(items, toppings), [items, toppings]);
  const insights = useMemo(() => buildInventoryInsights(snapshot, branchLabel), [snapshot, branchLabel]);
  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);

  return (
    <AdminShell title="Inventory Management">
      <InventoryHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={() => void reloadCatalog()} />

      <InventoryStatusBanner />

      <InventoryKPIs snapshot={isLoading ? null : snapshot} loading={isLoading} />

      <InventoryFilters />

      <InventoryTable />

      <StockMovementTimeline />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <LowStockPanel />
        <RecipeMappingPanel snapshot={snapshot} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ReceivingPanel />
        <StockAdjustmentPanel />
        <StockTransferPanel />
        <WastePanel />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <InventoryValuationPanel />
        <ReorderPlanningPanel />
      </div>

      <InventoryFoundationPanel checks={checks} />

      <InventoryReadinessSections groups={groups} />

      <InventoryInsights items={insights} />
    </AdminShell>
  );
}
