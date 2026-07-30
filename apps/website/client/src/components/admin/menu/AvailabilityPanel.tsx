import type { MenuCatalogItemView } from "@/lib/admin-menu";

const SCHEDULE_ROWS = [
  { key: "schedule", label: "Time-based schedule" },
  { key: "branch", label: "Branch availability matrix" },
] as const;

export function AvailabilityPanel({
  product,
  canWrite,
  saving,
  onToggle,
}: {
  product: MenuCatalogItemView;
  canWrite: boolean;
  saving: boolean;
  onToggle: (isAvailable: boolean) => void;
}) {
  const availableNow = product.available !== false;

  return (
    <section aria-labelledby="availability-panel-heading">
      <h3 id="availability-panel-heading" className="text-sm font-semibold">
        Availability
      </h3>

      <label className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm">
        <span className="font-medium">{availableNow ? "Available to order" : "Unavailable (86'd)"}</span>
        <input
          type="checkbox"
          role="switch"
          checked={availableNow}
          disabled={!canWrite || saving}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-4 w-4 rounded"
        />
      </label>
      {!canWrite ? (
        <p className="mt-2 text-xs text-[var(--admin-muted)]">`menu.write` or `admin.access` required to 86 items.</p>
      ) : null}

      <ul className="mt-3 space-y-2 text-sm">
        {SCHEDULE_ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2"
          >
            <span>{row.label}</span>
            <span className="rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Coming Soon
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        Catalog availability for {product.name} is live and global. Time-based and per-branch schedules remain Coming
        Soon.
      </p>
    </section>
  );
}
