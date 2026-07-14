import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleImageError } from "@/lib/image-fallback";
import { getDefaultVariant, getDisplayPrice } from "@/lib/menu-utils";
import type { MenuItem } from "@/data/menu-data";
import { ProductBadge } from "./ProductBadge";

type ProductCardProps = {
  item: MenuItem;
  index?: number;
  onAdd: (item: MenuItem) => void;
  compact?: boolean;
};

export function ProductCard({ item, index = 0, onAdd, compact = false }: ProductCardProps) {
  const defaultVariant = getDefaultVariant(item);
  const displayPrice = getDisplayPrice(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-border hover:border-brand-red/40 hover:shadow-2xl hover:shadow-brand-red/10 transition-all duration-300"
    >
      <div className={`relative overflow-hidden ${compact ? "aspect-[4/3]" : "aspect-[4/3]"}`}>
        <img
          src={item.image}
          alt={item.name}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {item.badge && <ProductBadge badge={item.badge} />}
        </div>
      </div>

      <div className={`flex flex-col flex-1 ${compact ? "p-4" : "p-5"}`}>
        <p className="text-[11px] uppercase tracking-wider text-brand-red font-[var(--font-accent)] font-bold mb-1">
          {item.category}
        </p>
        <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-1 line-clamp-1">
          {item.name}
        </h3>
        {!compact && item.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
        )}
        {defaultVariant && (
          <p className="text-xs text-muted-foreground mb-2 font-[var(--font-accent)]">
            {defaultVariant.label}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="inline-flex items-center justify-center rounded-2xl bg-brand-red/10 px-3 py-2">
            <span className="font-[var(--font-accent)] font-extrabold text-lg text-brand-red">
              Rs {displayPrice?.toLocaleString() ?? "—"}
            </span>
          </div>
          <Button
            onClick={() => onAdd(item)}
            size="sm"
            className="rounded-2xl bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-accent)] font-semibold shadow-lg shadow-brand-red/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
