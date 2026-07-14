import { Flame, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeStyles: Record<string, string> = {
  Signature: "bg-brand-gold text-brand-charcoal",
  Hot: "bg-brand-red text-white",
  HOT: "bg-brand-red text-white",
  New: "bg-brand-orange text-white",
  NEW: "bg-brand-orange text-white",
  "Best Seller": "bg-brand-charcoal text-white",
  "BEST SELLER": "bg-brand-charcoal text-white",
  POPULAR: "bg-brand-red text-white",
  "BEST VALUE": "bg-brand-gold text-brand-charcoal",
  "Chef Special": "bg-brand-red-dark text-white",
  Limited: "bg-brand-gold text-brand-charcoal",
};

const badgeIcons: Record<string, typeof Flame> = {
  Signature: Flame,
  Hot: Zap,
  HOT: Zap,
  New: Sparkles,
  NEW: Sparkles,
  "Best Seller": Star,
  "BEST SELLER": Star,
  POPULAR: Star,
  "BEST VALUE": Star,
  "Chef Special": Star,
  Limited: Sparkles,
};

export function ProductBadge({
  badge,
  className,
}: {
  badge: string;
  className?: string;
}) {
  const Icon = badgeIcons[badge] ?? Flame;
  const style = badgeStyles[badge] ?? "bg-brand-red text-white";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
        style,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {badge}
    </span>
  );
}
