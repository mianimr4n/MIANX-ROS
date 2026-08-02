import { Flame, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeStyles: Record<string, string> = {
  Signature: "bg-[#F5B800] text-[#1F1F1F]",
  // Darker red improves small-badge contrast for white label text (WCAG AA).
  Hot: "bg-[#B5121B] text-white",
  HOT: "bg-[#B5121B] text-white",
  New: "bg-[#C2410C] text-white",
  NEW: "bg-[#C2410C] text-white",
  "Best Seller": "bg-[#1F1F1F] text-white",
  "BEST SELLER": "bg-[#1F1F1F] text-white",
  POPULAR: "bg-[#B5121B] text-white",
  "BEST VALUE": "bg-[#F5B800] text-[#1F1F1F]",
  "Chef Special": "bg-[#B5121B] text-white",
  Limited: "bg-[#F5B800] text-[#1F1F1F]",
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
  const style = badgeStyles[badge] ?? "bg-[#B5121B] text-white";

  return (
    <span
      className={cn(
        "relative isolate inline-flex items-center gap-1 text-xs font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm",
        style,
        className,
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {badge}
    </span>
  );
}
