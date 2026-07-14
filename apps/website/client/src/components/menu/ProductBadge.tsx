import { Flame, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeStyles: Record<string, string> = {
  Signature: "bg-brand-gold text-brand-charcoal",
  Hot: "bg-brand-red text-white",
  New: "bg-brand-orange text-white",
  "Best Seller": "bg-brand-charcoal text-white",
  "Chef Special": "bg-brand-red-dark text-white",
  Limited: "bg-brand-gold text-brand-charcoal",
};

const badgeIcons: Record<string, typeof Flame> = {
  Signature: Flame,
  Hot: Zap,
  New: Sparkles,
  "Best Seller": Star,
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
