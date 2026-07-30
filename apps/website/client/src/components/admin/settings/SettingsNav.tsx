import type { SettingsCategory } from "@/lib/admin-settings";

export function SettingsSearch({
  value,
  onChange,
  resultCount,
}: {
  value: string;
  onChange: (next: string) => void;
  resultCount: number;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-[var(--admin-muted)]" htmlFor="settings-search">
        Settings search
      </label>
      <input
        id="settings-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search categories and settings…"
        className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)] md:max-w-md"
        aria-describedby="settings-search-hint"
      />
      <p id="settings-search-hint" className="mt-1 text-xs text-[var(--admin-muted)]">
        {value.trim() ? `${resultCount} categor${resultCount === 1 ? "y" : "ies"} match` : "Search filters category navigation only — inaccessible domains stay hidden."}
      </p>
    </div>
  );
}

export function SettingsCategoryNav({
  categories,
  activeId,
  onSelect,
}: {
  categories: SettingsCategory[];
  activeId: string;
  onSelect: (id: SettingsCategory["id"]) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-6 text-center text-sm text-[var(--admin-muted)]">
        No settings categories match your search.
      </p>
    );
  }

  const ownerStatus = (classification: SettingsCategory["classification"]) => {
    if (classification === "LIVE") return "Available";
    if (classification === "READ-ONLY") return "Read-only";
    if (classification === "DERIVED") return "Calculated";
    return "Planned for Phase 2";
  };

  return (
    <nav aria-label="Settings categories" className="mb-4 lg:mb-0">
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <li key={category.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(category.id)}
                className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  active
                    ? "bg-[var(--brand-red)] text-white"
                    : "border border-[var(--admin-border)] bg-white text-[var(--admin-ink)] hover:bg-[var(--admin-soft)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="block">{category.label}</span>
                <span className={`mt-0.5 block text-[10px] tracking-wide ${active ? "text-white/80" : "text-[var(--admin-muted)]"}`}>
                  {ownerStatus(category.classification)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
