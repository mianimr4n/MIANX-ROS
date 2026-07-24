import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { LoyaltyInsightItem } from "@/lib/admin-loyalty";

export function LoyaltyInsights({ items }: { items: LoyaltyInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="loyalty-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai Loyalty Insights"
        description="Rule-based Summary only. No prediction models."
      />
      <AdminSurfaceBody>
        <h3 id="loyalty-ai-insights-heading" className="sr-only">
          Mianx.ai Loyalty Insights
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {item.source === "derived" ? "Rule-based Summary" : "Foundation"}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">{item.detail}</p>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
