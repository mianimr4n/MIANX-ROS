import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { ProcurementInsightItem } from "@/lib/admin-purchasing";

const SOURCE_LABEL: Record<ProcurementInsightItem["source"], string | null> = {
  derived: "Calculated",
  foundation: "Planned for Phase 2",
  live: null,
};

const SOURCE_CLASS: Record<ProcurementInsightItem["source"], string> = {
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  live: "bg-emerald-50 text-emerald-800",
};

export function ProcurementInsights({ items }: { items: ProcurementInsightItem[] }) {
  return (
    <section aria-labelledby="procurement-insights-heading" className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5">
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Procurement brief"
        description="Simple rule-based reminders from suppliers and purchase orders — not autonomous buying."
      />
      <h2 id="procurement-insights-heading" className="sr-only">
        Procurement insights
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              {SOURCE_LABEL[item.source] ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${SOURCE_CLASS[item.source]}`}
                >
                  {SOURCE_LABEL[item.source]}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--admin-muted)]">
        No predictions, no automatic approvals, and no supplier messages from this workspace.
      </p>
    </section>
  );
}
