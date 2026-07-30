import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { PurchasingKpiSnapshot } from "@/lib/admin-purchasing";
import { formatMoney } from "@/lib/admin-purchasing";

export function PurchasingKPIs({ snapshot }: { snapshot: PurchasingKpiSnapshot }) {
  const suppliersLoaded = snapshot.supplierCount != null;
  const ordersLoaded = snapshot.openPoCount != null;
  const reqLoaded = snapshot.openRequisitionCount != null;
  const pendingLoaded = snapshot.pendingApprovalCount != null;
  const awaitingLoaded = snapshot.awaitingDeliveryCount != null;
  const partialLoaded = snapshot.partiallyReceivedCount != null;
  const outstandingLoaded = snapshot.outstandingInvoiceCount != null;
  const spendLoaded = snapshot.purchaseSpend != null;

  return (
    <section aria-label="Purchasing key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Procurement"
        title="Operational KPIs"
        description="Live supplier, PO, GRN, invoice, and payment counts — three-way matching Coming Soon."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Active suppliers"
          value={suppliersLoaded ? String(snapshot.supplierCount) : "—"}
          source={suppliersLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!suppliersLoaded}
          detail={suppliersLoaded ? "GET /admin/purchasing/suppliers" : "Requires purchasing.manage"}
        />
        <AdminKpiCard
          title="Open requisitions"
          value={reqLoaded ? String(snapshot.openRequisitionCount) : "—"}
          source={reqLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!reqLoaded}
          detail={reqLoaded ? "GET /admin/purchasing/requisitions" : "Requires purchasing.manage"}
        />
        <AdminKpiCard
          title="Pending approvals"
          value={pendingLoaded ? String(snapshot.pendingApprovalCount) : "—"}
          source={pendingLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!pendingLoaded}
          detail={pendingLoaded ? "draft/submitted POs" : "Requires purchasing.manage"}
        />
        <AdminKpiCard
          title="Open purchase orders"
          value={ordersLoaded ? String(snapshot.openPoCount) : "—"}
          source={ordersLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!ordersLoaded}
          detail={ordersLoaded ? "GET /admin/purchasing/orders" : "Requires purchasing.manage"}
        />
        <AdminKpiCard
          title="Awaiting delivery"
          value={awaitingLoaded ? String(snapshot.awaitingDeliveryCount) : "—"}
          source={awaitingLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!awaitingLoaded}
          detail={
            awaitingLoaded
              ? "Approved/ordered POs with no linked GRN"
              : "Requires purchasing.manage"
          }
        />
        <AdminKpiCard
          title="Partially received"
          value={partialLoaded ? String(snapshot.partiallyReceivedCount) : "—"}
          source={partialLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!partialLoaded}
          detail={partialLoaded ? "POs with status partially_received" : "Requires purchasing.manage"}
        />
        <AdminKpiCard title="Overdue POs" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — delivery date analytics" />
        <AdminKpiCard
          title="Purchase spend"
          value={spendLoaded ? formatMoney(snapshot.purchaseSpend ?? 0) : "—"}
          source={spendLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!spendLoaded}
          detail={spendLoaded ? "Sum of recorded supplier invoices" : "Requires purchasing.manage"}
        />
        <AdminKpiCard
          title="Outstanding invoices"
          value={outstandingLoaded ? String(snapshot.outstandingInvoiceCount) : "—"}
          source={outstandingLoaded ? "LIVE" : "UNAVAILABLE"}
          unavailable={!outstandingLoaded}
          detail={outstandingLoaded ? "pending + partially_paid invoices" : "Requires purchasing.manage"}
        />
        <AdminKpiCard title="On-time delivery" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — receipt analytics" />
      </div>
    </section>
  );
}
