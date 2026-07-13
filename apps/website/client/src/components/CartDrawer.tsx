/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Cart drawer with branch-aware WhatsApp ordering. */
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Minus, Plus, Trash2, X, MapPin, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";

export default function CartDrawer() {
  const { state, removeItem, updateQuantity, clearCart, toggleCart, totalPrice } = useCart();
  const { selectedBranch } = useBranch();

  // Build WhatsApp message with order details and branch info
  const buildWhatsAppUrl = () => {
    const phone = selectedBranch.phone.replace(/-/g, "").replace(/^0/, "");
    const lines = [
      `*New Order from Telepizza Website*`,
      ``,
      `*Branch:* ${selectedBranch.name}`,
      `*Address:* ${selectedBranch.address}`,
      ``,
      `*Order Items:*`,
    ];

    state.items.forEach((item) => {
      lines.push(
        `  - ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity} — Rs ${(item.price * item.quantity).toLocaleString()}`
      );
    });

    lines.push(``, `*Total:* Rs ${totalPrice.toLocaleString()}`, ``);
    lines.push(`Please confirm my order. Thank you!`);

    const message = encodeURIComponent(lines.join("\n"));
    return `https://wa.me/92${phone}?text=${message}`;
  };

  return (
    <AnimatePresence>
      {state.isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={toggleCart}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 z-[61] w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-brand-red" />
                <span className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal">
                  Your Cart
                </span>
                <span className="bg-brand-red/10 text-brand-red text-xs font-[var(--font-accent)] font-bold px-2 py-0.5 rounded-full">
                  {state.items.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={toggleCart}
                className="p-2 rounded-lg hover:bg-brand-cream-dark transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Branch Info */}
            <div className="px-5 py-3 bg-brand-cream-dark border-b border-border flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-brand-red shrink-0" />
              <span className="text-xs text-muted-foreground font-[var(--font-accent)]">
                Ordering from <span className="text-brand-charcoal font-semibold">{selectedBranch.name}</span>
              </span>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5">
              {state.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-16 h-16 text-brand-cream-dark mb-4" />
                  <p className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-2">
                    Your cart is empty
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Add some delicious items from our menu!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-brand-cream rounded-xl border border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-[var(--font-accent)] font-semibold text-sm text-brand-charcoal truncate">
                          {item.name}
                        </h4>
                        {item.variant && (
                          <p className="text-muted-foreground text-xs">
                            {item.variant}
                          </p>
                        )}
                        <p className="text-brand-red text-xs font-[var(--font-accent)] font-bold">
                          Rs {item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-brand-red hover:text-white hover:border-brand-red transition-all active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-[var(--font-accent)] font-bold text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-brand-red hover:text-white hover:border-brand-red transition-all active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-brand-red hover:bg-brand-red/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {state.items.length > 0 && (
              <div className="p-5 border-t border-border bg-brand-cream">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal">
                    Total
                  </span>
                  <span className="font-[var(--font-accent)] font-extrabold text-2xl text-brand-red">
                    Rs {totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    className="flex-1 border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white"
                  >
                    Clear
                  </Button>
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-accent)] font-bold shadow-lg shadow-brand-red/25 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Order via WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
