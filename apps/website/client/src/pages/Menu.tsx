import { useEffect, useMemo, useRef, useState } from "react";

import { motion } from "framer-motion";

import { AlertCircle, Plus, RefreshCw, Search, UtensilsCrossed } from "lucide-react";

import { Link, useSearch } from "wouter";

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

import type { MenuItem, MenuProductGroup } from "@/lib/telepizza-types";

import { isPizzaFamily } from "@/data/cart-config";

import { formatMenuPriceLabel } from "@/lib/menu-utils";

import { ProductBadge } from "@/components/menu/ProductBadge";
import { FavoriteHeartButton } from "@/components/menu/FavoriteHeartButton";



export default function Menu() {

  const searchString = useSearch();

  const {

    groups,

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  /** Selected sellable SKU id per product family — sizes are separate SKUs, not a price matrix. */
  const [selectedSkus, setSelectedSkus] = useState<Record<string, string>>({});

  const addMenuItem = useAddMenuItem();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {

    setActiveCategory(initialCategory);

  }, [initialCategory]);



  const getSelectedSku = (group: MenuProductGroup): MenuItem | undefined => {

    const selectedId = selectedSkus[group.productGroupSlug];

    return group.options.find((option) => option.id === selectedId) ?? group.options[0];

  };



  const getGroupPrice = (group: MenuProductGroup): number | undefined =>

    getSelectedSku(group)?.price;



  const handleAddGroup = (group: MenuProductGroup) => {

    const sku = getSelectedSku(group);

    if (sku) addMenuItem(sku);

  };



  const filteredGroups = groups.filter((group) => {

    const matchesCategory = activeCategory === "All" || group.category === activeCategory;

    const matchesSearch = group.name.toLowerCase().includes(debouncedSearch.toLowerCase());

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

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />

            <Input

              id="menu-search"

              type="search"

              placeholder="Search menu..."

              aria-label="Search menu items"

              ref={searchInputRef}

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              className="pl-10 bg-white border-border"

            />

          </div>

          <p className="sr-only" aria-live="polite">
            {debouncedSearch
              ? filteredGroups.length === 0
                ? `No menu items match ${debouncedSearch}.`
                : `${filteredGroups.length} menu item${filteredGroups.length === 1 ? "" : "s"} match ${debouncedSearch}.`
              : `${filteredGroups.length} menu item${filteredGroups.length === 1 ? "" : "s"} shown.`}
          </p>



          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">

            {availableCategories.map((cat) => (

              <button

                key={cat}

                type="button"

                onClick={() => setActiveCategory(cat)}

                aria-pressed={activeCategory === cat}

                className={`min-h-11 px-4 py-2.5 rounded-full text-sm font-[var(--font-accent)] font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${

                  activeCategory === cat

                    ? "bg-brand-red-dark text-white shadow-md shadow-brand-red/25"

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



          {!isLoading && (source === "supabase" || source === "api") && !usingFallback && (

            <p className="mt-3 text-xs text-brand-charcoal/70 font-[var(--font-accent)]">

              Live menu loaded from {source === "api" ? "API" : "Supabase"} ({groups.length} products)

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

        ) : filteredGroups.length === 0 ? (

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

                  searchInputRef.current?.focus();

                }}

                className="rounded-2xl"

              >

                Clear filters

              </Button>

            </EmptyContent>

          </Empty>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {filteredGroups.map((group) => (

              <motion.div

                key={group.productGroupSlug}

                initial={false}

                className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-border hover:border-brand-red/30 hover:shadow-xl hover:shadow-brand-red/5 transition-all duration-300"

              >

                <div className="relative aspect-[4/3] overflow-hidden">

                  <img

                    src={group.image}

                    alt={group.name}

                    onError={handleImageError}

                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"

                  />

                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">

                    {group.badge && <ProductBadge badge={group.badge} />}

                  </div>

                  <div className="absolute top-3 right-3">
                    <FavoriteHeartButton item={getSelectedSku(group) ?? group.options[0]} />
                  </div>

                </div>

                <div className="flex flex-col flex-1 p-5">

                  <p className="text-sm uppercase tracking-wider text-brand-charcoal font-[var(--font-accent)] font-bold mb-1">

                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-red-dark align-middle" aria-hidden />

                    {group.category}

                  </p>

                  <Link href={`/menu/${encodeURIComponent(group.productGroupSlug)}`}>
                    <h2 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-1 hover:text-brand-red-dark">

                      {group.name}

                    </h2>
                  </Link>

                  <p className="text-sm text-brand-charcoal mb-3 line-clamp-2">

                    {group.description}

                  </p>



                  {group.options.length > 1 && (

                    <div className="flex flex-wrap gap-2 mb-4">

                      {group.options.map((option) => {

                        const isSelected = getSelectedSku(group)?.id === option.id;



                        return (

                          <button

                            key={option.id}

                            type="button"

                            disabled={option.available === false}

                            aria-pressed={isSelected}

                            aria-label={`${option.sizeLabel ?? option.name}, Rs ${(option.price ?? 0).toLocaleString()}`}

                            onClick={() =>

                              setSelectedSkus((current) => ({

                                ...current,

                                [group.productGroupSlug]: option.id,

                              }))

                            }

                            className={`rounded-lg border min-h-11 px-3 py-2 text-sm font-[var(--font-accent)] font-semibold transition-all disabled:opacity-50 ${

                              isSelected

                                ? "border-[#B5121B] bg-[#B5121B] text-white"

                                : "border-border bg-white text-[#1F1F1F] hover:border-brand-red/40"

                            }`}

                          >

                            <span>

                              {option.sizeLabel ?? option.name}

                              {" · "}

                              Rs {(option.price ?? 0).toLocaleString()}

                            </span>

                          </button>

                        );

                      })}

                    </div>

                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">

                    <span className="font-[var(--font-accent)] font-bold text-xl text-brand-red-dark">

                      {formatMenuPriceLabel(group, getGroupPrice(group))}

                    </span>

                    <div className="flex items-center gap-2">
                    <Link href={`/menu/${encodeURIComponent(group.productGroupSlug)}`}>
                      <Button variant="ghost" size="sm" className="rounded-xl text-brand-red-dark min-h-11">
                        View
                      </Button>
                    </Link>
                    <Button

                      onClick={() => handleAddGroup(group)}

                      size="sm"

                      className="bg-brand-red-dark hover:bg-brand-red text-white font-[var(--font-accent)] font-semibold rounded-xl min-h-11 transition-all active:scale-95 shadow-md shadow-brand-red/20"

                    >

                      <Plus className="w-4 h-4 mr-1" aria-hidden />

                      {isPizzaFamily(group) ? "Customize" : "Add"}

                    </Button>
                    </div>

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

