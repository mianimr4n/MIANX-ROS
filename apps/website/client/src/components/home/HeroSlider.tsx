import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
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
import { VERIFIED_DEAL_IDS } from "@/lib/brand";

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
    <section className="relative overflow-hidden -mt-[72px] pt-[72px] min-h-[88vh] bg-brand-charcoal">
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {heroDeals.map((deal) => (
            <CarouselItem key={deal.id}>
              <div className="relative min-h-[88vh]">
                <img
                  src={deal.image}
                  alt={deal.name}
                  onError={handleImageError}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal/95 via-brand-charcoal/75 to-brand-charcoal/30" />
                <div className="relative z-10 container min-h-[88vh] flex flex-col justify-center py-16">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="max-w-2xl"
                  >
                    <div className="inline-flex items-center gap-2 brand-gradient rounded-full px-4 py-2 mb-6 shadow-lg shadow-brand-red/30">
                      <Flame className="w-4 h-4 text-brand-gold" />
                      <span className="text-white text-sm font-[var(--font-accent)] font-semibold">
                        {deal.badge ? `${deal.badge.toUpperCase()} · ` : ""}
                        Open Daily · {selectedBranch.hours}
                      </span>
                    </div>
                    <p className="text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-sm mb-3">
                      Telepizza Pakistan
                    </p>
                    <h1 className="font-[var(--font-display)] font-extrabold text-5xl md:text-7xl text-white leading-[1.05] tracking-tight">
                      {deal.name}
                    </h1>
                    <p className="mt-5 text-lg md:text-xl text-white/75 font-[var(--font-body)] max-w-xl leading-relaxed">
                      {deal.description}
                    </p>
                    <div className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 shadow-xl">
                      <span className="text-brand-red font-[var(--font-accent)] font-extrabold text-3xl">
                        Rs {deal.price?.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <Link href="/menu">
                        <Button className="rounded-2xl bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-display)] font-bold text-base px-8 py-6 shadow-xl shadow-brand-red/30">
                          Order Now
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                      <Link href={`/menu?category=Deals`}>
                        <Button
                          variant="outline"
                          className="rounded-2xl bg-white/10 backdrop-blur-sm border-white/25 text-white font-[var(--font-display)] font-bold text-base px-8 py-6 hover:bg-white/20"
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
        <CarouselPrevious className="left-4 border-white/20 bg-white/10 text-white hover:bg-brand-red hover:text-white" />
        <CarouselNext className="right-4 border-white/20 bg-white/10 text-white hover:bg-brand-red hover:text-white" />
      </Carousel>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroDeals.map((deal, index) => (
          <button
            key={deal.id}
            type="button"
            aria-label={`Go to ${deal.name}`}
            onClick={() => api?.scrollTo(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeIndex === index ? "w-8 bg-brand-red" : "w-2.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
