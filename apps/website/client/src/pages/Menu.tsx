/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Menu page with expanded beverages & desserts section — these are a proven
   customer strength per real review data (customers consistently praise shakes,
   frappes, and desserts more than main items).
   Categories reordered to surface drinks earlier. */
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Star, Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  menuCategories,
  menuItems,
  type MenuItem,
  type MenuVariant,
} from "@/data/menu-data";

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const { addItem } = useCart();

  const getSelectedVariant = (item: MenuItem): MenuVariant | undefined => {
    if (!item.variants?.length) return undefined;

    const selectedLabel = selectedVariants[item.id];

    return (
      item.variants.find((variant) => variant.label === selectedLabel) ??
      item.variants[0]
    );
  };

  const getItemPrice = (item: MenuItem): number | undefined =>
    getSelectedVariant(item)?.price ?? item.price;

  const handleAddItem = (item: MenuItem) => {
    const selectedVariant = getSelectedVariant(item);
    const price = selectedVariant?.price ?? item.price;

    if (price === undefined) return;

    const variantId = selectedVariant
      ? selectedVariant.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : null;

    addItem({
      id: variantId ? `${item.id}-${variantId}` : item.id,
      name: item.name,
      price,
      category: item.category,
      variant: selectedVariant?.label,
      image: item.image,
      description: item.description,
    });
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img
          src="/images/deals-section_ee7752d9.jpg"
          alt="Menu"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/90 via-brand-charcoal/50 to-brand-charcoal/30" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="font-[var(--font-display)] font-extrabold text-4xl md:text-6xl tracking-tight"
          >
            Our Menu
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mt-4 text-lg text-white/80 font-[var(--font-body)] max-w-md"
          >
            Fire up your craving — pizzas, burgers, pasta & our signature shakes
          </motion.p>
        </div>
      </section>

      {/* Reviews Proof-Point Banner */}
      <section className="bg-brand-cream-dark/30 border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-3 justify-center flex-wrap">
            <Star className="w-5 h-5 text-brand-gold fill-brand-gold" />
            <span className="text-sm font-[var(--font-accent)] font-medium text-brand-charcoal">
              "Beverages, shakes, and frappes are outstanding"
            </span>
            <span className="text-xs text-muted-foreground">— based on 642+ real Google reviews</span>
          </div>
        </div>
      </section>

      {/* Search & Categories */}
      <section className="sticky top-[72px] z-30 bg-brand-cream border-b border-border">
        <div className="container py-4">
          {/* Search */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-border"
            />
          </div>
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {menuCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-[var(--font-accent)] font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  activeCategory === cat
                    ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                    : "bg-white text-brand-charcoal hover:bg-brand-cream-dark border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <section className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-border hover:border-brand-red/30 hover:shadow-xl hover:shadow-brand-red/5 transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                  <span className="bg-brand-red text-white text-xs font-[var(--font-accent)] font-bold px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                  {item.badge === "Signature" && (
                    <span className="bg-brand-gold text-brand-charcoal text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Signature
                    </span>
                  )}
                  {item.badge && item.badge !== "Signature" && (
                    <span className="bg-brand-gold text-brand-charcoal text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col flex-1 p-5">
                <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description}
                </p>

                {item.variants && item.variants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.variants.map((variant) => {
                      const selectedVariant = getSelectedVariant(item);
                      const isSelected =
                        selectedVariant?.label === variant.label;

                      return (
                        <button
                          key={variant.label}
                          type="button"
                          onClick={() =>
                            setSelectedVariants((current) => ({
                              ...current,
                              [item.id]: variant.label,
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-[var(--font-accent)] font-semibold transition-all ${
                            isSelected
                              ? "border-brand-red bg-brand-red text-white"
                              : "border-border bg-white text-brand-charcoal hover:border-brand-red/40"
                          }`}
                        >
                          {variant.label}
                          <span className="ml-1 opacity-80">
                            Rs {variant.price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-[var(--font-accent)] font-bold text-xl text-brand-red">
                    Rs {getItemPrice(item)?.toLocaleString() ?? "Unavailable"}
                  </span>
                  <Button
                    onClick={() => handleAddItem(item)}
                    size="sm"
                    className="bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-accent)] font-semibold rounded-xl transition-all active:scale-95 shadow-md shadow-brand-red/20"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg font-[var(--font-display)]">No items found</p>
          </div>
        )}
      </section>
    </div>
  );
}
