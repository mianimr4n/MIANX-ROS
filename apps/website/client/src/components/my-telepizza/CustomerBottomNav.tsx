import { Link } from "wouter";
import { PRIMARY_NAV, type PrimaryTab } from "@/lib/my-telepizza-nav";

type CustomerBottomNavProps = {
  active: PrimaryTab;
};

/**
 * Persistent mobile bottom navigation (safe-area aware, ≥44px targets).
 * Hidden on large screens where CustomerDesktopNav is shown.
 */
export function CustomerBottomNav({ active }: CustomerBottomNavProps) {
  return (
    <nav
      aria-label="My Telepizza"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1 py-1.5">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 sm:text-[11px] ${
                  isActive
                    ? "bg-brand-red/10 text-brand-red"
                    : "text-brand-charcoal/70 hover:bg-muted/50 hover:text-brand-charcoal"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
