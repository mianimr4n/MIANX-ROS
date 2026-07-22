import { Flame, Gift, Leaf, Star, Wallet } from "lucide-react";
import { Link } from "wouter";

type DiscoveryAction = {
  id: string;
  label: string;
  href: string;
  icon: typeof Star;
  available: boolean;
};

type MenuSmartDiscoveryProps = {
  vegetarianAvailable: boolean;
};

/**
 * Deterministic smart discovery strip — only exposes filters backed by real data.
 */
export function MenuSmartDiscovery({ vegetarianAvailable }: MenuSmartDiscoveryProps) {
  const actions: DiscoveryAction[] = [
    { id: "popular", label: "Popular", href: "/menu?q=special", icon: Star, available: true },
    { id: "spicy", label: "Spicy", href: "/menu?q=peri", icon: Flame, available: true },
    { id: "family", label: "Family", href: "/menu?category=Deals", icon: Gift, available: true },
    { id: "value", label: "Value deals", href: "/menu?category=Deals", icon: Wallet, available: true },
    {
      id: "veg",
      label: "Vegetarian",
      href: "/menu?q=veg",
      icon: Leaf,
      available: vegetarianAvailable,
    },
  ];

  const visible = actions.filter((a) => a.available);

  return (
    <section
      className="mb-6 rounded-2xl border border-brand-red/15 bg-gradient-to-r from-brand-cream via-white to-brand-cream p-4 sm:p-5"
      aria-labelledby="smart-discovery-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 id="smart-discovery-heading" className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal">
            Not sure what to order?
          </h2>
          <p className="text-sm text-muted-foreground">
            Quick picks from the published menu — powered by Mianx.ai discovery.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {visible.map((action) => (
          <li key={action.id}>
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-2 text-sm font-semibold text-brand-charcoal shadow-sm transition-colors hover:border-brand-red/30 hover:text-brand-red focus-ring-brand"
            >
              <action.icon className="h-4 w-4 text-brand-red" aria-hidden />
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
