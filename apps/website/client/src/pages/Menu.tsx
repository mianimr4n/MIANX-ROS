import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import { AlertCircle, Plus, RefreshCw, Search, UtensilsCrossed } from "lucide-react";

import { useSearch } from "wouter";

import { useAddMenuItem } from "@/hooks/useAddMenuItem";

import { useMenuCatalog } from "@/contexts/MenuCatalogContext";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Spinner } from "@/components/ui/spinner";

import {

  Empty,

  EmptyContent,

  EmptyDescription,

  EmptyHeader,

  EmptyMedia,

  EmptyTitle,

} from "@/components/ui/empty";

import { handleImageError } from "@/lib/image-fallback";

import type { MenuItem, MenuVariant } from "@/lib/telepizza-types";

import { isPizzaItem } from "@/data/cart-config";

import { ProductBadge } from "@/components/menu/ProductBadge";



export default function Menu() {

  const searchString = useSearch();

  const {

    items,

    availableCategories,

    isLoading,

    error,

    source,

    usingFallback,

    reloadCatalog,

  } = useMenuCatalog();



  const initialCategory = useMemo(() => {

    const params = new URLSearchParams(searchString);

    const category = params.get("category");

    return category && availableCategories.includes(category) ? category : "All";

  }, [searchString, availableCategories]);



  const [activeCategory, setActiveCategory] = useState(initialCategory);

  const [search, setSearch] = useState("");

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const addMenuItem = useAddMenuItem();



  useEffect(() => {

    setActiveCategory(initialCategory);

  }, [initialCategory]);



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

    addMenuItem(item, getSelectedVariant(item)?.label);

  };



  const filteredItems = items.filter((item) => {

    const matchesCategory = activeCategory === "All" || item.category === activeCategory;

    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;

  });



  return (

    <div className="min-h-screen bg-background">

      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">

        <img

          src="/images/products/signature-pizza.jpg"

          alt="Menu"

          onError={handleImageError}

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



      <section className="bg-brand-cream border-b border-border">

        <div className="container py-4">

          <p className="text-center text-sm font-[var(--font-accent)] font-medium text-brand-charcoal">

            Verified Telepizza menu — prices and items from our canonical catalog

          </p>

        </div>

      </section>



      <section className="sticky top-[72px] z-30 bg-brand-cream border-b border-border">

        <div className="container py-4">

          <div className="relative max-w-md mb-4">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input

              placeholder="Search menu..."

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              className="pl-10 bg-white border-border"

            />

          </div>



          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">

            {availableCategories.map((cat) => (

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



          {isLoading && (

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground font-[var(--font-accent)]">

              <Spinner className="size-3.5" />

              Loading live menu from Supabase...

            </div>

          )}



          {!isLoading && source === "supabase" && !usingFallback && (

            <p className="mt-3 text-xs text-brand-charcoal/70 font-[var(--font-accent)]">

              Live menu loaded from Supabase ({items.length} items)

            </p>

          )}



          {!isLoading && usingFallback && error && (

            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-brand-red/20 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-2 text-sm text-brand-charcoal">

                <AlertCircle className="mt-0.5 size-4 shrink-0 text-brand-red" />

                <div>

                  <p className="font-[var(--font-accent)] font-semibold">Showing verified offline menu</p>

                  <p className="text-xs text-muted-foreground">{error}</p>

                </div>

              </div>

              <Button

                type="button"

                variant="outline"

                size="sm"

                onClick={() => void reloadCatalog()}

                className="rounded-xl border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white"

              >

                <RefreshCw className="mr-1 size-3.5" />

                Retry

              </Button>

            </div>

          )}

        </div>

      </section>



      <section className="container py-8">

        {isLoading ? (

          <div className="flex flex-col items-center justify-center gap-4 py-24">

            <Spinner className="size-8 text-brand-red" />

            <p className="text-muted-foreground font-[var(--font-accent)]">Loading menu items...</p>

          </div>

        ) : filteredItems.length === 0 ? (

          <Empty className="border border-dashed border-border bg-white py-20">

            <EmptyHeader>

              <EmptyMedia variant="icon">

                <UtensilsCrossed />

              </EmptyMedia>

              <EmptyTitle>No items found</EmptyTitle>

              <EmptyDescription>

                {search.trim()

                  ? `No menu items match "${search}". Try another search or category.`

                  : "No items are available in this category right now."}

              </EmptyDescription>

            </EmptyHeader>

            <EmptyContent>

              <Button

                type="button"

                variant="outline"

                onClick={() => {

                  setSearch("");

                  setActiveCategory("All");

                }}

                className="rounded-2xl"

              >

                Clear filters

              </Button>

            </EmptyContent>

          </Empty>

        ) : (

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

                    onError={handleImageError}

                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"

                  />

                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">

                    {item.badge && <ProductBadge badge={item.badge} />}

                  </div>

                </div>

                <div className="flex flex-col flex-1 p-5">

                  <p className="text-[11px] uppercase tracking-wider text-brand-red font-[var(--font-accent)] font-bold mb-1">

                    {item.category}

                  </p>

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

                        const isSelected = selectedVariant?.label === variant.label;



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

                      {isPizzaItem(item) ? "Customize" : "Add"}

                    </Button>

                  </div>

                </div>

              </motion.div>

            ))}

          </div>

        )}

      </section>

    </div>

  );

}

