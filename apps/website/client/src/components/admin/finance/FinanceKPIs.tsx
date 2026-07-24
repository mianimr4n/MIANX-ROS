import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export function FinanceKPIs() {
  return (
    <section aria-label="Finance key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Finance"
        title="Financial KPIs"
        description="Accounting metrics require a general ledger — values below are honestly unavailable or foundation-only."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard title="Revenue (accounting)" value="—" source="FOUNDATION" unavailable detail="No revenue recognition or GL" />
        <AdminKpiCard title="Cash position" value="—" source="FOUNDATION" unavailable detail="No cash/bank accounts" />
        <AdminKpiCard title="Outstanding receivables" value="—" source="FOUNDATION" unavailable detail="No AR ledger" />
        <AdminKpiCard title="Outstanding payables" value="—" source="FOUNDATION" unavailable detail="No supplier AP" />
        <AdminKpiCard title="Operating expenses" value="—" source="FOUNDATION" unavailable detail="No expense ledger" />
        <AdminKpiCard title="Gross profit" value="—" source="UNAVAILABLE" unavailable detail="Requires COGS from inventory ledger" />
        <AdminKpiCard title="Net profit" value="—" source="UNAVAILABLE" unavailable detail="Requires posted P&L" />
        <AdminKpiCard title="Refunds (accounting)" value="—" source="FOUNDATION" unavailable detail="No refund journal postings" />
        <AdminKpiCard title="Tax liability" value="—" source="FOUNDATION" unavailable detail="No tax configuration" />
        <AdminKpiCard title="Inventory value" value="—" source="FOUNDATION" unavailable detail="Inventory module is Foundation" />
      </div>
    </section>
  );
}
