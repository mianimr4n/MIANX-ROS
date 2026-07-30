import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { InventoryInsightItem } from "@/lib/admin-inventory";

const SOURCE_LABEL: Record<InventoryInsightItem["source"], string | null> = {
  derived: "Calculated",
  foundation: "Planned for Phase 2",
  live: null,
};

const SOURCE_CLASS: Record<InventoryInsightItem["source"], string> = {
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  live: "bg-emerald-50 text-emerald-800",
};

export function InventoryInsights({ items }: { items: InventoryInsightItem[] }) {
  return (
    <section aria-labelledby="inventory-insights-heading" className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5">
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Inventory brief"
        description="Simple rule-based reminders from live stock — not predictions or autonomous orders."
      />
      <h2 id="inventory-insights-heading" className="sr-only">
        Inventory insights
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
        Insights refresh when you reload stock. No forecasts and no automatic purchase orders.
      </p>
    </section>
  );
}
