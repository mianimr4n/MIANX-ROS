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
      className="group relative flex flex-col h-full overflow-hidden rounded-2xl border-2 border-brand-red/20 shadow-xl shadow-brand-red/10 hover:shadow-2xl hover:shadow-brand-red/20 transition-all duration-300"
    >
      <div className="absolute inset-0 brand-gradient opacity-95" />
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={deal.image}
          alt={deal.name}
          onError={handleImageError}
          className="w-full h-full object-cover mix-blend-overlay opacity-60 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-white text-brand-red text-xs font-[var(--font-accent)] font-bold px-3 py-1.5 rounded-full shadow-lg">
            <Tag className="w-3.5 h-3.5" />
            DEAL
          </span>
          {deal.badge && <ProductBadge badge={deal.badge} />}
        </div>
      </div>

      <div className="relative flex flex-col flex-1 p-5 text-white">
        <h3 className="font-[var(--font-display)] font-extrabold text-2xl mb-2">{deal.name}</h3>
        <p className="text-white/85 text-sm mb-4 line-clamp-2">{deal.description}</p>
        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="inline-flex flex-col items-start">
            <span className="text-white/70 text-xs font-[var(--font-accent)] uppercase tracking-wider">
              From
            </span>
            <span className="inline-flex items-center justify-center rounded-full bg-white text-brand-red font-[var(--font-accent)] font-extrabold text-2xl px-5 py-2 shadow-lg">
              Rs {deal.price?.toLocaleString()}
            </span>
          </div>
          <Button
            onClick={() => addMenuItem(deal)}
            size="lg"
            className="rounded-2xl bg-white text-brand-red hover:bg-brand-cream font-[var(--font-accent)] font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
