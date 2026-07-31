import { useCallback, useEffect, useMemo, useState } from "react";

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
  createInventoryItem,
  createStockAdjustment,
  listInventoryItems,
  listStockMovements,
  type InventoryItem,
  type StockMovement,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  buildInventoryInsights,
  buildInventoryKpis,
  isLowStock,
} from "@/lib/admin-inventory";
import { AdminShell } from "./AdminShell";

export default function AdminInventory() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel, branchIdFilter } = useAdminBranch();
  const { items, toppings, isLoading, reloadCatalog } = useMenuCatalog();

  const allowed = canAccessAdminInventory({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);
  const canManageInventory =
    isSuperAdmin ||
    permissions.includes("inventory.manage") ||
    permissions.includes("admin.access");

  const [stockItems, setStockItems] = useState<InventoryItem[] | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const snapshot = useMemo(
    () => buildInventoryKpis(items, toppings, stockItems, movements),
    [items, toppings, stockItems, movements],
  );
  const insights = useMemo(() => buildInventoryInsights(snapshot, branchLabel), [snapshot, branchLabel]);
  const filteredStockItems = useMemo(() => {
    if (!stockItems) return null;
    const q = search.trim().toLowerCase();
    return stockItems.filter((item) => {
      if (lowStockOnly && !isLowStock(item)) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    });
  }, [lowStockOnly, search, stockItems]);

  const loadStock = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManageInventory) {
      setStockItems(null);
      setStockError(
        canManageInventory ? null : "Access unavailable",
      );
      return;
    }
    setStockLoading(true);
    try {
      const rows = await listInventoryItems(
        token,
        branchIdFilter ? { branchId: branchIdFilter } : undefined,
      );
      setStockItems(rows);
      setStockError(null);
    } catch (err) {
      setStockItems(null);
      setStockError(err instanceof ApiRequestError ? err.message : "Failed to load stock items");
    } finally {
      setStockLoading(false);
    }
  }, [branchIdFilter, canManageInventory, session?.access_token]);

  const loadMovements = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManageInventory) {
      setMovements(null);
      setMovementsError(null);
      return;
    }
    setMovementsLoading(true);
    try {
      const rows = await listStockMovements(token, {
        ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
        limit: 50,
      });
      setMovements(rows);
      setMovementsError(null);
    } catch (err) {
      setMovements(null);
      setMovementsError(err instanceof ApiRequestError ? err.message : "Failed to load movements");
    } finally {
      setMovementsLoading(false);
    }
  }, [branchIdFilter, canManageInventory, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void loadStock();
    void loadMovements();
  }, [gateReady, loadMovements, loadStock]);

  const onRefresh = () => {
    void reloadCatalog();
    void loadStock();
    void loadMovements();
  };

  const onAddItem = async (input: {
    branchId: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
    costPrice: number | null;
  }) => {
    const token = session?.access_token;
    if (!token) {
      setAddError("Sign in required.");
      return false;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      await createInventoryItem(token, input);
      await Promise.all([loadStock(), loadMovements()]);
      return true;
    } catch (err) {
      setAddError(err instanceof ApiRequestError ? err.message : "Failed to create stock item");
      return false;
    } finally {
      setAddBusy(false);
    }
  };

  const onAdjust = async (input: {
    inventoryItemId: string;
    quantityDelta: number;
    reason: string;
    movementType: "adjustment" | "receipt" | "waste";
  }) => {
    const token = session?.access_token;
    if (!token) {
      setAdjustError("Sign in required.");
      return false;
    }
    setAdjustBusy(true);
    setAdjustError(null);
    try {
      await createStockAdjustment(token, {
        inventoryItemId: input.inventoryItemId,
        quantityDelta: input.quantityDelta,
        reason: input.reason || null,
        movementType: input.movementType,
      });
      await Promise.all([loadStock(), loadMovements()]);
      return true;
    } catch (err) {
      setAdjustError(err instanceof ApiRequestError ? err.message : "Failed to post adjustment");
      return false;
    } finally {
      setAdjustBusy(false);
    }
  };

  return (
    <AdminShell title="Inventory Management">
      <InventoryHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <InventoryStatusBanner />

      <InventoryKPIs snapshot={isLoading ? null : snapshot} loading={isLoading} />

      <InventoryFilters
        search={search}
        onSearchChange={setSearch}
        lowStockOnly={lowStockOnly}
        onLowStockOnlyChange={setLowStockOnly}
      />

      <InventoryTable
        items={filteredStockItems}
        loading={stockLoading}
        error={stockError}
        canManage={canManageInventory}
        defaultBranchId={branchIdFilter}
        onAddItem={onAddItem}
        addError={addError}
        addBusy={addBusy}
      />

      <StockMovementTimeline movements={movements} loading={movementsLoading} error={movementsError} />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <LowStockPanel items={stockItems} />
        <RecipeMappingPanel
          snapshot={isLoading ? null : snapshot}
          accessToken={session?.access_token}
          branchId={branchIdFilter}
          canManage={canManageInventory}
          menuItems={items}
          stockItems={stockItems}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ReceivingPanel />
        <StockAdjustmentPanel
          items={stockItems}
          canManage={canManageInventory}
          onAdjust={onAdjust}
          adjustError={adjustError}
          adjustBusy={adjustBusy}
        />
        <StockTransferPanel />
        <WastePanel
          items={stockItems}
          canManage={canManageInventory}
          onAdjust={onAdjust}
          adjustError={adjustError}
          adjustBusy={adjustBusy}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <InventoryValuationPanel stockValue={snapshot.stockValue} />
        <ReorderPlanningPanel />
      </div>

      <InventoryInsights items={insights} />
    </AdminShell>
  );
}
