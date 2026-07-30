import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { ProfitLossReport } from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-finance";

export function FinanceKPIs({ profitLoss }: { profitLoss: ProfitLossReport | null }) {
  const hasPl = Boolean(profitLoss && (profitLoss.revenue !== 0 || profitLoss.expenses !== 0));

  return (
    <section aria-label="Finance key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Finance"
        title="Financial KPIs"
        description="Accounting revenue and net income come from posted journals only — never from order UI totals."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Revenue (accounting)"
          value={hasPl ? formatPkr(profitLoss!.revenue) : "—"}
          source={hasPl ? "LIVE" : "EMPTY"}
          unavailable={!hasPl}
          detail={hasPl ? "From posted REVENUE journal lines" : "No posted revenue journals yet"}
        />
        <AdminKpiCard title="Cash position" value="—" source="UNAVAILABLE" unavailable detail="Cash & bank Coming Soon" />
        <AdminKpiCard title="Outstanding receivables" value="—" source="UNAVAILABLE" unavailable detail="AR Coming Soon" />
        <AdminKpiCard title="Outstanding payables" value="—" source="UNAVAILABLE" unavailable detail="AP Coming Soon" />
        <AdminKpiCard
          title="Operating expenses"
          value={hasPl ? formatPkr(profitLoss!.expenses) : "—"}
          source={hasPl ? "LIVE" : "EMPTY"}
          unavailable={!hasPl}
          detail={hasPl ? "From posted EXPENSE journal lines" : "No posted expense journals yet"}
        />
        <AdminKpiCard title="Gross profit" value="—" source="UNAVAILABLE" unavailable detail="Requires COGS auto-post Coming Soon" />
        <AdminKpiCard
          title="Net profit"
          value={hasPl ? formatPkr(profitLoss!.netIncome) : "—"}
          source={hasPl ? "LIVE" : "EMPTY"}
          unavailable={!hasPl}
          detail={hasPl ? "Revenue − Expenses from GL" : "Requires posted P&L activity"}
        />
        <AdminKpiCard title="Refunds (accounting)" value="—" source="UNAVAILABLE" unavailable detail="Refund journals Coming Soon" />
        <AdminKpiCard title="Tax liability" value="—" source="UNAVAILABLE" unavailable detail="VAT/GST returns Coming Soon" />
        <AdminKpiCard title="Inventory value" value="—" source="UNAVAILABLE" unavailable detail="Valuation posting Coming Soon" />
      </div>
    </section>
  );
}
