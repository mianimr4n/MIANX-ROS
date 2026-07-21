import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type CustomerEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/** Shared empty-state card for My Telepizza modules. */
export function CustomerEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: CustomerEmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center space-y-4 ${className}`}
      role="status"
    >
      <Icon className="mx-auto h-14 w-14 text-brand-red" aria-hidden="true" />
      <div className="space-y-1.5">
        <p className="font-semibold text-lg text-brand-charcoal">{title}</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
