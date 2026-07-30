import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { MenuInsightItem } from "@/lib/admin-menu";

const SOURCE_LABEL: Record<MenuInsightItem["source"], string> = {
  live: "Live",
  derived: "Derived",
  foundation: "Planned for Phase 2",
};

const SOURCE_CLASS: Record<MenuInsightItem["source"], string> = {
  live: "bg-emerald-50 text-emerald-800",
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
};

export function MenuInsights({ items }: { items: MenuInsightItem[] }) {
  return (
    <section aria-labelledby="menu-insights-heading" className="mt-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5">
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Mianx.ai Menu Insights"
        description="Rule-based Summary only — no model inference or autonomous pricing."
      />
      <h2 id="menu-insights-heading" className="sr-only">
        Menu insights
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CLASS[item.source]}`}
              >
                {SOURCE_LABEL[item.source]}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--admin-muted)]">
        No prediction models · No autonomous menu edits · Insights refresh when catalog reloads.
      </p>
    </section>
  );
}
