import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";

import type { AdminNavItem } from "@/lib/admin-access";
import { filterAdminNavByQuery } from "@/lib/admin-nav-registry";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * Role-aware module navigator — authorized route titles/keywords only.
 * Never searches customers, orders, employees, or other business records.
 */
export function AdminModuleNavigator({ items }: { items: AdminNavItem[] }) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => filterAdminNavByQuery(items, query), [items, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='textbox'], [role='combobox']",
        )
      ) {
        return;
      }
      event.preventDefault();
      setOpen((value) => !value);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--admin-ink)] hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        aria-label="Go to module"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="admin-module-navigator-trigger"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 text-[var(--admin-muted)]" aria-hidden />
        <span className="hidden sm:inline">Go to module</span>
        <kbd className="ml-1 hidden rounded border border-[var(--admin-border)] bg-[var(--admin-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--admin-muted)] md:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Go to module"
        description="Jump to an Admin workspace you are authorized to open. This does not search customers, orders, or other business records."
      >
        <CommandInput
          placeholder="Find a workspace…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No authorized modules match.</CommandEmpty>
          <CommandGroup heading="Authorized modules">
            {results.map((item) => (
              <CommandItem
                key={item.key}
                value={`${item.label} ${item.group} ${item.href}`}
                onSelect={() => {
                  setOpen(false);
                  setLocation(item.href);
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{item.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.group}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
