import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { menuItems, type MenuItem } from "@/data/menu-data";
import { getItemsByCategory, getItemsByIds } from "@/lib/menu-utils";
import { ProductCard } from "@/components/menu/ProductCard";

type MenuSectionRowProps = {
  title: string;
  highlight?: string;
  subtitle?: string;
  category?: string;
  itemIds?: string[];
  limit?: number;
  viewAllCategory?: string;
  onAdd: (item: MenuItem) => void;
  dark?: boolean;
};

export function MenuSectionRow({
  title,
  highlight,
  subtitle,
  category,
  itemIds,
  limit = 3,
  viewAllCategory,
  onAdd,
  dark = false,
}: MenuSectionRowProps) {
  const items = itemIds
    ? getItemsByIds(menuItems, itemIds)
    : category
      ? getItemsByCategory(menuItems, category).slice(0, limit)
      : [];

  if (items.length === 0) {
    return null;
  }

  const viewAllHref = `/menu?category=${encodeURIComponent(viewAllCategory ?? category ?? "All")}`;

  return (
    <section className={dark ? "bg-brand-charcoal py-14 md:py-16" : "container py-12 md:py-16"}>
      <div className={dark ? "container" : undefined}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2
              className={`brand-heading text-3xl md:text-4xl ${dark ? "text-white" : ""}`}
            >
              {title}{" "}
              {highlight && <span className="text-brand-red">{highlight}</span>}
            </h2>
            {subtitle && (
              <p className={`mt-2 font-[var(--font-body)] ${dark ? "text-white/60" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          <Link href={viewAllHref}>
            <span className="hidden sm:inline-flex items-center text-brand-red font-[var(--font-accent)] font-bold text-sm hover:underline">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <ProductCard key={item.id} item={item} index={index} onAdd={onAdd} />
          ))}
        </div>
      </div>
    </section>
  );
}
