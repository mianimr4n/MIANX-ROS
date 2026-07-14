import { motion } from "framer-motion";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleImageError } from "@/lib/image-fallback";
import type { MenuItem } from "@/lib/telepizza-types";
import { useAddMenuItem } from "@/hooks/useAddMenuItem";
import { ProductBadge } from "./ProductBadge";

type DealCardProps = {
  deal: MenuItem;
  index?: number;
};

export function DealCard({ deal, index = 0 }: DealCardProps) {
  const addMenuItem = useAddMenuItem();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="group flex flex-col h-full overflow-hidden rounded-2xl border border-border bg-white shadow-lg shadow-brand-red/5 hover:border-brand-red/35 hover:shadow-2xl hover:shadow-brand-red/10 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={deal.image}
          alt={deal.name}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-brand-red text-white text-[11px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full shadow-md">
            <Tag className="w-3 h-3" />
            DEAL
          </span>
          {deal.badge && <ProductBadge badge={deal.badge} />}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <p className="text-[11px] uppercase tracking-wider text-brand-red font-[var(--font-accent)] font-bold mb-1">
          {deal.category}
        </p>
        <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-1 line-clamp-1">
          {deal.name}
        </h3>
        {deal.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
            {deal.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="inline-flex items-center justify-center rounded-2xl bg-brand-red/10 px-3 py-2">
            <span className="font-[var(--font-accent)] font-extrabold text-lg text-brand-red">
              Rs {deal.price?.toLocaleString()}
            </span>
          </div>
          <Button
            onClick={() => addMenuItem(deal)}
            size="sm"
            className="rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-[var(--font-accent)] font-semibold shadow-lg shadow-brand-red/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
