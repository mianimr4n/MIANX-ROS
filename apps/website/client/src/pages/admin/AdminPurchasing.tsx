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
import {
  PurchasingFilters,
  type PurchasingFilterState,
} from "@/components/admin/purchasing/PurchasingFilters";
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
  listSupplierInvoices,
  listSupplierPayments,
  listSuppliers,
  type GoodsReceiving,
  type PurchaseOrder,
  type PurchaseRequisition,
  type Supplier,
  type SupplierInvoice,
  type SupplierPayment,
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
    permissions.includes("finance.manage") ||
    permissions.includes("admin.access");

  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null);
  const [awaitingDeliveryCount, setAwaitingDeliveryCount] = useState<number | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[] | null>(null);
  const [requisitionsLoading, setRequisitionsLoading] = useState(false);
  const [requisitionsError, setRequisitionsError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<GoodsReceiving[] | null>(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SupplierInvoice[] | null>(null);
  const [payments, setPayments] = useState<SupplierPayment[] | null>(null);
  const [apLoading, setApLoading] = useState(false);
  const [apError, setApError] = useState<string | null>(null);
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
  const [filters, setFilters] = useState<PurchasingFilterState>({
    approvalStatus: "all",
    receivingStatus: "all",
    invoiceStatus: "all",
  });

  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);
  const snapshot = useMemo(
    () => buildPurchasingKpis(suppliers, orders, requisitions, awaitingDeliveryCount, invoices, receipts),
    [awaitingDeliveryCount, invoices, orders, receipts, requisitions, suppliers],
  );
  const insights = useMemo(
    () => buildProcurementInsights(branchLabel, suppliers, orders, receipts, invoices, payments),
    [branchLabel, invoices, orders, payments, receipts, suppliers],
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
    const receiptPoIds = new Set((receipts ?? []).map((r) => r.purchaseOrderId).filter(Boolean));
    return orders.filter((o) => {
      if (filters.approvalStatus === "pending" && o.status !== "draft" && o.status !== "submitted") return false;
      if (filters.approvalStatus === "approved" && o.status !== "approved") return false;
      if (filters.approvalStatus === "rejected" && o.status !== "rejected") return false;

      if (filters.receivingStatus === "awaiting") {
        const awaiting =
          (o.status === "approved" || o.status === "ordered") && !receiptPoIds.has(o.id);
        if (!awaiting) return false;
      }
      if (filters.receivingStatus === "partial" && o.status !== "partially_received") return false;
      if (filters.receivingStatus === "received" && o.status !== "received") return false;

      if (!q) return true;
      return (
        o.poNumber.toLowerCase().includes(q) ||
        (o.supplierName ?? "").toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
      );
    });
  }, [filters.approvalStatus, filters.receivingStatus, orders, receipts, search]);
  const filteredInvoices = useMemo(() => {
    if (!invoices) return null;
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (filters.invoiceStatus === "pending" && i.status !== "pending") return false;
      if (filters.invoiceStatus === "partially_paid" && i.status !== "partially_paid") return false;
      if (filters.invoiceStatus === "paid" && i.status !== "paid") return false;
      if (filters.invoiceStatus === "MATCHED" && i.matchingStatus !== "MATCHED") return false;
      if (filters.invoiceStatus === "DISCREPANCY" && i.matchingStatus !== "DISCREPANCY") return false;
      if (filters.invoiceStatus === "UNMATCHED" && i.matchingStatus !== "UNMATCHED") return false;
      if (!q) return true;
      return (
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.supplierName ?? "").toLowerCase().includes(q) ||
        (i.poNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [filters.invoiceStatus, invoices, search]);

  const loadSuppliers = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManagePurchasing) {
      setSuppliers(null);
      setSuppliersError(
        canManagePurchasing ? null : "Suppliers require purchasing.manage, finance.manage, or admin.access.",
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
      setAwaitingDeliveryCount(null);
      setOrdersError(
        canManagePurchasing ? null : "Purchase orders require purchasing.manage, finance.manage, or admin.access.",
      );
      return;
    }
    setOrdersLoading(true);
    try {
      const result = await listPurchaseOrders(token, branchIdFilter ? { branchId: branchIdFilter } : undefined);
      setOrders(result.orders);
      setAwaitingDeliveryCount(result.awaitingDeliveryCount);
      setOrdersError(null);
    } catch (err) {
      setOrders(null);
      setAwaitingDeliveryCount(null);
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

  const loadAccountsPayable = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManagePurchasing) {
      setInvoices(null);
      setPayments(null);
      setApError(null);
      return;
    }
    setApLoading(true);
    try {
      const query = branchIdFilter ? { branchId: branchIdFilter } : undefined;
      const [nextInvoices, nextPayments] = await Promise.all([
        listSupplierInvoices(token, query),
        listSupplierPayments(token, query),
      ]);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
      setApError(null);
    } catch (err) {
      setInvoices(null);
      setPayments(null);
      setApError(err instanceof ApiRequestError ? err.message : "Failed to load invoices and payments");
    } finally {
      setApLoading(false);
    }
  }, [branchIdFilter, canManagePurchasing, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void loadSuppliers();
    void loadOrders();
    void loadRequisitions();
    void loadReceipts();
    void loadAccountsPayable();
  }, [gateReady, loadAccountsPayable, loadOrders, loadReceipts, loadRequisitions, loadSuppliers]);

  const onRefresh = () => {
    void loadSuppliers();
    void loadOrders();
    void loadRequisitions();
    void loadReceipts();
    void loadAccountsPayable();
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

      <PurchasingFilters
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />

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

      <InvoiceMatchingPanel
        invoices={filteredInvoices}
        payments={payments}
        suppliers={suppliers}
        orders={orders}
        branchId={branchIdFilter}
        accessToken={session?.access_token}
        canManage={canManagePurchasing}
        loading={apLoading}
        error={apError}
        onRefresh={() => void loadAccountsPayable()}
      />

      <SupplierPerformancePanel />

      <ProcurementFoundationPanel checks={checks} />

      <ProcurementReadinessSections groups={groups} />

      <ProcurementInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Inventory linked: {snapshot.inventoryFoundationLinked ? "yes" : "no"} · Stock ledger:{" "}
        {snapshot.stockLedgerAvailable ? "yes" : "no"} · Awaiting delivery:{" "}
        {snapshot.awaitingDeliveryCount ?? "—"}
      </p>
    </AdminShell>
  );
}
