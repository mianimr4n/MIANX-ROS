import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Maximize2, Minimize2, RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdmin, isKitchenOnly, primaryRoleLabel } from "@/lib/admin-access";

const KDS_NAV = [
  { id: "board", label: "Kitchen Board", href: "/admin/kitchen-dashboard" },
  { id: "queue", label: "Order Queue", href: "/admin/kitchen-dashboard?view=queue" },
  { id: "ready", label: "Ready Orders", href: "/admin/kitchen-dashboard?view=ready" },
  { id: "delayed", label: "Delayed Orders", href: "/admin/kitchen-dashboard?view=delayed" },
] as const;

function formatClock(now: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  }).format(now);
}

export function KitchenManagerShell({
  children,
  syncLabel,
  syncTone = "live",
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  syncLabel: string;
  syncTone?: "live" | "refreshing" | "offline" | "failed";
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const { profile, roles, permissions, isSuperAdmin, signOut, isLoading, isAuthenticated } = useAuth();
  const { label: branchLabel, selection, setSelection, allowedBranches, branchIdFilter, canSelectAll } =
    useAdminBranch();
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const kitchenOnly = isKitchenOnly({ roles, permissions, isSuperAdmin });
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !canAccessAdmin({ roles, permissions, isSuperAdmin })) {
      setLocation("/admin/login?reason=unauthorized");
    }
  }, [isAuthenticated, isLoading, permissions, roles, isSuperAdmin, setLocation]);

  // Kitchen-only staff must stay on a concrete branch — never All Branches.
  useEffect(() => {
    if (!kitchenOnly) return;
    if (selection.mode === "branch" && branchIdFilter) return;
    const preferred = allowedBranches[0];
    if (preferred) setSelection({ mode: "branch", branchId: preferred.id });
  }, [allowedBranches, branchIdFilter, kitchenOnly, selection.mode, setSelection]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const activeView = useMemo(() => {
    const qs = location.includes("?") ? location.slice(location.indexOf("?") + 1) : "";
    const view = new URLSearchParams(qs).get("view") ?? "board";
    return view;
  }, [location]);

  const syncClass =
    syncTone === "live"
      ? "bg-emerald-50 text-emerald-900"
      : syncTone === "refreshing"
        ? "bg-sky-50 text-sky-900"
        : "bg-red-50 text-red-900";

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Browser may deny fullscreen — visual control still present.
    }
  }

  if (isLoading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] text-sm text-[var(--admin-muted)]">
        Loading kitchen session…
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[var(--admin-canvas)] text-[var(--admin-ink)]">
      <header className="border-b border-[var(--admin-border)] bg-[var(--admin-panel)]">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
              Telepizza · Kitchen Display System
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {branchLabel}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
              {profile?.fullName || profile?.email || "Kitchen staff"} · {roleLabel}
              {!canSelectAll ? " · Branch-scoped" : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <time
              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-semibold tabular-nums"
              dateTime={now.toISOString()}
            >
              {formatClock(now)}
            </time>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${syncClass}`}
              aria-live="polite"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  syncTone === "live" ? "bg-emerald-600" : syncTone === "refreshing" ? "bg-sky-600" : "bg-red-600"
                }`}
                aria-hidden
              />
              {syncLabel}
            </span>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
                Refresh
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
            <button
              type="button"
              onClick={() => void signOut().then(() => setLocation("/admin/login"))}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </button>
          </div>
        </div>

        <nav
          className="mx-auto flex max-w-[1920px] gap-1 overflow-x-auto px-4 pb-3 lg:px-6"
          aria-label="Kitchen views"
        >
          {KDS_NAV.map((item) => {
            const viewId = item.id;
            const isActive =
              viewId === "board" ? activeView === "board" || !activeView : activeView === viewId;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] ${
                  isActive
                    ? "bg-[var(--brand-red)] text-white"
                    : "bg-[var(--admin-soft)] text-[var(--admin-ink)] hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span
            className="ml-2 hidden min-h-11 items-center rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-xs text-[var(--admin-muted)] sm:inline-flex"
            title="Item-level station board requires backend stations"
          >
            Item View · FOUNDATION
          </span>
          <span
            className="hidden min-h-11 items-center rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-xs text-[var(--admin-muted)] sm:inline-flex"
            title="Kitchen history requires completed-ticket archive UX"
          >
            History · FOUNDATION
          </span>
        </nav>
      </header>

      <main className="mx-auto max-w-[1920px] px-4 py-4 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
