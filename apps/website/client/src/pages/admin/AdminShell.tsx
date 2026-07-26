import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import {
  canAccessAdmin,
  canAccessAdminOrdersApi,
  filterVisibleAdminNav,
  primaryRoleLabel,
  type AdminNavItem,
} from "@/lib/admin-access";

const GROUP_ORDER = [
  "Overview",
  "Operations",
  "Commerce",
  "Customers",
  "Management",
  "Intelligence",
  "System",
] as const;

function groupNav(items: AdminNavItem[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
}

function pageTitle(path: string): string {
  if (path.startsWith("/admin/orders/")) return "Order detail";
  if (path.startsWith("/admin/orders")) return "Orders";
  if (path.startsWith("/admin/kitchen-dashboard")) return "Kitchen Manager KDS";
  if (path.startsWith("/admin/kitchen")) return "Kitchen Display";
  if (path.startsWith("/admin/branch")) return "Branch dashboard";
  if (path.startsWith("/admin/dashboard")) return "Executive dashboard";
  if (path.startsWith("/admin/unauthorized")) return "Unauthorized";
  const match = path.match(/^\/admin\/([^/]+)/);
  if (!match?.[1]) return "Admin";
  return match[1]
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [location, setLocation] = useLocation();
  const {
    profile,
    roles,
    permissions,
    isSuperAdmin,
    signOut,
    isLoading,
    isAuthenticated,
  } = useAuth();
  const {
    selection,
    setSelection,
    allowedBranches,
    canSelectAll,
    label: branchLabel,
  } = useAdminBranch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const principal = { roles, permissions, isSuperAdmin };
  const navItems = useMemo(() => filterVisibleAdminNav(principal), [roles, permissions, isSuperAdmin]);
  const grouped = useMemo(() => groupNav(navItems), [navItems]);
  const resolvedTitle = title ?? pageTitle(location);
  /** Desktop sidebar is always expanded; mobile drawer only when open. */
  const navExpanded = isLgUp || sidebarOpen;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLgUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const wasSidebarOpen = useRef(false);
  useEffect(() => {
    if (wasSidebarOpen.current && !sidebarOpen) {
      menuButtonRef.current?.focus();
    }
    wasSidebarOpen.current = sidebarOpen;
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center bg-[var(--admin-canvas)] text-[var(--admin-ink)]">
        <div className="animate-pulse text-sm tracking-wide text-[var(--admin-muted)]">
          Loading admin session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin(principal)) {
    return (
      <div className="admin-shell min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--admin-canvas)] px-6 text-center text-[var(--admin-ink)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-red)]">Telepizza Admin</p>
        <h1 className="text-2xl font-semibold">Staff access required</h1>
        <p className="max-w-md text-sm text-[var(--admin-muted)]">
          This area is reserved for authorized Telepizza staff. Customer accounts cannot open Admin ERP.
        </p>
        <Link
          href="/admin/login"
          className="rounded-lg bg-[var(--brand-red)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
        >
          Admin login
        </Link>
        <p className="text-xs text-[var(--admin-muted)]">Powered by Mianx.ai</p>
      </div>
    );
  }

  if (!canAccessAdminOrdersApi(principal) && (location === "/admin" || location.startsWith("/admin/dashboard") || location.startsWith("/admin/orders"))) {
    // Soft gate: shell still renders for reserved modules, but active ops modules need order.manage.
  }

  return (
    <div className="admin-shell min-h-screen bg-[var(--admin-canvas)] text-[var(--admin-ink)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        aria-hidden={!navExpanded}
        inert={!navExpanded ? true : undefined}
        className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-[var(--admin-border)] bg-[var(--admin-panel)] transition-transform duration-200 ease-out motion-reduce:transition-none lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${navExpanded ? "" : "pointer-events-none max-lg:invisible"}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-red-dark)]">
              Telepizza
            </p>
            <p className="text-sm font-semibold">Admin ERP</p>
            <p className="text-[11px] text-[var(--admin-muted)]">Powered by Mianx.ai</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] lg:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin modules">
          {grouped.map((section) => (
            <div key={section.group} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">
                {section.group}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    item.href === "/admin/branch"
                      ? location === "/admin/branch" || location.startsWith("/admin/branch/")
                      : item.href === "/admin/dashboard"
                        ? location === "/admin" || location.startsWith("/admin/dashboard")
                        : location === item.href || location.startsWith(`${item.href}/`);
                  if (!item.available) {
                    return (
                      <li key={item.key}>
                        <span
                          className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--admin-muted)] opacity-70"
                          title="Coming in a later release"
                          aria-disabled="true"
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] uppercase tracking-wide">Soon</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
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
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-[var(--admin-border)] bg-[var(--admin-panel)]/95 backdrop-blur">
          <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3">
            <button
              type="button"
              ref={menuButtonRef}
              className="rounded-md p-2 hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] lg:hidden"
              aria-label="Open sidebar"
              aria-controls="admin-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight">{resolvedTitle}</h1>
            </div>

            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-medium hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                aria-haspopup="listbox"
                aria-expanded={branchMenuOpen}
                onClick={() => setBranchMenuOpen((open) => !open)}
              >
                <span className="max-w-[10rem] truncate">{branchLabel}</span>
                <ChevronDown className="h-4 w-4 text-[var(--admin-muted)]" />
              </button>
              {branchMenuOpen ? (
                <ul
                  role="listbox"
                  aria-label="Branch scope"
                  className="absolute right-0 z-30 mt-2 max-h-72 w-56 overflow-auto rounded-lg border border-[var(--admin-border)] bg-white py-1 shadow-lg"
                >
                  {canSelectAll ? (
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selection.mode === "all"}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--admin-soft)]"
                        onClick={() => {
                          setSelection({ mode: "all" });
                          setBranchMenuOpen(false);
                        }}
                      >
                        {isSuperAdmin ? "All Branches" : "Assigned Branches"}
                      </button>
                    </li>
                  ) : null}
                  {allowedBranches.map((branch) => (
                    <li key={branch.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selection.mode === "branch" && selection.branchId === branch.id}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--admin-soft)]"
                        onClick={() => {
                          setSelection({ mode: "branch", branchId: branch.id });
                          setBranchMenuOpen(false);
                        }}
                      >
                        {branch.shortName || branch.name}
                      </button>
                    </li>
                  ))}
                  {allowedBranches.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-[var(--admin-muted)]">No assigned branches</li>
                  ) : null}
                </ul>
              ) : null}
            </div>

            <div
              className="hidden items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-muted)] md:inline-flex"
              title="Global search arrives in a later release"
            >
              <Search className="h-4 w-4" />
              <span>Search unavailable</span>
            </div>

            <button
              type="button"
              className="rounded-lg border border-[var(--admin-border)] p-2 text-[var(--admin-muted)]"
              aria-label="Notifications unavailable"
              title="Notifications arrive in a later release"
              disabled
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium">{profile?.fullName ?? "Staff"}</p>
                <p className="truncate text-[11px] text-[var(--admin-muted)]">
                  {primaryRoleLabel(roles, isSuperAdmin)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => setLocation("/admin/login"));
                }}
                className="rounded-md p-2 hover:bg-[var(--admin-soft)]"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main id="admin-main" className="min-w-0 overflow-x-clip px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
