import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

import { cn } from "@/lib/utils";

export type AdminModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  statusLabel: string;
  statusTone?: "live" | "ready" | "soon" | "alert";
  actionLabel: string;
  available?: boolean;
};

export function AdminModuleCard({
  title,
  description,
  href,
  icon: Icon,
  statusLabel,
  statusTone = "soon",
  actionLabel,
  available = false,
}: AdminModuleCardProps) {
  const tone =
    statusTone === "live"
      ? "bg-emerald-50 text-emerald-800"
      : statusTone === "ready"
        ? "bg-sky-50 text-sky-800"
        : statusTone === "alert"
          ? "bg-amber-50 text-amber-900"
          : "bg-[var(--admin-soft)] text-[var(--admin-muted)]";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-soft)] text-[var(--brand-red)]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", tone)}>
          {statusLabel}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>
      <span
        className={cn(
          "mt-4 inline-flex text-sm font-semibold",
          available ? "text-[var(--brand-red)]" : "text-[var(--admin-muted)]",
        )}
      >
        {actionLabel}
      </span>
    </>
  );

  if (!available) {
    return (
      <div
        className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 opacity-90"
        aria-disabled="true"
        title="Module reserved for a later release"
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
