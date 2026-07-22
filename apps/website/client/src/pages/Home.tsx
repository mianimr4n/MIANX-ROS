/* Telepizza Pakistan — AI Kitchen Experience homepage */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Flame,
  Shield,
  Truck,
} from "lucide-react";
import { Link } from "wouter";
import { useBranch } from "@/contexts/BranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { getDisplayPrice, getItemsByIds } from "@/lib/menu-utils";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/menu/DealCard";
import { ProductCard } from "@/components/menu/ProductCard";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { ExperienceHero } from "@/components/home/ExperienceHero";
import { AiJourneySection } from "@/components/home/AiJourneySection";
import { MultanLocalSection } from "@/components/home/MultanLocalSection";
import { MenuSectionRow } from "@/components/home/MenuSectionRow";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { VERIFIED_DEAL_IDS } from "@/lib/brand";

const FEATURED_PIZZA_IDS = [
  "tele-special",
  "peri-peri",
  "bihari-kabab",
  "crown-crust",
  "chicago-extreme",
  "kababish",
];
const FEATURED_BURGER_SANDWICH_IDS = [
  "zinger-burger",
  "patty-burger",
  "special-sandwich",
  "crunchy-sandwich",
];
const FEATURED_WINGS_IDS = ["fried-crispy-wings", "bbq-wings", "creamo-wings"];
const FEATURED_PASTA_SIDES_IDS = [
  "crunchy-pasta",
  "special-pasta",
  "loaded-fries",
  "chicken-tender-strips",
];
const POPULAR_MENU_IDS = ["tele-special", "zinger-burger", "behari-roll", "peri-peri", "crown-crust", "family-deal"];

export default function Home() {
  const { items } = useMenuCatalog();
  const { selectedBranch } = useBranch();
  const reduced = usePrefersReducedMotion();

  const todaysDeals = useMemo(() => getItemsByIds(items, [...VERIFIED_DEAL_IDS]), [items]);
  const popularItems = useMemo(() => getItemsByIds(items, POPULAR_MENU_IDS), [items]);

  return (
    <div className="min-h-screen bg-background page-enter">
      <ExperienceHero />

      <CategoryStrip />

      <MultanLocalSection />

      {/* Popular menu — real catalog only */}
      <section className="container py-12 md:py-16" aria-labelledby="popular-menu-heading">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h2 id="popular-menu-heading" className="brand-heading text-3xl md:text-4xl">
              Popular <span className="text-brand-red">on the menu</span>
            </h2>
            <p className="text-muted-foreground mt-2 font-[var(--font-body)]">
              Real Telepizza favorites with verified branch prices
            </p>
          </div>
          <Link href="/menu">
            <Button
              variant="outline"
              className="hidden sm:flex rounded-2xl border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white"
            >
              View Full Menu
              <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularItems.map((item, index) => (
            <ProductCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </section>

      {/* Today's Deals */}
      <section className="brand-gradient-soft py-14 md:py-16" aria-labelledby="deals-heading">
        <div className="container">
          <div className="text-center mb-10">
            <h2 id="deals-heading" className="brand-heading text-3xl md:text-5xl">
              Today&apos;s <span className="text-brand-red">Deals</span>
            </h2>
            <p className="text-muted-foreground mt-3 font-[var(--font-body)] max-w-xl mx-auto">
              Verified Telepizza meal combos at official branch prices
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {todaysDeals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
          </div>
        </div>
      </section>

      <AiJourneySection />

      <MenuSectionRow
        title="Featured"
        highlight="Pizzas"
        subtitle="Signature and specialty pizzas from our verified menu"
        itemIds={FEATURED_PIZZA_IDS}
        viewAllCategory="Signature Pizzas"
      />

      <MenuSectionRow
        title="Crispy"
        highlight="Wings"
        subtitle="Fried & crispy, BBQ, Creamo, oven baked, and flaming wings"
        itemIds={FEATURED_WINGS_IDS}
        viewAllCategory="Wings"
        dark
      />

      <MenuSectionRow
        title="Burgers &"
        highlight="Sandwiches"
        subtitle="Zinger, patty burgers, and loaded sandwiches from our verified menu"
        itemIds={FEATURED_BURGER_SANDWICH_IDS}
        viewAllCategory="Burgers"
      />

      <MenuSectionRow
        title="Pasta &"
        highlight="Sides"
        subtitle="Crunchy pasta, flaming pasta, loaded fries, tenders, and more"
        itemIds={FEATURED_PASTA_SIDES_IDS}
        viewAllCategory="Pasta"
        dark
      />

      {/* Why Telepizza */}
      <section className="container py-14 md:py-16" aria-labelledby="why-heading">
        <div className="text-center mb-10">
          <h2 id="why-heading" className="brand-heading text-3xl md:text-4xl">
            Why <span className="text-brand-red">Telepizza</span>
          </h2>
          <p className="text-muted-foreground mt-2 font-[var(--font-body)] max-w-xl mx-auto">
            Fresh food, verified prices, and smarter Multan service
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Truck,
              title: "Order Your Way",
              desc: `Call ${selectedBranch.phone} or order online from ${selectedBranch.shortName}. Open ${selectedBranch.hours}.`,
            },
            {
              icon: Flame,
              title: "Bold Telepizza Flavors",
              desc: "Tele Special, Zinger Burger, Crown Crust, Behari Roll, and more from our verified menu.",
            },
            {
              icon: Shield,
              title: "Fresh & Trustworthy",
              desc: "Made to order with verified prices — AI-assisted ordering that stays honest and clear.",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduced ? 0 : i * 0.08 }}
              className="card-lift rounded-2xl bg-white border border-border p-8"
            >
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center mb-5">
                <feature.icon className="w-7 h-7 text-white" aria-hidden />
              </div>
              <h3 className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="brand-gradient py-14">
        <div className="container text-center">
          <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-white mb-4">
            Hungry? Let&apos;s Fix That.
          </h2>
          <p className="text-white/85 mb-8 max-w-md mx-auto">
            Call us or order online from {selectedBranch.shortName} — Multan&apos;s AI-powered pizza experience.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/menu">
              <Button className="btn-press rounded-2xl bg-white text-brand-red hover:bg-brand-cream font-[var(--font-display)] font-bold px-8 py-6 shadow-lg">
                Browse Menu
              </Button>
            </Link>
            <a href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`}>
              <Button
                variant="outline"
                className="btn-press rounded-2xl border-white/30 text-white hover:bg-white/10 font-[var(--font-display)] font-bold px-8 py-6"
              >
                Call {selectedBranch.phone}
              </Button>
            </a>
          </div>
          <p className="mt-6 text-xs text-white/60">
            From Rs {getDisplayPrice(popularItems[0])?.toLocaleString() ?? "—"} · Powered by Mianx.ai
          </p>
        </div>
      </section>
    </div>
  );
}
