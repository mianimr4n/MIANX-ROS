import { motion } from "framer-motion";
import {
  ChevronRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PizzaHeroScene } from "@/components/home/PizzaHeroScene";
import { useBranch } from "@/contexts/BranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { BRAND } from "@/lib/brand";
import { getItemsByIds } from "@/lib/menu-utils";

const TRUST = [
  { icon: UtensilsCrossed, label: "Freshly prepared" },
  { icon: ShieldCheck, label: "Secure checkout" },
  { icon: Sparkles, label: "Live order updates" },
  { icon: Truck, label: "Multan delivery" },
  { icon: MapPin, label: "AI-assisted support" },
] as const;

/**
 * Flagship homepage hero — Multan-first AI positioning with CSS 3D pizza scene.
 * Critical content is text + CTA; the visual is progressive enhancement.
 */
export function ExperienceHero() {
  const { selectedBranch } = useBranch();
  const { items } = useMenuCatalog();
  const reduced = usePrefersReducedMotion();
  const heroPizza =
    getItemsByIds(items, ["tele-special", "peri-peri", "crown-crust"])[0] ??
    items.find((i) => (i.category ?? "").toLowerCase().includes("pizza"));

  const imageSrc = heroPizza?.image ?? "/images/menu-pizza.jpg";

  return (
    <section
      className="relative overflow-hidden -mt-[64px] md:-mt-[80px] pt-[64px] md:pt-[80px] min-h-[min(92svh,920px)] bg-brand-charcoal"
      aria-labelledby="experience-hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-[64px] md:top-[80px] z-20 h-1 brand-stripe"
        aria-hidden
      />

      {/* Atmospheric background — CSS only, no blocking assets */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(227,30,36,0.35)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(245,184,0,0.22)_0%,transparent_45%),linear-gradient(160deg,#1F1F1F_0%,#2A1515_55%,#1F1F1F_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-brand-red/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 container grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 lg:py-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.55 }}
          className="max-w-2xl"
        >
          <p className="font-[var(--font-display)] font-black text-3xl sm:text-4xl text-white leading-none tracking-tight">
            {BRAND.name}
          </p>
          <p className="mt-2 text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs sm:text-sm">
            Multan-first · Powered by {BRAND.poweredBy}
          </p>

          <h1
            id="experience-hero-heading"
            className="mt-5 font-[var(--font-display)] font-extrabold text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] text-white leading-[1.08] tracking-tight"
          >
            Multan’s Pizza Experience, Powered by AI.
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/80 font-[var(--font-body)] max-w-xl leading-relaxed">
            Freshly made Telepizza, faster ordering and smarter service — powered by {BRAND.poweredBy}.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs sm:text-sm text-white/85">
            <MapPin className="h-3.5 w-3.5 text-brand-gold shrink-0" aria-hidden />
            <span>
              {selectedBranch.shortName}, Multan · Open {selectedBranch.hours}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/menu">
              <Button className="btn-press rounded-2xl bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-display)] font-bold text-base px-7 py-6 shadow-xl shadow-brand-red/35">
                Order Now
                <ChevronRight className="w-5 h-5 ml-2" aria-hidden />
              </Button>
            </Link>
            <Link href="/menu">
              <Button
                variant="outline"
                className="btn-press rounded-2xl bg-white/10 border-brand-gold/50 text-white font-[var(--font-display)] font-bold text-base px-7 py-6 hover:bg-brand-gold hover:text-brand-charcoal hover:border-brand-gold"
              >
                Explore Menu
              </Button>
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Trust highlights">
            {TRUST.map((item) => (
              <li
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white/80"
              >
                <item.icon className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.08 }}
          className="relative"
        >
          <PizzaHeroScene imageSrc={imageSrc} imageAlt={heroPizza?.name ?? "Telepizza"} />
        </motion.div>
      </div>
    </section>
  );
}
