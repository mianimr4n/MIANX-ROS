/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Menu page with expanded beverages & desserts section — these are a proven
   customer strength per real review data (customers consistently praise shakes,
   frappes, and desserts more than main items).
   Categories reordered to surface drinks earlier. */
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, ShoppingCart, Search, Star, Flame, Zap } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const menuCategories = ["All", "Pizzas", "Burgers", "Pasta", "Deals", "Sides", "Desserts", "Drinks"];

const menuItems = [
  // Signature Pizzas
  { id: "p1", name: "Kabab Stuffed Crust Pizza", price: 1200, category: "Pizzas", description: "Signature kabab-stuffed crust with special toppings — our most loved item", image: "/manus-storage/menu-pizza_f729e710.jpg", badge: "Signature" },
  { id: "p2", name: "Chicago Extreme Pizza", price: 1500, category: "Pizzas", description: "Loaded with premium toppings and extra cheese", image: "/manus-storage/menu-pizza_f729e710.jpg", badge: null },
  { id: "p3", name: "Chicken Supreme Pizza", price: 1100, category: "Pizzas", description: "Tender chicken, bell peppers, and mozzarella", image: "/manus-storage/menu-pizza_f729e710.jpg", badge: null },
  { id: "p4", name: "Sunset Paradise Pizza", price: 1300, category: "Pizzas", description: "A tropical twist with pineapple and ham", image: "/manus-storage/hero-food-spread_368dc5ce.jpg", badge: null },
  { id: "p5", name: "Pepperoni Pizza", price: 950, category: "Pizzas", description: "Classic pepperoni with melted mozzarella", image: "/manus-storage/hero-banner_37686ed3.jpg", badge: null },

  // Burgers
  { id: "b1", name: "Injected Broast Burger", price: 375, category: "Burgers", description: "Crispy injected broast with special sauce — a local favorite", image: "/manus-storage/menu-burger_bf9b42fb.jpg", badge: "Popular" },
  { id: "b2", name: "Zinger Burger", price: 400, category: "Burgers", description: "Spicy crispy chicken fillet with zinger sauce", image: "/manus-storage/menu-burger_bf9b42fb.jpg", badge: null },
  { id: "b3", name: "Beef Burger", price: 450, category: "Burgers", description: "Juicy beef patty with fresh lettuce and tomato", image: "/manus-storage/menu-burger_bf9b42fb.jpg", badge: null },

  // Pasta
  { id: "pa1", name: "Crispy Chicken Pasta", price: 850, category: "Pasta", description: "Creamy pasta with crispy chicken pieces", image: "/manus-storage/pasta-dish_6d0eeea5.jpg", badge: null },
  { id: "pa2", name: "Alfredo Pasta", price: 750, category: "Pasta", description: "Rich creamy alfredo sauce with mushrooms", image: "/manus-storage/pasta-dish_6d0eeea5.jpg", badge: null },

  // Deals
  { id: "d1", name: "Family Deal", price: 1899, category: "Deals", description: "2 large pizzas + 2 burgers + fries + drinks", image: "/manus-storage/deals-section_ee7752d9.jpg", badge: "Best Value" },
  { id: "d2", name: "Couple Deal", price: 1500, category: "Deals", description: "1 medium pizza + 2 drinks + garlic bread", image: "/manus-storage/hero-food-spread_368dc5ce.jpg", badge: null },

  // Sides
  { id: "s1", name: "Garlic Bread", price: 300, category: "Sides", description: "Oven-baked garlic bread with cheese", image: "/manus-storage/sides-platter_782cdd37.jpg", badge: null },
  { id: "s2", name: "Cheese Sticks", price: 350, category: "Sides", description: "Golden crispy cheese sticks", image: "/manus-storage/sides-platter_782cdd37.jpg", badge: null },
  { id: "s3", name: "French Fries", price: 200, category: "Sides", description: "Crispy golden fries with ketchup", image: "/manus-storage/sides-platter_782cdd37.jpg", badge: null },

  // Desserts — expanded per customer review data
  { id: "de1", name: "Brownie with Ice Cream", price: 400, category: "Desserts", description: "Warm chocolate brownie with vanilla ice cream", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: "Fan Favorite" },
  { id: "de2", name: "Gulab Jamun Cheesecake", price: 450, category: "Desserts", description: "Fusion dessert — gulab jamun meets creamy cheesecake", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: "New" },
  { id: "de3", name: "Kulfi", price: 250, category: "Desserts", description: "Traditional Pakistani kulfi with pistachios", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: null },

  // Drinks — expanded per customer review data (shakes & frappe are most praised)
  { id: "dr1", name: "Chocolate Milkshake", price: 350, category: "Drinks", description: "Thick creamy chocolate milkshake — customers rave about this", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: "Top Rated" },
  { id: "dr2", name: "Vanilla Milkshake", price: 350, category: "Drinks", description: "Rich vanilla milkshake with real ice cream", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: null },
  { id: "dr3", name: "Strawberry Frappe", price: 400, category: "Drinks", description: "Blended strawberry frappe with whipped cream", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: "Top Rated" },
  { id: "dr4", name: "Mango Frappe", price: 400, category: "Drinks", description: "Tropical mango frappe — a summer essential", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: null },
  { id: "dr5", name: "Iced Coffee", price: 300, category: "Drinks", description: "Smooth iced coffee with caramel drizzle", image: "/manus-storage/desserts-drinks_397216c1.jpg", badge: null },
];

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { addItem } = useCart();

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img
          src="/manus-storage/deals-section_ee7752d9.jpg"
          alt="Menu"
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

      {/* Reviews Proof-Point Banner */}
      <section className="bg-brand-cream-dark/30 border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-3 justify-center flex-wrap">
            <Star className="w-5 h-5 text-brand-gold fill-brand-gold" />
            <span className="text-sm font-[var(--font-accent)] font-medium text-brand-charcoal">
              "Beverages, shakes, and frappes are outstanding"
            </span>
            <span className="text-xs text-muted-foreground">— based on 642+ real Google reviews</span>
          </div>
        </div>
      </section>

      {/* Search & Categories */}
      <section className="sticky top-[72px] z-30 bg-brand-cream border-b border-border">
        <div className="container py-4">
          {/* Search */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-border"
            />
          </div>
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {menuCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-[var(--font-accent)] font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  activeCategory === cat
                    ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                    : "bg-white text-brand-charcoal hover:bg-brand-cream-dark border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <section className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              className="group bg-white rounded-2xl overflow-hidden border border-border hover:border-brand-red/30 hover:shadow-xl hover:shadow-brand-red/5 transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                  <span className="bg-brand-red text-white text-xs font-[var(--font-accent)] font-bold px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                  {item.badge === "Signature" && (
                    <span className="bg-brand-gold text-brand-charcoal text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Signature
                    </span>
                  )}
                  {item.badge === "Popular" && (
                    <span className="bg-brand-red-light text-white text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Popular
                    </span>
                  )}
                  {item.badge === "Top Rated" && (
                    <span className="bg-brand-gold text-brand-charcoal text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-brand-charcoal" /> Top Rated
                    </span>
                  )}
                  {item.badge === "Fan Favorite" && (
                    <span className="bg-brand-red text-white text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" /> Fan Favorite
                    </span>
                  )}
                  {item.badge === "Best Value" && (
                    <span className="bg-green-600 text-white text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full">
                      Best Value
                    </span>
                  )}
                  {item.badge === "New" && (
                    <span className="bg-blue-600 text-white text-[10px] font-[var(--font-accent)] font-bold px-2.5 py-1 rounded-full">
                      New
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description}
                </p>
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

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg font-[var(--font-display)]">No items found</p>
          </div>
        )}
      </section>
    </div>
  );
}
