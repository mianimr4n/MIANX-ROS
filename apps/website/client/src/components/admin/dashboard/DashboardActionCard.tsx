import type { ReactNode } from "react";
import { Link } from "wouter";

import { cn } from "@/lib/utils";

export type DashboardActionCardProps = {
  title: string;
  description?: string;
  href: string;
  primary?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
};

/**
 * Operational action entry — links to an existing admin/ops surface.
 * Primary actions visually dominate; disabled actions stay honest.
 */
export function DashboardActionCard({
  title,
  description,
  href,
  primary = false,
  disabled = false,
  disabledReason,
  className,
}: DashboardActionCardProps) {
  const body = (
    <>
      <p className={cn("text-sm font-semibold", primary ? "text-white" : "text-[var(--admin-ink)]")}>
        {title}
      </p>
      {description ? (
        <p className={cn("mt-1 text-xs", primary ? "text-white/80" : "text-[var(--admin-muted)]")}>
          {description}
        </p>
      ) : null}
      {disabled && disabledReason ? (
        <p className="mt-2 text-xs text-amber-800">{disabledReason}</p>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 opacity-70",
          className,
        )}
        aria-disabled="true"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl border p-4 transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)]",
        primary
          ? "border-red-700 bg-red-600 text-white shadow-sm"
          : "border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-ink)]",
        className,
      )}
    >
      {body}
    </Link>
  );
}

export function DashboardActionGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
