import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Flame } from "lucide-react";
import { Link } from "wouter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { handleImageError } from "@/lib/image-fallback";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { useBranch } from "@/contexts/BranchContext";
import { getItemsByIds } from "@/lib/menu-utils";
import { BRAND, VERIFIED_DEAL_IDS } from "@/lib/brand";

const HERO_DEAL_IDS = VERIFIED_DEAL_IDS;

export function HeroSlider() {
  const { items } = useMenuCatalog();
  const { selectedBranch } = useBranch();
  const heroDeals = useMemo(() => getItemsByIds(items, [...HERO_DEAL_IDS]), [items]);
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!api || heroDeals.length === 0) return;

    const onSelect = () => setActiveIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();

    const timer = window.setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 6000);

    return () => {
      api.off("select", onSelect);
      window.clearInterval(timer);
    };
  }, [api, heroDeals.length]);

  if (heroDeals.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden -mt-[64px] md:-mt-[80px] pt-[64px] md:pt-[80px] min-h-[min(92svh,900px)] bg-brand-charcoal">
      {/* Brand accent stripe */}
      <div className="pointer-events-none absolute inset-x-0 top-[64px] md:top-[80px] z-20 h-1 brand-stripe" aria-hidden />

      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {heroDeals.map((deal) => (
            <CarouselItem key={deal.id}>
              <div className="relative min-h-[min(92svh,900px)]">
                <img
                  src={deal.image}
                  alt={deal.name}
                  onError={handleImageError}
                  className="absolute inset-0 w-full h-full object-cover scale-105 animate-[hero-kenburns_14s_ease-in-out_infinite_alternate]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal via-brand-charcoal/85 to-brand-red/25" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal via-transparent to-brand-charcoal/40" />

                <div className="relative z-10 container min-h-[min(92svh,900px)] flex flex-col justify-end md:justify-center pb-24 md:pb-16 pt-10">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="max-w-2xl"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-red px-3.5 py-1.5 mb-5 shadow-lg shadow-brand-red/40">
                      <Flame className="w-4 h-4 text-brand-gold" />
                      <span className="text-white text-xs sm:text-sm font-[var(--font-accent)] font-semibold">
                        {deal.badge ? `${deal.badge.toUpperCase()} · ` : "HOT · "}
                        Open Daily · {selectedBranch.hours}
                      </span>
                    </div>

                    {/* Brand is the hero signal */}
                    <p className="font-[var(--font-display)] font-black text-4xl sm:text-5xl md:text-6xl text-white leading-none tracking-tight drop-shadow-[0_4px_0_rgba(227,30,36,0.55)]">
                      {BRAND.name}
                    </p>
                    <p className="mt-2 text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.22em] text-xs sm:text-sm">
                      {BRAND.tagline}
                    </p>

                    <h1 className="mt-5 font-[var(--font-display)] font-extrabold text-3xl sm:text-4xl md:text-6xl text-white leading-[1.05] tracking-tight">
                      {deal.name}
                    </h1>
                    <p className="mt-4 text-base md:text-xl text-white/80 font-[var(--font-body)] max-w-xl leading-relaxed">
                      {deal.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 shadow-xl shadow-brand-gold/30">
                      <span className="text-brand-charcoal font-[var(--font-accent)] font-extrabold text-2xl sm:text-3xl">
                        Rs {deal.price?.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <Link href="/menu">
                        <Button className="rounded-2xl bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-display)] font-bold text-base px-7 py-6 shadow-xl shadow-brand-red/35">
                          Order Now
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                      <Link href="/menu?category=Deals">
                        <Button
                          variant="outline"
                          className="rounded-2xl bg-white/10 backdrop-blur-sm border-brand-gold/50 text-white font-[var(--font-display)] font-bold text-base px-7 py-6 hover:bg-brand-gold hover:text-brand-charcoal hover:border-brand-gold"
                        >
                          All Deals
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex left-4 border-white/20 bg-white/10 text-white hover:bg-brand-red hover:text-white hover:border-brand-red" />
        <CarouselNext className="hidden sm:flex right-4 border-white/20 bg-white/10 text-white hover:bg-brand-red hover:text-white hover:border-brand-red" />
      </Carousel>

      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroDeals.map((deal, index) => (
          <button
            key={deal.id}
            type="button"
            aria-label={`Go to ${deal.name}`}
            onClick={() => api?.scrollTo(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeIndex === index ? "w-9 bg-brand-gold" : "w-2.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
