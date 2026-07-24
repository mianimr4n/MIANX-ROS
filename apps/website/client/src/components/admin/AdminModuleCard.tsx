import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

import { cn } from "@/lib/utils";

export type AdminModuleState =
  | "operational"
  | "attention"
  | "limited"
  | "unavailable"
  | "planned"
  | "maintenance";

export type AdminModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  actionLabel: string;
  /** D1 module operational state. */
  moduleState?: AdminModuleState;
  statusLabel?: string;
  /** When true, card navigates to href. Planned/unavailable never navigate. */
  navigable?: boolean;
  /** @deprecated Prefer `moduleState` + `navigable`. */
  statusTone?: "live" | "ready" | "soon" | "alert";
  /** @deprecated Prefer `navigable`. */
  available?: boolean;
};

const STATE_STYLES: Record<AdminModuleState, string> = {
  operational: "bg-emerald-50 text-emerald-800",
  attention: "bg-amber-50 text-amber-950",
  limited: "bg-sky-50 text-sky-900",
  unavailable: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  planned: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  maintenance: "bg-orange-50 text-orange-950",
};

const STATE_LABEL: Record<AdminModuleState, string> = {
  operational: "Operational",
  attention: "Attention required",
  limited: "Limited",
  unavailable: "Unavailable",
  planned: "Planned",
  maintenance: "Maintenance",
};

function resolveModuleState(
  moduleState: AdminModuleState | undefined,
  statusTone: AdminModuleCardProps["statusTone"],
  available: boolean | undefined,
): AdminModuleState {
  if (moduleState) return moduleState;
  if (available === false) return "planned";
  if (statusTone === "live") return "operational";
  if (statusTone === "alert") return "attention";
  if (statusTone === "ready") return "limited";
  return "planned";
}

export function AdminModuleCard({
  title,
  description,
  href,
  icon: Icon,
  actionLabel,
  moduleState,
  statusLabel,
  navigable,
  statusTone = "soon",
  available = false,
}: AdminModuleCardProps) {
  const resolvedState = resolveModuleState(moduleState, statusTone, available);
  const label = statusLabel ?? STATE_LABEL[resolvedState];
  const canNavigate =
    navigable ??
    (available && resolvedState !== "planned" && resolvedState !== "unavailable");

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-soft)] text-[var(--brand-red)]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            STATE_STYLES[resolvedState],
          )}
        >
          {label}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>
      <span
        className={cn(
          "mt-4 inline-flex text-sm font-semibold",
          canNavigate ? "text-[var(--brand-red)]" : "text-[var(--admin-muted)]",
        )}
      >
        {canNavigate ? actionLabel : resolvedState === "planned" ? "Coming later" : actionLabel}
      </span>
    </>
  );

  if (!canNavigate) {
    return (
      <div
        className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 opacity-95"
        aria-disabled="true"
        title={resolvedState === "planned" ? "Module reserved for a later release" : undefined}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-[0_1px_2px_rgba(31,31,31,0.04)] outline-none transition-colors hover:border-[var(--brand-red)]/40 focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
    >
      {body}
    </Link>
  );
}
