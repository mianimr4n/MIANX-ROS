import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { PosCartLine } from "@/lib/admin-pos";
import type { MenuItem } from "@/lib/telepizza-types";

export type PosInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "foundation";
};

export function buildPosInsights(
  lines: PosCartLine[],
  items: MenuItem[],
  channelNeedsAddress: boolean,
  hasAddress: boolean,
): PosInsightItem[] {
  const insights: PosInsightItem[] = [];
  const qty = lines.reduce((sum, line) => sum + line.quantity, 0);

  if (lines.length === 0) {
    insights.push({
      id: "empty",
      title: "Incomplete order warning.",
      detail: "Cart has no items — place order is blocked until the cart and quote are ready.",
      source: "live",
    });
  }
  if (channelNeedsAddress && !hasAddress) {
    insights.push({
      id: "address",
      title: "Delivery address required.",
      detail: "Rule-based check for delivery/phone channels.",
      source: "live",
    });
  }
  if (qty >= 8) {
    insights.push({
      id: "large",
      title: "Large order detected.",
      detail: `${qty} units in cart — confirm kitchen capacity verbally.`,
      source: "live",
    });
  }

  const pizza = items.find((item) => item.category.toLowerCase().includes("pizza"));
  if (pizza) {
    insights.push({
      id: "frequent",
      title: `Frequently ordered item: ${pizza.name}.`,
      detail: "Rule-based catalog hint — not a purchase-history model.",
      source: "live",
    });
  }

  const sides = items.find(
    (item) =>
      item.category.toLowerCase().includes("side") ||
      item.category.toLowerCase().includes("drink") ||
      item.name.toLowerCase().includes("garlic"),
  );
  if (sides && lines.length > 0 && !lines.some((l) => l.menuItemSlug === sides.slug)) {
    insights.push({
      id: "upsell",
      title: `Upsell recommendation: ${sides.name}.`,
      detail: "Rule-based Summary from category heuristics — not ML.",
      source: "live",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "calm",
      title: "No elevated POS signals.",
      detail: "Mianx.ai surfaces rule-based summaries as the cart grows.",
      source: "foundation",
    });
  }

  return insights.slice(0, 5);
}

export function POSInsights({ items }: { items: PosInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="pos-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai POS Assistant"
        description="Rule-based Summary only. No prediction models."
      />
      <AdminSurfaceBody>
        <h3 id="pos-ai-insights-heading" className="sr-only">
          Mianx.ai POS Assistant
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {item.source === "live" ? "Rule-based Summary" : "Foundation"}
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
