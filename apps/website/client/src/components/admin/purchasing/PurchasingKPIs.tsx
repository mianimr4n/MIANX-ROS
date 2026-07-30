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
  const overdueLoaded = snapshot.overduePoCount != null;
  const onTimeLoaded = snapshot.onTimeDeliveryPct != null;
  const outstandingLoaded = snapshot.outstandingInvoiceCount != null;
  const spendLoaded = snapshot.purchaseSpend != null;

  return (
    <section aria-label="Purchasing key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Procurement"
        title="Operational KPIs"
        description="Supplier and purchase-order health for the selected branch. Unavailable sources show — — never a fabricated zero."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Active suppliers"
          value={suppliersLoaded ? String(snapshot.supplierCount) : null}
          source={suppliersLoaded ? "LIVE" : "UNAVAILABLE"}
          state={suppliersLoaded ? "available" : "unavailable"}
          detail={suppliersLoaded ? "Updated from current branch operations" : "Access unavailable"}
          showResolvedZero
        />
        <AdminKpiCard
          title="Open requisitions"
          value={reqLoaded ? String(snapshot.openRequisitionCount) : null}
          source={reqLoaded ? "LIVE" : "UNAVAILABLE"}
          state={reqLoaded ? "available" : "unavailable"}
          detail={reqLoaded ? "Draft, submitted, or approved requisitions" : "Access unavailable"}
          showResolvedZero
        />
        <AdminKpiCard
          title="Pending approvals"
          value={pendingLoaded ? String(snapshot.pendingApprovalCount) : null}
          source={pendingLoaded ? "LIVE" : "UNAVAILABLE"}
          state={pendingLoaded ? "available" : "unavailable"}
          detail={pendingLoaded ? "Draft or submitted purchase orders" : "Access unavailable"}
          showResolvedZero
        />
        <AdminKpiCard
          title="Open purchase orders"
          value={ordersLoaded ? String(snapshot.openPoCount) : null}
          source={ordersLoaded ? "LIVE" : "UNAVAILABLE"}
          state={ordersLoaded ? "available" : "unavailable"}
          detail={ordersLoaded ? "Purchase orders still in progress" : "Access unavailable"}
          showResolvedZero
        />
        <AdminKpiCard
          title="Awaiting delivery"
          value={awaitingLoaded ? String(snapshot.awaitingDeliveryCount) : null}
          source={awaitingLoaded ? "LIVE" : "UNAVAILABLE"}
          state={awaitingLoaded ? "available" : "unavailable"}
          detail={
            awaitingLoaded
              ? "Approved orders waiting for goods receiving"
              : "Access unavailable"
          }
          showResolvedZero
        />
        <AdminKpiCard
          title="Partially received"
          value={partialLoaded ? String(snapshot.partiallyReceivedCount) : null}
          source={partialLoaded ? "LIVE" : "UNAVAILABLE"}
          state={partialLoaded ? "available" : "unavailable"}
          detail={partialLoaded ? "Orders with partial goods receiving" : "Access unavailable"}
          showResolvedZero
        />
        <AdminKpiCard
          title="Overdue POs"
          value={overdueLoaded ? String(snapshot.overduePoCount) : null}
          source={overdueLoaded ? "LIVE" : "UNAVAILABLE"}
          state={overdueLoaded ? "available" : "unavailable"}
          detail={
            overdueLoaded
              ? "Open orders past expected delivery date"
              : "Access unavailable"
          }
          showResolvedZero
        />
        <AdminKpiCard
          title="Purchase spend"
          value={spendLoaded ? formatMoney(snapshot.purchaseSpend ?? 0) : null}
          source={spendLoaded ? "LIVE" : "UNAVAILABLE"}
          state={spendLoaded ? "available" : "unavailable"}
          detail={spendLoaded ? "Sum of recorded supplier invoices" : "Access unavailable"}
        />
        <AdminKpiCard
          title="Outstanding invoices"
          value={outstandingLoaded ? String(snapshot.outstandingInvoiceCount) : null}
          source={outstandingLoaded ? "LIVE" : "UNAVAILABLE"}
          state={outstandingLoaded ? "available" : "unavailable"}
          detail={outstandingLoaded ? "Pending or partially paid invoices" : "Access unavailable"}
          showResolvedZero
        />
        <AdminKpiCard
          title="On-time delivery"
          value={onTimeLoaded ? `${snapshot.onTimeDeliveryPct}%` : null}
          source={onTimeLoaded ? "LIVE" : "UNAVAILABLE"}
          state={onTimeLoaded ? "available" : "unavailable"}
          detail={
            onTimeLoaded
              ? "Received orders with goods on or before expected date"
              : "Access unavailable"
          }
        />
      </div>
    </section>
  );
}
