import { Link } from "wouter";

import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { ProfitLossReport } from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-finance";

export function FinanceKPIs({
  profitLoss,
  outstandingPayables,
}: {
  profitLoss: ProfitLossReport | null;
  outstandingPayables: number | null;
}) {
  const hasPl = Boolean(profitLoss && (profitLoss.revenue !== 0 || profitLoss.expenses !== 0));
  const hasAp = outstandingPayables != null;

  return (
    <section aria-label="Finance key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Finance"
        title="Financial KPIs"
        description="Accounting revenue and net income come from posted journals only — operational AP from purchasing invoices."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Revenue (accounting)"
          value={hasPl ? formatPkr(profitLoss!.revenue) : "—"}
          source={hasPl ? "LIVE" : "EMPTY"}
          unavailable={!hasPl}
          detail={hasPl ? "From posted REVENUE journal lines" : "No posted revenue journals yet"}
        />
        <AdminKpiCard
          title="Cash position"
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Planned for Phase 2 — cash & bank reconciliation"
        />
        <AdminKpiCard
          title="Outstanding receivables"
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Planned for Phase 2 — AR aging"
        />
        <AdminKpiCard
          title="Outstanding payables"
          value={hasAp ? formatPkr(outstandingPayables ?? 0) : "—"}
          source={hasAp ? "LIVE" : "UNAVAILABLE"}
          unavailable={!hasAp}
          detail={
            hasAp
              ? "Operational AP — sum of pending + partially_paid supplier invoices"
              : "Requires purchasing invoices"
          }
        />
        <AdminKpiCard
          title="Operating expenses"
          value={hasPl ? formatPkr(profitLoss!.expenses) : "—"}
          source={hasPl ? "LIVE" : "EMPTY"}
          unavailable={!hasPl}
          detail={hasPl ? "From posted EXPENSE journal lines" : "No posted expense journals yet"}
        />
        <AdminKpiCard
          title="Gross profit"
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Planned for Phase 2 — requires COGS auto-post"
        />
        <AdminKpiCard
          title="Net profit"
          value={hasPl ? formatPkr(profitLoss!.netIncome) : "—"}
          source={hasPl ? "LIVE" : "EMPTY"}
          unavailable={!hasPl}
          detail={hasPl ? "Revenue − Expenses from GL" : "Requires posted P&L activity"}
        />
        <AdminKpiCard
          title="Refunds (accounting)"
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Planned for Phase 2 — refund journals"
        />
        <AdminKpiCard
          title="Tax liability"
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Planned for Phase 2 — VAT/GST returns"
        />
        <AdminKpiCard
          title="Inventory value"
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="See Inventory for derived cost×qty — GL valuation Planned for Phase 2"
        />
      </div>
      {hasAp ? (
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          Operational payables live in{" "}
          <Link href="/admin/purchasing" className="font-semibold text-[var(--brand-red)] hover:underline">
            Purchasing
          </Link>
          ; they are not yet auto-posted as AP journals in the GL.
        </p>
      ) : null}
    </section>
  );
}
