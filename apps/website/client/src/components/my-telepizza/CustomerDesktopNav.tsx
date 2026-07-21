import { Link } from "wouter";
import { PRIMARY_NAV, type PrimaryTab } from "@/lib/my-telepizza-nav";

type CustomerDesktopNavProps = {
  active: PrimaryTab;
};

/** Compact vertical primary navigation for large screens. */
export function CustomerDesktopNav({ active }: CustomerDesktopNavProps) {
  return (
    <nav
      aria-label="My Telepizza"
      className="sticky top-24 rounded-3xl border border-border bg-white p-2 shadow-sm"
    >
      <p className="mb-1 px-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Navigate
      </p>
      <ul className="flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-brand-red/10 text-brand-red"
                    : "text-brand-charcoal/70 hover:bg-muted/50 hover:text-brand-charcoal"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
