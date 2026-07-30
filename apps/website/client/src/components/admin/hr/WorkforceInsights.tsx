import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { WorkforceInsightItem } from "@/lib/admin-hr";

const SOURCE_CLASS: Record<WorkforceInsightItem["source"], string> = {
  live: "bg-emerald-50 text-emerald-800",
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
};

export function WorkforceInsights({ items }: { items: WorkforceInsightItem[] }) {
  return (
    <section
      aria-labelledby="workforce-insights-heading"
      className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5"
    >
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Mianx.ai Workforce Insights"
        description="Rule-based Summary only — integration gaps and verified invite signals."
      />
      <h2 id="workforce-insights-heading" className="sr-only">
        Workforce insights
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
        Live attendance, leave, and documents · Payroll/performance Planned for Phase 2 · No prediction models from this
        workspace.
      </p>
    </section>
  );
}
