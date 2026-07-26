import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

import { cn } from "@/lib/utils";

export type DashboardActionCardProps = {
  /** Verb-first action label, e.g. "Open POS", "Create reservation". */
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
 * Primary actions visually dominate; disabled actions stay honest and
 * visibly non-interactive (no hover affordance, no arrow).
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
  if (disabled) {
    return (
      <div
        className={cn(
          "min-h-11 cursor-not-allowed rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 opacity-70",
          className,
        )}
        aria-disabled="true"
      >
        <p className="text-sm font-semibold text-[var(--admin-muted)]">{title}</p>
        {description ? <p className="mt-1 text-xs text-[var(--admin-muted)]">{description}</p> : null}
        {disabledReason ? <p className="mt-2 text-xs text-amber-800">{disabledReason}</p> : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-11 items-center justify-between gap-3 rounded-2xl border p-4 transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)] motion-reduce:transition-none",
        primary
          ? "border-[var(--brand-red-dark)] bg-[var(--brand-red-dark)] text-white shadow-sm"
          : "border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-ink)]",
        className,
      )}
    >
      <span className="min-w-0">
        <span className={cn("block text-sm font-semibold", primary ? "text-white" : "text-[var(--admin-ink)]")}>
          {title}
        </span>
        {description ? (
          <span className={cn("mt-1 block text-xs", primary ? "text-white" : "text-[var(--admin-muted)]")}>
            {description}
          </span>
        ) : null}
      </span>
      <ArrowRight
        aria-hidden
        className={cn(
          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
          primary ? "text-white" : "text-[var(--admin-muted)]",
        )}
      />
    </Link>
  );
}

export function DashboardActionGrid({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
