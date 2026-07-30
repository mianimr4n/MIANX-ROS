import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

import { cn } from "@/lib/utils";

export type OperationModuleStatus =
  | "operational"
  | "attention"
  | "limited"
  | "unavailable"
  | "module-not-enabled"
  | "planned"
  | "maintenance";

export type OperationModuleCardProps = {
  title: string;
  icon: LucideIcon;
  status: OperationModuleStatus;
  route: string;
  badge?: string;
  primaryAction: string;
  description?: string;
  /** When false, card does not navigate (module not enabled / planned). */
  enabled?: boolean;
};

const STATUS_STYLES: Record<OperationModuleStatus, string> = {
  operational: "bg-emerald-50 text-emerald-800",
  attention: "bg-amber-50 text-amber-950",
  limited: "bg-sky-50 text-sky-900",
  unavailable: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  "module-not-enabled": "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  planned: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  maintenance: "bg-orange-50 text-orange-950",
};

const STATUS_LABEL: Record<OperationModuleStatus, string> = {
  operational: "Operational",
  attention: "Attention required",
  limited: "Limited",
  unavailable: "Data Unavailable",
  "module-not-enabled": "Module Not Enabled",
  planned: "Planned",
  maintenance: "Maintenance",
};

/**
 * Reusable operations-grid card for Owner Executive Dashboard.
 * Disabled modules never navigate — honesty over empty destinations.
 */
export function OperationModuleCard({
  title,
  icon: Icon,
  status,
  route,
  badge,
  primaryAction,
  description,
  enabled,
}: OperationModuleCardProps) {
  const label = badge ?? STATUS_LABEL[status];
  const canNavigate =
    enabled ??
    (status !== "planned" &&
      status !== "unavailable" &&
      status !== "module-not-enabled");

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-soft)] text-[var(--brand-red)]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            STATUS_STYLES[status],
          )}
        >
          {label}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
      {description ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p> : null}
      <span
        className={cn(
          "mt-4 inline-flex text-sm font-semibold",
          canNavigate ? "text-[var(--brand-red)]" : "text-[var(--admin-muted)]",
        )}
      >
        {canNavigate ? primaryAction : status === "module-not-enabled" ? "Module Not Enabled" : primaryAction}
      </span>
    </>
  );

  if (!canNavigate) {
    return (
      <div
        className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 opacity-95"
        aria-disabled="true"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={route}
      className="block rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-[0_1px_2px_rgba(31,31,31,0.04)] outline-none transition-colors hover:border-[var(--brand-red)]/40 focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
    >
      {body}
    </Link>
  );
}
