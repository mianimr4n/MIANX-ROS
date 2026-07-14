import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { getCategoryPlaceholderImage } from "@/lib/menu-catalog";
import { handleImageError } from "@/lib/image-fallback";

const CURATED_CATEGORY_PREVIEWS = [
  { menuCategory: "Signature Pizzas", label: "Signature Pizzas", accent: "Pizza" },
  { menuCategory: "Broast", label: "Broast", accent: "Broast" },
  { menuCategory: "Burgers", label: "Burgers", accent: "Burgers" },
  { menuCategory: "Pasta", label: "Pasta", accent: "Pasta" },
  { menuCategory: "Fries", label: "Fries", accent: "Sides" },
  { menuCategory: "Drinks", label: "Drinks", accent: "Drinks" },
] as const;

export function CategoryStrip() {
  const { availableCategories } = useMenuCatalog();

  const categories = useMemo(() => {
    const available = new Set(availableCategories);

    return CURATED_CATEGORY_PREVIEWS.filter((preview) => available.has(preview.menuCategory)).map(
      (preview) => ({
        name: preview.label,
        menuCategory: preview.menuCategory,
        image: getCategoryPlaceholderImage(preview.menuCategory),
        accent: preview.accent,
      }),
    );
  }, [availableCategories]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="container py-12 md:py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="brand-heading text-3xl md:text-4xl">
            Popular <span className="text-brand-red">Categories</span>
          </h2>
          <p className="text-muted-foreground mt-2 font-[var(--font-body)]">
            Browse the Telepizza menu by category
          </p>
        </div>
        <Link href="/menu">
          <span className="hidden sm:inline-flex items-center text-brand-red font-[var(--font-accent)] font-bold text-sm hover:underline">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        {categories.map((category, index) => (
          <motion.div
            key={category.menuCategory}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <Link href={`/menu?category=${encodeURIComponent(category.menuCategory)}`}>
              <div className="group relative overflow-hidden rounded-3xl aspect-square border border-border hover:border-brand-red/40 hover:shadow-xl hover:shadow-brand-red/10 transition-all duration-300">
                <img
                  src={category.image}
                  alt={category.name}
                  onError={handleImageError}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/90 via-brand-charcoal/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-brand-gold text-[10px] font-[var(--font-accent)] font-bold uppercase tracking-wider mb-1">
                    {category.accent}
                  </p>
                  <h3 className="font-[var(--font-display)] font-bold text-white text-sm md:text-base leading-tight">
                    {category.name}
                  </h3>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
