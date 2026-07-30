import { useCallback, useEffect, useMemo, useState } from "react";

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
  createGoodsReceiving,
  createPurchaseOrder,
  createPurchaseRequisition,
  createSupplier,
  decidePurchaseOrderApproval,
  listGoodsReceiving,
  listPurchaseOrders,
  listPurchaseRequisitions,
  listSuppliers,
  type GoodsReceiving,
  type PurchaseOrder,
  type PurchaseRequisition,
  type Supplier,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  buildProcurementInsights,
  buildPurchasingKpis,
  integrationChecks,
  readinessGroups,
} from "@/lib/admin-purchasing";
import { AdminShell } from "./AdminShell";

export default function AdminPurchasing() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel, branchIdFilter } = useAdminBranch();

  const allowed = canAccessAdminPurchasing({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);
  const canManagePurchasing =
    isSuperAdmin ||
    permissions.includes("purchasing.manage") ||
    permissions.includes("admin.access");

  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[] | null>(null);
  const [requisitionsLoading, setRequisitionsLoading] = useState(false);
  const [requisitionsError, setRequisitionsError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<GoodsReceiving[] | null>(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null);
  const [reqCreateError, setReqCreateError] = useState<string | null>(null);
  const [reqCreateBusy, setReqCreateBusy] = useState(false);
  const [grnCreateError, setGrnCreateError] = useState<string | null>(null);
  const [grnCreateBusy, setGrnCreateBusy] = useState(false);
  const [search, setSearch] = useState("");

  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);
  const snapshot = useMemo(
    () => buildPurchasingKpis(suppliers, orders, requisitions),
    [orders, requisitions, suppliers],
  );
  const insights = useMemo(
    () => buildProcurementInsights(branchLabel, suppliers, orders, receipts),
    [branchLabel, orders, receipts, suppliers],
  );
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return null;
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q),
    );
  }, [search, suppliers]);
  const filteredOrders = useMemo(() => {
    if (!orders) return null;
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.poNumber.toLowerCase().includes(q) ||
        (o.supplierName ?? "").toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const loadSuppliers = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManagePurchasing) {
      setSuppliers(null);
      setSuppliersError(
        canManagePurchasing ? null : "Suppliers require purchasing.manage or admin.access.",
      );
      return;
    }
    setSuppliersLoading(true);
    try {
      setSuppliers(await listSuppliers(token, branchIdFilter ? { branchId: branchIdFilter } : undefined));
      setSuppliersError(null);
    } catch (err) {
      setSuppliers(null);
      setSuppliersError(err instanceof ApiRequestError ? err.message : "Failed to load suppliers");
    } finally {
      setSuppliersLoading(false);
    }
  }, [branchIdFilter, canManagePurchasing, session?.access_token]);

  const loadOrders = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManagePurchasing) {
      setOrders(null);
      setOrdersError(
        canManagePurchasing ? null : "Purchase orders require purchasing.manage or admin.access.",
      );
      return;
    }
    setOrdersLoading(true);
    try {
      setOrders(await listPurchaseOrders(token, branchIdFilter ? { branchId: branchIdFilter } : undefined));
      setOrdersError(null);
    } catch (err) {
      setOrders(null);
      setOrdersError(err instanceof ApiRequestError ? err.message : "Failed to load purchase orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [branchIdFilter, canManagePurchasing, session?.access_token]);

  const loadRequisitions = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManagePurchasing) {
      setRequisitions(null);
      setRequisitionsError(null);
      return;
    }
    setRequisitionsLoading(true);
    try {
      setRequisitions(await listPurchaseRequisitions(token, branchIdFilter ? { branchId: branchIdFilter } : undefined));
      setRequisitionsError(null);
    } catch (err) {
      setRequisitions(null);
      setRequisitionsError(err instanceof ApiRequestError ? err.message : "Failed to load requisitions");
    } finally {
      setRequisitionsLoading(false);
    }
  }, [branchIdFilter, canManagePurchasing, session?.access_token]);

  const loadReceipts = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManagePurchasing) {
      setReceipts(null);
      setReceiptsError(null);
      return;
    }
    setReceiptsLoading(true);
    try {
      setReceipts(await listGoodsReceiving(token, branchIdFilter ? { branchId: branchIdFilter } : undefined));
      setReceiptsError(null);
    } catch (err) {
      setReceipts(null);
      setReceiptsError(err instanceof ApiRequestError ? err.message : "Failed to load goods receiving");
    } finally {
      setReceiptsLoading(false);
    }
  }, [branchIdFilter, canManagePurchasing, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void loadSuppliers();
    void loadOrders();
    void loadRequisitions();
    void loadReceipts();
  }, [gateReady, loadOrders, loadReceipts, loadRequisitions, loadSuppliers]);

  const onRefresh = () => {
    void loadSuppliers();
    void loadOrders();
    void loadRequisitions();
    void loadReceipts();
  };

  const onAddSupplier = async (input: {
    branchId: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
  }) => {
    const token = session?.access_token;
    if (!token) {
      setAddError("Sign in required.");
      return false;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      await createSupplier(token, {
        branchId: input.branchId,
        name: input.name,
        contactPerson: input.contactPerson || null,
        phone: input.phone || null,
        email: input.email || null,
      });
      await loadSuppliers();
      return true;
    } catch (err) {
      setAddError(err instanceof ApiRequestError ? err.message : "Failed to add supplier");
      return false;
    } finally {
      setAddBusy(false);
    }
  };

  const onCreateOrder = async (input: {
    branchId: string;
    supplierId: string;
    totalAmount: number;
    expectedDeliveryDate: string;
  }) => {
    const token = session?.access_token;
    if (!token) {
      setCreateError("Sign in required.");
      return false;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      await createPurchaseOrder(token, {
        branchId: input.branchId,
        supplierId: input.supplierId,
        totalAmount: input.totalAmount,
        expectedDeliveryDate: input.expectedDeliveryDate || null,
        status: "submitted",
      });
      await loadOrders();
      return true;
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : "Failed to create purchase order");
      return false;
    } finally {
      setCreateBusy(false);
    }
  };

  const onDecideApproval = async (orderId: string, decision: "approved" | "rejected") => {
    const token = session?.access_token;
    if (!token) {
      setApprovalError("Sign in required.");
      return false;
    }
    setApprovalBusyId(orderId);
    setApprovalError(null);
    try {
      await decidePurchaseOrderApproval(token, orderId, { decision });
      await loadOrders();
      return true;
    } catch (err) {
      setApprovalError(err instanceof ApiRequestError ? err.message : "Failed to update approval");
      return false;
    } finally {
      setApprovalBusyId(null);
    }
  };

  const onCreateRequisition = async (input: { branchId: string; title: string; notes: string }) => {
    const token = session?.access_token;
    if (!token) {
      setReqCreateError("Sign in required.");
      return false;
    }
    setReqCreateBusy(true);
    setReqCreateError(null);
    try {
      await createPurchaseRequisition(token, {
        branchId: input.branchId,
        title: input.title,
        notes: input.notes || null,
        status: "draft",
      });
      await loadRequisitions();
      return true;
    } catch (err) {
      setReqCreateError(err instanceof ApiRequestError ? err.message : "Failed to create requisition");
      return false;
    } finally {
      setReqCreateBusy(false);
    }
  };

  const onCreateGrn = async (input: { branchId: string; purchaseOrderId: string; notes: string }) => {
    const token = session?.access_token;
    if (!token) {
      setGrnCreateError("Sign in required.");
      return false;
    }
    setGrnCreateBusy(true);
    setGrnCreateError(null);
    try {
      await createGoodsReceiving(token, {
        branchId: input.branchId,
        purchaseOrderId: input.purchaseOrderId || null,
        notes: input.notes || null,
        status: "posted",
      });
      await Promise.all([loadReceipts(), loadOrders()]);
      return true;
    } catch (err) {
      setGrnCreateError(err instanceof ApiRequestError ? err.message : "Failed to record GRN");
      return false;
    } finally {
      setGrnCreateBusy(false);
    }
  };

  return (
    <AdminShell title="Purchasing & Suppliers">
      <PurchasingHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <ProcurementStatusBanner />

      <PurchasingKPIs snapshot={snapshot} />

      <PurchasingFilters search={search} onSearchChange={setSearch} />

      <PurchaseDemandPanel />

      <RequisitionPanel
        requisitions={requisitions}
        loading={requisitionsLoading}
        error={requisitionsError}
        canManage={canManagePurchasing}
        defaultBranchId={branchIdFilter}
        onCreate={onCreateRequisition}
        createError={reqCreateError}
        createBusy={reqCreateBusy}
      />

      <PurchaseOrderTable
        orders={filteredOrders}
        suppliers={suppliers}
        loading={ordersLoading}
        error={ordersError}
        canManage={canManagePurchasing}
        defaultBranchId={branchIdFilter}
        onCreateOrder={onCreateOrder}
        createError={createError}
        createBusy={createBusy}
        onDecideApproval={onDecideApproval}
        approvalBusyId={approvalBusyId}
        approvalError={approvalError}
      />

      <SupplierTable
        suppliers={filteredSuppliers}
        loading={suppliersLoading}
        error={suppliersError}
        canManage={canManagePurchasing}
        defaultBranchId={branchIdFilter}
        onAddSupplier={onAddSupplier}
        addError={addError}
        addBusy={addBusy}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReceivingGrnPanel
          receipts={receipts}
          orders={orders}
          loading={receiptsLoading}
          error={receiptsError}
          canManage={canManagePurchasing}
          defaultBranchId={branchIdFilter}
          onCreate={onCreateGrn}
          createError={grnCreateError}
          createBusy={grnCreateBusy}
        />
        <ApprovalTimelinePanel orders={orders} loading={ordersLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InvoiceMatchingPanel />
        <SupplierPerformancePanel />
      </div>

      <ProcurementFoundationPanel checks={checks} />

      <ProcurementReadinessSections groups={groups} />

      <ProcurementInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Inventory linked: {snapshot.inventoryFoundationLinked ? "yes" : "no"} · Stock ledger:{" "}
        {snapshot.stockLedgerAvailable ? "yes" : "no"}
      </p>
    </AdminShell>
  );
}
