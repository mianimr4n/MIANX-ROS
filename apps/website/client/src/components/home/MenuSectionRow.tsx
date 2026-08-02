import { useMemo } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { getGroupsByIds, getItemsByCategory } from "@/lib/menu-utils";
import { ProductCard } from "@/components/menu/ProductCard";

type MenuSectionRowProps = {
  title: string;
  highlight?: string;
  subtitle?: string;
  category?: string;
  itemIds?: string[];
  limit?: number;
  viewAllCategory?: string;
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
  dark = false,
}: MenuSectionRowProps) {
  const { groups: catalogGroups } = useMenuCatalog();

  const items = useMemo(
    () =>
      itemIds
        ? getGroupsByIds(catalogGroups, itemIds)
        : category
          ? getItemsByCategory(catalogGroups, category).slice(0, limit)
          : [],
    [catalogGroups, category, itemIds, limit],
  );

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
              {highlight && <span className={dark ? "text-brand-gold" : "text-brand-red-dark"}>{highlight}</span>}
            </h2>
            {subtitle && (
              <p className={`mt-2 font-[var(--font-body)] ${dark ? "text-white/80" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          <Link
            href={viewAllHref}
            className={`inline-flex items-center min-h-11 font-[var(--font-accent)] font-bold text-xs sm:text-sm hover:underline shrink-0 ${
              dark ? "text-brand-gold" : "text-brand-red-dark"
            }`}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-0.5" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map((group, index) => (
            <ProductCard key={group.productGroupSlug} group={group} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
