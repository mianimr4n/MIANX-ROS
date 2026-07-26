import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminSurfaceProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside";
};

export function AdminSurface({
  className,
  children,
  as: Tag = "section",
  ...props
}: AdminSurfaceProps) {
  return (
    <Tag
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-[0_1px_2px_rgba(31,31,31,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function AdminSurfaceHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-[var(--admin-ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminSurfaceBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
