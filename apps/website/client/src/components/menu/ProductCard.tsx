import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { handleImageError } from "@/lib/image-fallback";
import { useAddMenuItem } from "@/hooks/useAddMenuItem";
import { isPizzaFamily } from "@/data/cart-config";
import { getDefaultSku, formatMenuPriceLabel } from "@/lib/menu-utils";
import type { MenuProductGroup } from "@/lib/telepizza-types";
import { ProductBadge } from "./ProductBadge";

type ProductCardProps = {
  /** A product family; the card advertises its first sellable SKU. */
  group: MenuProductGroup;
  index?: number;
  compact?: boolean;
};

export function ProductCard({ group, index = 0, compact = false }: ProductCardProps) {
  const addMenuItem = useAddMenuItem();
  const defaultSku = getDefaultSku(group);
  const href = `/menu/${encodeURIComponent(group.productGroupSlug)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group relative flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-border hover:border-brand-red/45 hover:shadow-2xl hover:shadow-brand-red/12 transition-all duration-300"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-red via-brand-gold to-brand-red opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />

      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={group.image}
          alt={group.name}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {group.badge && <ProductBadge badge={group.badge} />}
        </div>
      </div>

      <div className={`flex flex-col flex-1 ${compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"}`}>
        <p className="text-[11px] uppercase tracking-wider text-brand-red font-[var(--font-accent)] font-bold mb-1">
          {group.category}
        </p>
        <Link href={href}>
          <h3 className="font-[var(--font-display)] font-bold text-base sm:text-lg text-brand-charcoal mb-1 line-clamp-1 hover:text-brand-red">
            {group.name}
          </h3>
        </Link>
        {!compact && group.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description}</p>
        )}
        {defaultSku?.sizeLabel && (
          <p className="text-xs text-muted-foreground mb-2 font-[var(--font-accent)]">
            {defaultSku.sizeLabel}
            {group.options.length > 1 ? ` · ${group.options.length} sizes` : ""}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center justify-center rounded-2xl bg-brand-gold/15 border border-brand-gold/40 px-3 py-2">
            <span className="font-[var(--font-accent)] font-extrabold text-base sm:text-lg text-brand-red">
              {formatMenuPriceLabel(group, defaultSku?.price)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={href} className="flex-1 sm:flex-none">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto rounded-2xl text-brand-red hover:bg-brand-red/10">
                View
              </Button>
            </Link>
            <Button
              onClick={() => defaultSku && addMenuItem(defaultSku)}
              disabled={!defaultSku}
              size="sm"
              className="flex-1 sm:flex-none rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-[var(--font-accent)] font-semibold shadow-lg shadow-brand-red/25 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-1" />
              {isPizzaFamily(group) ? "Customize" : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
