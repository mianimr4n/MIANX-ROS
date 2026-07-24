import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export function PurchasingKPIs() {
  return (
    <section aria-label="Purchasing key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Procurement"
        title="Operational KPIs"
        description="No supplier or purchase-order data in repository — metrics below are honestly unavailable."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard title="Active suppliers" value="—" source="UNAVAILABLE" unavailable detail="No supplier master" />
        <AdminKpiCard title="Open requisitions" value="—" source="UNAVAILABLE" unavailable detail="No requisition API" />
        <AdminKpiCard title="Pending approvals" value="—" source="UNAVAILABLE" unavailable detail="No approval workflow" />
        <AdminKpiCard title="Open purchase orders" value="—" source="UNAVAILABLE" unavailable detail="No PO backend" />
        <AdminKpiCard title="Awaiting delivery" value="—" source="UNAVAILABLE" unavailable detail="No committed delivery dates" />
        <AdminKpiCard title="Partially received" value="—" source="UNAVAILABLE" unavailable detail="No GRN records" />
        <AdminKpiCard title="Overdue POs" value="—" source="UNAVAILABLE" unavailable detail="No PO dates" />
        <AdminKpiCard title="Purchase spend" value="—" source="UNAVAILABLE" unavailable detail="No PO/invoice totals" />
        <AdminKpiCard title="Outstanding invoices" value="—" source="UNAVAILABLE" unavailable detail="No supplier AP" />
        <AdminKpiCard title="On-time delivery" value="—" source="UNAVAILABLE" unavailable detail="No receipt history" />
      </div>
    </section>
  );
}
