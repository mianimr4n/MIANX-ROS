import { motion } from "framer-motion";
import {
  ChefHat,
  Headphones,
  Route,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    icon: ShoppingBag,
    title: "Smart Ordering",
    body: "Helps customers find products, deals and customizations.",
  },
  {
    icon: ChefHat,
    title: "Kitchen Flow",
    body: "Keeps the order journey clear from confirmation to preparation.",
  },
  {
    icon: Sparkles,
    title: "Quality Check",
    body: "Coordinates handoffs so status stays easy to understand.",
  },
  {
    icon: Route,
    title: "Delivery Updates",
    body: "Helps route updates and makes tracking clearer for customers.",
  },
  {
    icon: Headphones,
    title: "Customer Care",
    body: "Connects customers to support through the right channel.",
  },
] as const;

/**
 * Honest intelligent-service journey — no autonomous-agent claims.
 */
export function AiJourneySection() {
  const reduced = usePrefersReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-14 md:py-20 bg-brand-charcoal text-white"
      aria-labelledby="ai-journey-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(227,30,36,0.28)_0%,transparent_55%)]"
        aria-hidden
      />
      <div className="container relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-10 md:mb-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-gold/35 bg-brand-gold/10 px-3 py-1 text-xs font-semibold text-brand-gold uppercase tracking-wider">
            Powered by {BRAND.poweredBy}
          </p>
          <h2 id="ai-journey-heading" className="mt-4 font-[var(--font-display)] font-extrabold text-3xl md:text-4xl">
            Your order, coordinated intelligently
          </h2>
          <p className="mt-3 text-white/70 font-[var(--font-body)]">
            Designed to assist Multan customers from browse to delivery — without replacing the kitchen team.
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: reduced ? 0 : index * 0.06, duration: reduced ? 0 : 0.35 }}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              {index < STEPS.length - 1 ? (
                <span
                  className="pointer-events-none absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-brand-gold/60 to-transparent lg:block"
                  aria-hidden
                />
              ) : null}
              <div className="mb-4 flex items-center gap-3">
                <span className="relative flex h-11 w-11 items-center justify-center rounded-xl brand-gradient shadow-lg shadow-brand-red/30">
                  {!reduced ? (
                    <span className="xp-pulse-ring absolute inset-0 rounded-xl border border-brand-gold/50" aria-hidden />
                  ) : null}
                  <step.icon className="relative h-5 w-5 text-white" aria-hidden />
                </span>
                <span className="text-xs font-bold text-brand-gold/80 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-[var(--font-display)] font-bold text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
