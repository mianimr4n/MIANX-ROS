import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { PurchasingKpiSnapshot } from "@/lib/admin-purchasing";

export function PurchasingKPIs({ snapshot }: { snapshot: PurchasingKpiSnapshot }) {
  const suppliersLoaded = snapshot.supplierCount != null;
  const ordersLoaded = snapshot.openPoCount != null;
  const reqLoaded = snapshot.openRequisitionCount != null;
  const pendingLoaded = snapshot.pendingApprovalCount != null;
  return (
    <section aria-label="Purchasing key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Procurement"
        title="Operational KPIs"
        description="Live supplier, requisition, PO, and pending-approval counts — invoice matching Coming Soon."
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
        <AdminKpiCard title="Awaiting delivery" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — delivery tracking" />
        <AdminKpiCard title="Partially received" value="—" source="UNAVAILABLE" unavailable detail="Derived PO status may update on GRN — report Coming Soon" />
        <AdminKpiCard title="Overdue POs" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — delivery tracking" />
        <AdminKpiCard title="Purchase spend" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — invoice totals" />
        <AdminKpiCard title="Outstanding invoices" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — no supplier AP" />
        <AdminKpiCard title="On-time delivery" value="—" source="UNAVAILABLE" unavailable detail="Coming Soon — receipt analytics" />
      </div>
    </section>
  );
}
