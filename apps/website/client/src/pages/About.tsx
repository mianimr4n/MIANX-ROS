import { motion } from "framer-motion";
import { Flame, Clock, MapPin, Heart, Users, Star } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src="/images/hero-banner.jpg"
          alt="About Telepizza"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/95 via-brand-charcoal/60 to-brand-charcoal/30" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="font-[var(--font-display)] font-extrabold text-4xl md:text-6xl tracking-tight"
          >
            About Telepizza
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mt-4 text-lg text-white/80 font-[var(--font-body)] max-w-xl"
          >
            Pakistan's boldest pizza experience — delivering heat, flavor, and speed
          </motion.p>
        </div>
      </section>

      {/* Story */}
      <section className="container py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Flame className="w-12 h-12 text-brand-red mx-auto mb-4" />
            <h2 className="font-[var(--font-display)] font-bold text-3xl md:text-4xl text-brand-charcoal mb-4">
              Our Story
            </h2>
          </motion.div>
          <div className="space-y-6 text-brand-charcoal/80 leading-relaxed">
            <p>
              Telepizza began as a global brand founded in Madrid, Spain, by Leopoldo Fernández Pujals.
              Today, it's managed by Food Delivery Brands and operates across the globe, bringing its
              signature fresh-dough pizzas and bold flavors to millions of customers.
            </p>
            <p>
              In Pakistan, Telepizza opened its doors in Multan on October 13, 2022, at the Royal
              Orchard Main Business Plaza. Since then, it has quickly become a favorite among families,
              students, and pizza lovers — known for its signature "Injected Broast," creative crust
              styles, and fast delivery service that runs until 2:30 AM. A second branch on
              Northern Bypass Road is coming soon.
            </p>
            <p>
              Today, Telepizza Pakistan is more than just a restaurant — it's a technology-driven
              platform. Powered by Mianx.ai, we're building an AI-powered restaurant ecosystem
              that includes online ordering, POS systems, kitchen dashboards, rider tracking,
              and intelligent automation — all designed to deliver the best customer experience
              while scaling across Pakistan.
            </p>
            <p>
              What makes Telepizza Pakistan special is our commitment to freshness. Every pizza is
              made from scratch with fresh dough, premium toppings, and baked to perfection in our
              signature ovens. We don't just deliver food — we deliver the good stuff.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-brand-charcoal py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { icon: Star, value: "4.3", label: "Google Rating", sublabel: "642+ Reviews" },
              { icon: Users, value: "10K+", label: "Happy Customers", sublabel: "Monthly" },
              { icon: Clock, value: "2:30 AM", label: "Late Night Delivery", sublabel: "Every Day" },
              { icon: MapPin, value: "1", label: "Active Branch", sublabel: "Branch 2 Coming Soon" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group"
              >
                <stat.icon className="w-8 h-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-[var(--font-display)] font-extrabold text-3xl text-brand-red mb-1">
                  {stat.value}
                </div>
                <div className="font-[var(--font-accent)] font-semibold text-sm">{stat.label}</div>
                <div className="text-white/50 text-xs mt-1">{stat.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container py-16">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-[var(--font-display)] font-bold text-3xl text-center text-brand-charcoal mb-12"
          >
            What We Stand For
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Fresh Ingredients", desc: "Every pizza starts with fresh dough, premium toppings, and quality ingredients." },
              { title: "Fast Delivery", desc: "From our oven to your door — we deliver hot and fresh, every time." },
              { title: "Bold Flavors", desc: "Our menu is packed with innovative combinations and authentic Pakistani twists." },
              { title: "Family First", desc: "A warm, welcoming space where families come together over great food." },
            ].map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-border hover:border-brand-red/30 hover:shadow-lg hover:shadow-brand-red/5 transition-all duration-300"
              >
                <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

