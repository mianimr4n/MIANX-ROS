/* Telepizza Pakistan — brand-forward homepage driven by canonical menu-data.ts */
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  Construction,
  Flame,
  MapPin,
  Phone,
  Plus,
  Shield,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import { Link } from "wouter";
import { useBranch } from "@/contexts/BranchContext";
import { menuItems } from "@/data/menu-data";
import { getDisplayPrice, getItemsByIds } from "@/lib/menu-utils";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/menu/DealCard";
import { ProductCard } from "@/components/menu/ProductCard";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { HeroSlider } from "@/components/home/HeroSlider";
import { MenuSectionRow } from "@/components/home/MenuSectionRow";

const TODAYS_DEAL_IDS = ["family-deal", "pizza-fest", "pair-deal", "knock-out-deal"];
const FEATURED_PIZZA_IDS = [
  "tele-special",
  "peri-peri",
  "bihari-kabab",
  "crown-crust",
  "chicago-extreme",
  "kababish",
];
const FEATURED_BURGER_SANDWICH_IDS = ["patty-burger", "special-sandwich", "crunchy-sandwich"];
const FEATURED_BROAST_IDS = ["quarter-broast", "half-broast", "full-broast"];
const FEATURED_PASTA_SIDES_IDS = ["crunchy-pasta", "loaded-fries", "chicken-tender-strips", "nuggets"];
const CUSTOMER_FAVORITE_IDS = ["tele-special", "patty-burger", "behari-roll"];

const todaysDeals = getItemsByIds(menuItems, TODAYS_DEAL_IDS);
const customerFavorites = getItemsByIds(menuItems, CUSTOMER_FAVORITE_IDS);

export default function Home() {
  const { selectedBranch, allBranches } = useBranch();
  const operatingBranches = allBranches.filter((branch) => branch.status === "operating");
  const comingSoonBranches = allBranches.filter((branch) => branch.status === "coming-soon");

  const mockupDeal = todaysDeals[0];
  const mockupItems = customerFavorites.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <HeroSlider />

      {/* Quick branch strip */}
      <section className="bg-white border-b border-border">
        <div className="container py-5">
          <div className="flex flex-wrap justify-center gap-8 md:gap-14">
            {[
              { value: selectedBranch.hours, label: "Opening Hours", icon: Clock },
              { value: selectedBranch.phone, label: "Call to Order", icon: Phone },
              { value: selectedBranch.city, label: "Serving", icon: MapPin },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-red/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-brand-red" />
                </div>
                <div>
                  <div className="font-[var(--font-display)] font-bold text-base text-brand-charcoal">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground text-xs">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CategoryStrip />

      {/* Today's Deals */}
      <section className="brand-gradient-soft py-14 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="brand-heading text-3xl md:text-5xl">
              Today&apos;s <span className="text-brand-red">Deals</span>
            </h2>
            <p className="text-muted-foreground mt-3 font-[var(--font-body)] max-w-xl mx-auto">
              Verified Telepizza meal combos — bright, bold, and ready to order
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {todaysDeals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
          </div>
        </div>
      </section>

      <MenuSectionRow
        title="Featured"
        highlight="Pizzas"
        subtitle="Signature and specialty pizzas from our verified menu"
        itemIds={FEATURED_PIZZA_IDS}
        viewAllCategory="Signature Pizzas"
      />

      <MenuSectionRow
        title="Crispy"
        highlight="Broast"
        subtitle="Quarter, half, and full broast combos with fries and dips"
        itemIds={FEATURED_BROAST_IDS}
        viewAllCategory="Broast"
        dark
      />

      <MenuSectionRow
        title="Burgers &"
        highlight="Sandwiches"
        subtitle="Patty burgers and loaded sandwiches from our verified menu"
        itemIds={FEATURED_BURGER_SANDWICH_IDS}
        viewAllCategory="Burgers"
      />

      <MenuSectionRow
        title="Pasta &"
        highlight="Sides"
        subtitle="Crunchy pasta, loaded fries, tenders, and more"
        itemIds={FEATURED_PASTA_SIDES_IDS}
        viewAllCategory="Pasta"
        dark
      />

      {/* Customer Favorites */}
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="brand-heading text-3xl md:text-4xl">
              Customer <span className="text-brand-red">Favorites</span>
            </h2>
            <p className="text-muted-foreground mt-2 font-[var(--font-body)]">
              Top picks from our verified menu
            </p>
          </div>
          <Link href="/menu">
            <Button variant="outline" className="hidden sm:flex rounded-2xl border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white">
              View Full Menu
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {customerFavorites.map((item, index) => (
            <ProductCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </section>

      {/* Why Telepizza */}
      <section className="container py-14 md:py-16">
        <div className="text-center mb-10">
          <h2 className="brand-heading text-3xl md:text-4xl">
            Why <span className="text-brand-red">Telepizza</span>
          </h2>
          <p className="text-muted-foreground mt-2 font-[var(--font-body)] max-w-xl mx-auto">
            Fresh food, verified prices, and bold flavors you can trust
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
              desc: "Tele Special, Behari Roll, Crown Crust, Broast, and more from our verified menu.",
            },
            {
              icon: Shield,
              title: "Fresh & Hot",
              desc: "Made to order with verified prices — no fake deals or invented savings on this site.",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-white border border-border p-8 hover:border-brand-red/30 hover:shadow-xl hover:shadow-brand-red/5 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center mb-5">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Branches */}
      <section className="bg-brand-cream py-14 md:py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="brand-heading text-3xl md:text-4xl">
              Our <span className="text-brand-red">Branches</span>
            </h2>
            <p className="text-muted-foreground mt-2 font-[var(--font-body)]">
              Currently serving Multan from Royal Orchard — new branch coming soon
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {operatingBranches.map((branch, i) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-3xl border-2 p-8 transition-all ${
                  selectedBranch.id === branch.id
                    ? "border-brand-red bg-white shadow-xl shadow-brand-red/10"
                    : "border-border bg-white hover:border-brand-red/30 hover:shadow-lg"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedBranch.id === branch.id ? "brand-gradient" : "bg-brand-red/10"
                  }`}>
                    <MapPin className={`w-6 h-6 ${selectedBranch.id === branch.id ? "text-white" : "text-brand-red"}`} />
                  </div>
                  <div>
                    <h3 className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal mb-1">
                      {branch.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">{branch.address}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-brand-gold" />
                        <span className="font-[var(--font-accent)] font-semibold">{branch.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-brand-gold" />
                        <span className="font-[var(--font-accent)] font-semibold">{branch.hours}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {comingSoonBranches.map((branch) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl border-2 border-dashed border-brand-cream-dark/50 bg-white/70 p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-cream-dark/40 flex items-center justify-center shrink-0">
                    <Construction className="w-6 h-6 text-brand-charcoal-light" />
                  </div>
                  <div>
                    <h3 className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal/70 mb-1">
                      {branch.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">{branch.address}</p>
                    <span className="inline-flex items-center gap-1.5 bg-brand-gold/15 border border-brand-gold/25 text-brand-gold text-xs font-[var(--font-accent)] font-bold px-3 py-1.5 rounded-full">
                      <Construction className="w-3 h-3" />
                      Coming Soon
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App teaser */}
      <section className="relative overflow-hidden py-16 brand-gradient">
        <div className="container relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-white">
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 mb-4">
                <Star className="w-4 h-4 text-brand-gold" />
                <span className="text-sm font-[var(--font-accent)] font-semibold">Coming Soon</span>
              </div>
              <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-5xl leading-tight">
                Order Faster with the Telepizza App
              </h2>
              <p className="mt-4 text-white/80 max-w-md">
                Skip the call. Track your order in real-time. iOS and Android apps launching soon.
              </p>
              <div className="mt-6 flex gap-3">
                <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/15">
                  <div className="text-[10px] uppercase tracking-wider text-white/50">Soon</div>
                  <div className="font-[var(--font-accent)] font-bold">iOS</div>
                </div>
                <div className="px-5 py-3 bg-white/10 rounded-2xl border border-white/15">
                  <div className="text-[10px] uppercase tracking-wider text-white/50">Soon</div>
                  <div className="font-[var(--font-accent)] font-bold">Android</div>
                </div>
              </div>
            </div>

            <div className="relative w-[260px] h-[520px] bg-brand-charcoal rounded-[36px] border-4 border-white/20 shadow-2xl overflow-hidden shrink-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />
              <div className="pt-9 px-4 h-full bg-gradient-to-b from-brand-charcoal to-brand-charcoal/90">
                <div className="flex items-center justify-between mb-5">
                  <span className="font-[var(--font-display)] font-bold text-white text-sm">Telepizza</span>
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                {mockupDeal && (
                  <div className="rounded-2xl brand-gradient p-4 mb-4">
                    <div className="text-brand-gold text-[10px] font-[var(--font-accent)] font-bold mb-1">DEAL</div>
                    <div className="text-white font-bold text-sm">{mockupDeal.name}</div>
                    <div className="text-white/70 text-[10px] mt-1 line-clamp-2">{mockupDeal.description}</div>
                    <div className="text-white font-extrabold text-lg mt-2">
                      Rs {mockupDeal.price?.toLocaleString()}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {mockupItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="w-10 h-10 bg-brand-red/20 rounded-lg flex items-center justify-center">
                        <Flame className="w-4 h-4 text-brand-red" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-[11px] font-semibold truncate">{item.name}</div>
                        <div className="text-brand-gold text-[10px] font-bold">
                          Rs {getDisplayPrice(item)?.toLocaleString()}
                        </div>
                      </div>
                      <div className="w-5 h-5 bg-brand-red rounded-full flex items-center justify-center">
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="brand-gradient py-14">
        <div className="container text-center">
          <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-white mb-4">
            Hungry? Let&apos;s Fix That.
          </h2>
          <p className="text-white/85 mb-8 max-w-md mx-auto">
            Call us or order online from {selectedBranch.shortName}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/menu">
              <Button className="rounded-2xl bg-white text-brand-red hover:bg-brand-cream font-[var(--font-display)] font-bold px-8 py-6 shadow-lg">
                Browse Menu
              </Button>
            </Link>
            <a href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`}>
              <Button variant="outline" className="rounded-2xl border-white/30 text-white hover:bg-white/10 font-[var(--font-display)] font-bold px-8 py-6">
                Call {selectedBranch.phone}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
