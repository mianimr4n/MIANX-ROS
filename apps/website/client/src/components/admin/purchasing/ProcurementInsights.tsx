import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { ProcurementInsightItem } from "@/lib/admin-purchasing";

const SOURCE_CLASS: Record<ProcurementInsightItem["source"], string> = {
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
};

export function ProcurementInsights({ items }: { items: ProcurementInsightItem[] }) {
  return (
    <section aria-labelledby="procurement-insights-heading" className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5">
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Mianx.ai Procurement Insights"
        description="Rule-based Summary only — no model inference or autonomous PO creation."
      />
      <h2 id="procurement-insights-heading" className="sr-only">
        Procurement insights
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CLASS[item.source]}`}
              >
                {item.source}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--admin-muted)]">
        No prediction models · No autonomous approvals · No supplier communication from this workspace.
      </p>
    </section>
  );
}
