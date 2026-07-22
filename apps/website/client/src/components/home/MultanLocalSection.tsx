import { motion } from "framer-motion";
import { Clock, Construction, MapPin, Phone, Truck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/contexts/BranchContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Multan-first local brand section — no citywide delivery claims.
 */
export function MultanLocalSection() {
  const { allBranches, selectedBranch } = useBranch();
  const reduced = usePrefersReducedMotion();
  const operating = allBranches.filter((b) => b.status === "operating");
  const comingSoon = allBranches.filter((b) => b.status === "coming-soon");

  return (
    <section
      className="py-14 md:py-20 bg-brand-cream"
      aria-labelledby="multan-local-heading"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-10">
          <h2 id="multan-local-heading" className="brand-heading text-3xl md:text-4xl">
            Built for <span className="text-brand-red">Multan</span>
          </h2>
          <p className="mt-3 text-muted-foreground font-[var(--font-body)]">
            A Multan-first digital food brand with local delivery focus from our operating branch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {operating.map((branch, i) => (
              <motion.article
                key={branch.id}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: reduced ? 0 : i * 0.06 }}
                className="card-lift rounded-3xl border border-border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl brand-gradient">
                    <MapPin className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal">
                      {branch.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{branch.address}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Phone className="h-4 w-4 text-brand-gold" aria-hidden />
                        {branch.phone}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Clock className="h-4 w-4 text-brand-gold" aria-hidden />
                        {branch.hours}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}

            {comingSoon.map((branch) => (
              <motion.article
                key={branch.id}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-dashed border-border bg-white/70 p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                    <Construction className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal/80">
                      {branch.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{branch.address}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-xs font-bold text-brand-gold">
                      Coming soon
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <aside className="rounded-3xl border border-brand-red/15 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/10">
              <Truck className="h-6 w-6 text-brand-red" aria-hidden />
            </div>
            <h3 className="mt-4 font-[var(--font-display)] font-bold text-xl text-brand-charcoal">
              Local delivery focus
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Order from {selectedBranch.shortName} for Multan delivery and pickup. We only list
              branches and service areas we currently support — no citywide claims.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/branches">
                <Button className="btn-press rounded-xl bg-brand-red hover:bg-brand-red-dark text-white font-semibold">
                  View branches
                </Button>
              </Link>
              <Link href="/menu">
                <Button
                  variant="outline"
                  className="btn-press rounded-xl border-brand-red/25 text-brand-red hover:bg-brand-red hover:text-white"
                >
                  Order nearby
                </Button>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
