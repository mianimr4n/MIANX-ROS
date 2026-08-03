import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown } from "lucide-react";

import type { AdminNavItem } from "@/lib/admin-access";
import {
  groupAdminNavItems,
  isAdminNavItemActive,
  type AdminNavGroup,
} from "@/lib/admin-nav-registry";

const GROUP_STORAGE_KEY = "telepizza.admin.nav.groups.v1";

function readGroupPrefs(): Partial<Record<AdminNavGroup, boolean>> {
  try {
    const raw = localStorage.getItem(GROUP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<Record<AdminNavGroup, boolean>>;
  } catch {
    return {};
  }
}

function writeGroupPrefs(prefs: Partial<Record<AdminNavGroup, boolean>>) {
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function AdminSidebarNav({ items }: { items: AdminNavItem[] }) {
  const [location] = useLocation();
  const grouped = useMemo(() => groupAdminNavItems(items), [items]);
  const [prefs, setPrefs] = useState<Partial<Record<AdminNavGroup, boolean>>>(() =>
    typeof window === "undefined" ? {} : readGroupPrefs(),
  );

  useEffect(() => {
    // Ensure the group containing the active route stays open.
    const activeGroup = grouped.find((section) =>
      section.items.some((item) => isAdminNavItemActive(location, item)),
    )?.group as AdminNavGroup | undefined;
    if (!activeGroup) return;
    setPrefs((prev) => {
      if (prev[activeGroup] !== false) return prev;
      const next = { ...prev, [activeGroup]: true };
      writeGroupPrefs(next);
      return next;
    });
  }, [location, grouped]);

  function isExpanded(group: AdminNavGroup) {
    if (prefs[group] === false) {
      // Still expand if current route lives here.
      const section = grouped.find((g) => g.group === group);
      if (section?.items.some((item) => isAdminNavItemActive(location, item))) return true;
      return false;
    }
    return true;
  }

  function toggleGroup(group: AdminNavGroup) {
    setPrefs((prev) => {
      const currently = isExpanded(group);
      const next = { ...prev, [group]: !currently };
      writeGroupPrefs(next);
      return next;
    });
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin modules">
      {grouped.map((section) => {
        const group = section.group as AdminNavGroup;
        const expanded = isExpanded(group);
        const panelId = `admin-nav-group-${group.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={section.group} className="mb-3">
            <button
              type="button"
              className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggleGroup(group)}
            >
              <span>{section.group}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${expanded ? "rotate-0" : "-rotate-90"}`}
                aria-hidden
              />
            </button>
            {expanded ? (
              <ul id={panelId} className="space-y-1">
                {section.items.map((item) => {
                  const active = isAdminNavItemActive(location, item);
                  if (!item.available) {
                    return (
                      <li key={item.key}>
                        <span
                          className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--admin-muted)] opacity-70"
                          title="Not available for this role"
                          aria-disabled="true"
                        >
                          <span>{item.label}</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--brand-red)] ${
                          active
                            ? "bg-[var(--brand-red)] text-white"
                            : "text-[var(--admin-ink)] hover:bg-[var(--admin-soft)]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
