import type { ReactNode } from "react";

import { AdminSparkline } from "@/components/admin/AdminSparkline";
import { cn } from "@/lib/utils";

export type AdminKpiSource = "LIVE" | "DERIVED" | "PARTIAL" | "FOUNDATION" | "UNAVAILABLE";

export type AdminKpiCardProps = {
  title: string;
  value: string;
  source: AdminKpiSource;
  detail?: string;
  unavailable?: boolean;
  className?: string;
};

const SOURCE_STYLES: Record<AdminKpiSource, string> = {
  LIVE: "bg-emerald-50 text-emerald-800",
  DERIVED: "bg-sky-50 text-sky-800",
  PARTIAL: "bg-amber-50 text-amber-950",
  FOUNDATION: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  UNAVAILABLE: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
};

export function AdminKpiCard({
  title,
  value,
  source,
  detail,
  unavailable = false,
  className,
}: AdminKpiCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 shadow-[0_1px_2px_rgba(31,31,31,0.04)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--admin-muted)]">{title}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                SOURCE_STYLES[source],
              )}
            >
              {source === "UNAVAILABLE" ? "Unavailable" : source.toLowerCase()}
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[var(--admin-ink)]">
            {unavailable ? "—" : value}
          </p>
        </div>
        <AdminSparkline decorative />
      </div>
      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        {unavailable ? (detail ?? "Not available yet") : (detail ?? "From operations API")}
      </p>
    </article>
  );
}

export function AdminKpiSkeleton() {
  return <div className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" aria-hidden />;
}

export function AdminSectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">{eyebrow}</p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight text-[var(--admin-ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
