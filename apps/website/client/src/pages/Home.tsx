/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Updated with branch-aware content and Telepizza Platform messaging. */
import { motion } from "framer-motion";
import { Flame, ChevronRight, Clock, Truck, Star, Shield, Plus, MapPin, Zap, Code2, Bot, BarChart3, ShoppingCart, Phone, Construction } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";

const featuredItems = [
  { id: "f1", name: "Kabab Stuffed Crust", price: 1200, category: "Pizza", image: "/images/menu-pizza_f729e710.jpg" },
  { id: "f2", name: "Injected Broast", price: 375, category: "Burger", image: "/images/menu-burger_bf9b42fb.jpg" },
  { id: "f3", name: "Chicago Extreme Pizza", price: 1500, category: "Pizza", image: "/images/menu-pizza_f729e710.jpg" },
];

const deals = [
  { name: "Family Feast", desc: "2 Large Pizzas + 4 Drinks + Garlic Bread", price: 3500, oldPrice: 4500, image: "/images/deals-section_ee7752d9.jpg" },
  { name: "Couple Special", desc: "1 Medium Pizza + 2 Drinks + Fries", price: 1500, oldPrice: 2000, image: "/images/deals-section_ee7752d9.jpg" },
  { name: "Solo Deal", desc: "1 Regular Pizza + 1 Drink", price: 650, oldPrice: 900, image: "/images/menu-pizza_f729e710.jpg" },
];

export default function Home() {
  const { addItem } = useCart();
  const { selectedBranch, allBranches } = useBranch();
  const operatingBranches = allBranches.filter((branch) => branch.status === "operating");
  const comingSoonBranches = allBranches.filter((branch) => branch.status === "coming-soon");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] overflow-hidden">
        <img
          src="/images/hero-banner_37686ed3.jpg"
          alt="Telepizza Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal/90 via-brand-charcoal/70 to-brand-charcoal/30" />
        <div className="relative z-10 container h-full min-h-[90vh] flex flex-col justify-center">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="inline-flex items-center gap-2 bg-brand-red/20 backdrop-blur-sm border border-brand-red/30 rounded-full px-4 py-2 mb-6">
                <Flame className="w-4 h-4 text-brand-gold" />
                <span className="text-brand-gold text-sm font-[var(--font-accent)] font-medium">
                  Now Delivering Till 2:30 AM
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="font-[var(--font-display)] font-extrabold text-5xl md:text-7xl text-white leading-[1.05] tracking-tight"
            >
              Fire Up
              <br />
              <span className="text-brand-red">Your Craving</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="mt-6 text-lg md:text-xl text-white/70 font-[var(--font-body)] max-w-lg leading-relaxed"
            >
              Fresh dough, premium toppings, and bold flavors — delivered hot to your door from
              {selectedBranch.shortName}, Multan. We don't just deliver pizza — we deliver the good stuff.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link href="/menu">
                <Button className="bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-display)] font-bold text-base px-8 py-6 rounded-xl shadow-xl shadow-brand-red/30 transition-all active:scale-95">
                  Order Now
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`}>
                <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white font-[var(--font-display)] font-bold text-base px-8 py-6 rounded-xl hover:bg-white/20 transition-all active:scale-95">
                  Call to Order
                </Button>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="mt-10 flex flex-wrap gap-6"
            >
              {[
                { icon: Star, label: "4.3 Rating", sub: "642+ Reviews" },
                { icon: Clock, label: "Fast Delivery", sub: "30 min avg" },
                { icon: Shield, label: "Fresh & Hot", sub: "Every time" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <badge.icon className="w-5 h-5 text-brand-gold" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-[var(--font-accent)] font-bold">{badge.label}</div>
                    <div className="text-white/50 text-xs">{badge.sub}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Diagonal Divider */}
        <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
          <div className="absolute bottom-0 w-full h-24 bg-background" style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }} />
        </div>
      </section>

      {/* Quick Stats Strip */}
      <section className="bg-white border-b border-border">
        <div className="container py-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: "Rs 1–5,000", label: "Per Person" },
              { value: selectedBranch.hours, label: "Every Day" },
              { value: "Free Delivery", label: "On Orders Above Rs 1,000" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Menu Items */}
      <section className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-brand-charcoal">
              Customer Favorites
            </h2>
            <p className="text-muted-foreground mt-2 font-[var(--font-body)]">
              The items Multan loves the most
            </p>
          </div>
          <Link href="/menu">
            <Button variant="outline" className="hidden sm:flex border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white">
              View Full Menu
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-white rounded-2xl overflow-hidden border border-border hover:border-brand-red/30 hover:shadow-xl hover:shadow-brand-red/5 transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-brand-red text-white text-xs font-[var(--font-accent)] font-bold px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-2">
                  {item.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-accent)] font-bold text-xl text-brand-red">
                    Rs {item.price.toLocaleString()}
                  </span>
                  <Button
                    onClick={() => addItem({ id: item.id, name: item.name, price: item.price, category: item.category })}
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
      </section>

      {/* Deals Section */}
      <section className="bg-brand-charcoal py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="/images/app-mockup-bg_6f8a25be.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-white">
              Hot <span className="text-brand-red">Deals</span>
            </h2>
            <p className="text-white/60 mt-2 font-[var(--font-body)]">
              Save big on our best meal combos
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {deals.map((deal, i) => (
              <motion.div
                key={deal.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-brand-red/40 hover:bg-white/10 transition-all duration-300"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={deal.image}
                    alt={deal.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="bg-brand-red text-white text-sm font-[var(--font-accent)] font-bold px-3 py-1 rounded-full">
                      SAVE Rs {(deal.oldPrice - deal.price).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-[var(--font-display)] font-bold text-lg text-white mb-1">
                    {deal.name}
                  </h3>
                  <p className="text-white/50 text-sm mb-3">{deal.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className="font-[var(--font-accent)] font-extrabold text-2xl text-brand-red">
                      Rs {deal.price.toLocaleString()}
                    </span>
                    <span className="text-white/30 line-through text-sm">
                      Rs {deal.oldPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Branches */}
      <section className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-brand-charcoal">
            Our <span className="text-brand-red">Branches</span>
          </h2>
          <p className="text-muted-foreground mt-2 font-[var(--font-body)]">
            Currently serving Multan from our Royal Orchard branch — new branch coming soon
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Operating Branches */}
          {operatingBranches.map((branch, i) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`group rounded-2xl border-2 p-8 transition-all duration-300 ${
                selectedBranch.id === branch.id
                  ? "border-brand-red bg-brand-red/5 shadow-xl shadow-brand-red/10"
                  : "border-border bg-white hover:border-brand-red/40 hover:shadow-lg"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedBranch.id === branch.id ? "bg-brand-red" : "bg-brand-red/10"
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
                      <span className="text-brand-charcoal font-[var(--font-accent)] font-semibold">{branch.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-brand-gold" />
                      <span className="text-brand-charcoal font-[var(--font-accent)] font-semibold">{branch.hours}</span>
                    </div>
                  </div>
                  {selectedBranch.id === branch.id && (
                    <div className="mt-3 text-brand-red text-xs font-[var(--font-accent)] font-semibold">
                      Your selected branch
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Coming Soon Branch */}
          {comingSoonBranches.map((branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="group rounded-2xl border-2 border-dashed border-brand-cream-dark/40 bg-white/50 p-8 opacity-75"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-cream-dark/30 flex items-center justify-center shrink-0">
                  <Construction className="w-6 h-6 text-brand-cream-dark" />
                </div>
                <div>
                  <h3 className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal/60 mb-1">
                    {branch.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{branch.address}</p>
                  <span className="inline-flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-[var(--font-accent)] font-bold px-3 py-1.5 rounded-full">
                    <Construction className="w-3 h-3" />
                    Coming Soon
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-brand-charcoal">
            Why Telepizza?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Truck, title: "Fast Delivery", desc: "From our oven to your door in 30 minutes. We deliver till 2:30 AM because cravings don't sleep." },
            { icon: Flame, title: "Fresh & Hot", desc: "Every pizza is made from scratch with fresh dough and premium ingredients. No shortcuts, no compromises." },
            { icon: Star, title: "Bold Flavors", desc: "From Kabab Stuffed Crust to Injected Broast — our menu is packed with unique flavors you won't find anywhere else." },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center p-8 rounded-2xl bg-white border border-border hover:border-brand-red/30 hover:shadow-xl hover:shadow-brand-red/5 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <feature.icon className="w-8 h-8 text-brand-red" />
              </div>
              <h3 className="font-[var(--font-display)] font-bold text-xl text-brand-charcoal mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Telepizza Platform */}
      <section className="bg-brand-charcoal py-16 relative overflow-hidden">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/20 rounded-full px-4 py-2 mb-4">
              <Zap className="w-4 h-4 text-brand-gold" />
              <span className="text-brand-gold text-sm font-[var(--font-accent)] font-medium">
                Powered by Mianx.ai
              </span>
            </div>
            <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-white">
              The Telepizza <span className="text-brand-red">Platform</span>
            </h2>
            <p className="text-white/60 mt-3 font-[var(--font-body)] max-w-xl mx-auto">
              More than a restaurant — we're building Pakistan's most advanced restaurant technology platform with AI-powered operations, analytics, and customer experiences.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: ShoppingCart, label: "Online Ordering", desc: "Web & Mobile" },
              { icon: Code2, label: "POS System", desc: "In-store" },
              { icon: Bot, label: "AI Agents", desc: "24/7 Automation" },
              { icon: BarChart3, label: "Analytics", desc: "Real-time Insights" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 text-center hover:bg-white/10 hover:border-brand-red/30 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-brand-red/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-brand-red" />
                </div>
                <div className="text-white font-[var(--font-accent)] font-bold text-sm">{item.label}</div>
                <div className="text-white/40 text-xs mt-1">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download CTA */}
      <section className="relative overflow-hidden py-20">
        <img
          src="/images/app-mockup-bg_6f8a25be.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-charcoal/95 via-brand-charcoal/90 to-brand-charcoal/80" />
        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 text-white"
            >
              <h2 className="font-[var(--font-display)] font-extrabold text-3xl md:text-5xl leading-tight">
                Order Faster with
                <br />
                <span className="text-brand-red">Our App</span>
              </h2>
              <p className="mt-4 text-white/60 text-lg font-[var(--font-body)] max-w-md">
                Skip the call. Track your order in real-time. Get exclusive app-only deals. The Telepizza app is coming soon to iOS and Android.
              </p>
              <div className="mt-8 flex gap-4">
                <div className="px-6 py-3 bg-white/10 rounded-xl border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Coming Soon</div>
                  <div className="font-[var(--font-accent)] font-bold text-white">iOS</div>
                </div>
                <div className="px-6 py-3 bg-white/10 rounded-xl border border-white/10">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Coming Soon</div>
                  <div className="font-[var(--font-accent)] font-bold text-white">Android</div>
                </div>
              </div>
            </motion.div>

            {/* Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex justify-center"
            >
              <div className="relative w-[280px] h-[560px] bg-brand-charcoal rounded-[40px] border-4 border-white/20 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-10" />
                <div className="pt-10 px-4 h-full bg-gradient-to-b from-brand-charcoal to-brand-charcoal/90">
                  {/* Mock App Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-[var(--font-display)] font-bold text-white text-sm">Telepizza</span>
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  {/* Mock App Content */}
                  <div className="bg-brand-red/20 rounded-2xl p-4 mb-4">
                    <div className="text-brand-gold text-xs font-[var(--font-accent)] font-bold mb-1">NEW DEAL</div>
                    <div className="text-white font-bold text-base">Family Feast</div>
                    <div className="text-white/60 text-xs mt-1">2 Large Pizzas + Drinks</div>
                    <div className="text-brand-red font-bold text-lg mt-2">Rs 3,500</div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Kabab Stuffed Crust", price: "Rs 1,200" },
                      { name: "Chicago Extreme", price: "Rs 1,500" },
                      { name: "Chicken Supreme", price: "Rs 1,100" },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                        <div className="w-12 h-12 bg-brand-red/20 rounded-lg flex items-center justify-center">
                          <Flame className="w-5 h-5 text-brand-red" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white text-xs font-semibold">{item.name}</div>
                          <div className="text-brand-gold text-xs font-bold">{item.price}</div>
                        </div>
                        <div className="w-6 h-6 bg-brand-red rounded-full flex items-center justify-center">
                          <Plus className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom Nav */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-around py-3 bg-white/5 border-t border-white/10">
                    <HomeIcon className="w-5 h-5 text-brand-red" />
                    <MenuGridIcon className="w-5 h-5 text-white/40" />
                    <CartIcon className="w-5 h-5 text-white/40" />
                    <UserIcon className="w-5 h-5 text-white/40" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-red py-12">
        <div className="container text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-[var(--font-display)] font-extrabold text-3xl md:text-4xl text-white mb-4"
          >
            Hungry? Let's Fix That.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/80 mb-8 max-w-md mx-auto"
          >
            Call us or order online — we'll have it to you in no time
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href="/menu">
              <Button className="bg-white text-brand-red hover:bg-white/90 font-[var(--font-display)] font-bold px-8 py-6 rounded-xl shadow-lg transition-all active:scale-95">
                Browse Menu
              </Button>
            </Link>
            <a href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`}>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 font-[var(--font-display)] font-bold px-8 py-6 rounded-xl transition-all active:scale-95">
                Call {selectedBranch.phone}
              </Button>
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// Simple icon components for the phone mockup
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function MenuGridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}
function CartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M5.5 2h16L19.5 20H5.5L3.5 5h3L5.5 2z" />
    </svg>
  );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
