import type { MenuCatalogItemView } from "@/lib/admin-menu";

const AVAILABILITY_ROWS = [
  { key: "available", label: "Available in catalog", live: true },
  { key: "unavailable", label: "Unavailable (filtered by API)", live: false },
  { key: "hidden", label: "Hidden / inactive rows", live: false },
  { key: "schedule", label: "Time-based schedule", live: false },
  { key: "branch", label: "Branch availability matrix", live: false },
] as const;

export function AvailabilityPanel({ product }: { product: MenuCatalogItemView }) {
  return (
    <section aria-labelledby="availability-panel-heading">
      <h3 id="availability-panel-heading" className="text-sm font-semibold">
        Availability
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {AVAILABILITY_ROWS.map((row) => {
          const showLive = row.key === "available";
          const availableNow = product.available !== false;
          return (
            <li
              key={row.key}
              className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2"
            >
              <span>{row.label}</span>
              {showLive ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    availableNow ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                  }`}
                >
                  {availableNow ? "Live — visible" : "Unavailable"}
                </span>
              ) : (
                <span className="rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {row.live ? "Live" : "Foundation"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        Availability for {product.name} is edited in the Pricing panel and applies globally to every
        branch. Time-based and per-branch schedules remain foundation-only.
      </p>
    </section>
  );
}
