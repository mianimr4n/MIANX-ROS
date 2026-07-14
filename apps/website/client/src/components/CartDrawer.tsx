/* Telepizza cart drawer — delivery, instructions, coupons, WhatsApp checkout */
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  X,
  MapPin,
  MessageCircle,
  Truck,
  Store,
  Tag,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemTotal, VERIFIED_COUPON_CODES } from "@/data/cart-config";

export default function CartDrawer() {
  const { state, removeItem, updateQuantity, clearCart, toggleCart, setOrderDetails, subtotal, totalPrice } =
    useCart();
  const { selectedBranch } = useBranch();
  const { order } = state;

  const couponValid = order.couponCode.trim()
    ? Boolean(VERIFIED_COUPON_CODES[order.couponCode.trim().toUpperCase()])
    : null;

  const buildWhatsAppUrl = () => {
    const phone = selectedBranch.phone.replace(/-/g, "").replace(/^0/, "");
    const lines = [
      `*New Order from Telepizza Website*`,
      ``,
      `*Branch:* ${selectedBranch.name}`,
      `*Address:* ${selectedBranch.address}`,
      `*Phone:* ${selectedBranch.phone}`,
      ``,
      `*Order Type:* ${order.deliveryMode === "delivery" ? "Delivery" : "Pickup"}`,
    ];

    if (order.deliveryMode === "delivery" && order.deliveryAddress.trim()) {
      lines.push(`*Delivery Address:* ${order.deliveryAddress.trim()}`);
    }

    if (order.couponCode.trim()) {
      lines.push(`*Promo Code:* ${order.couponCode.trim()}`);
    }

    lines.push(``, `*Order Items:*`);

    state.items.forEach((item) => {
      const lineTotal = getLineItemTotal(item.price, item.extras, item.quantity);
      lines.push(
        `• ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity} — Rs ${lineTotal.toLocaleString()}`,
      );
      item.extras?.forEach((extra) => {
        lines.push(`    + ${extra.label} — Rs ${extra.price.toLocaleString()}`);
      });
      if (item.instructions) {
        lines.push(`    Note: ${item.instructions}`);
      }
    });

    lines.push(``, `*Subtotal:* Rs ${subtotal.toLocaleString()}`);

    if (order.orderInstructions.trim()) {
      lines.push(``, `*Order Instructions:*`, order.orderInstructions.trim());
    }

    lines.push(
      ``,
      `_Delivery charges and taxes will be confirmed by the branch._`,
      ``,
      `Please confirm my order. Thank you!`,
    );

    return `https://wa.me/92${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const checkoutDisabled =
    state.items.length === 0 ||
    (order.deliveryMode === "delivery" && !order.deliveryAddress.trim());

  return (
    <AnimatePresence>
      {state.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={toggleCart}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 z-[61] w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-brand-red" />
                <span className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal">
                  Your Cart
                </span>
                <span className="bg-brand-red/10 text-brand-red text-xs font-[var(--font-accent)] font-bold px-2 py-0.5 rounded-full">
                  {state.items.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={toggleCart}
                className="p-2 rounded-xl hover:bg-brand-cream-dark transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-3 bg-brand-cream border-b border-border flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-brand-red shrink-0" />
              <span className="text-xs text-muted-foreground font-[var(--font-accent)]">
                Ordering from{" "}
                <span className="text-brand-charcoal font-semibold">{selectedBranch.name}</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {state.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-brand-cream-dark mb-4" />
                  <p className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-2">
                    Your cart is empty
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Add items from our menu to get started.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {state.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-brand-cream rounded-2xl border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-[var(--font-accent)] font-semibold text-sm text-brand-charcoal">
                              {item.name}
                            </h4>
                            {item.variant && (
                              <p className="text-muted-foreground text-xs">{item.variant}</p>
                            )}
                            {item.extras?.map((extra) => (
                              <p key={extra.label} className="text-xs text-muted-foreground">
                                + {extra.label} (Rs {extra.price.toLocaleString()})
                              </p>
                            ))}
                            {item.instructions && (
                              <p className="text-xs text-brand-charcoal/70 mt-1 italic">
                                "{item.instructions}"
                              </p>
                            )}
                            <p className="text-brand-red text-sm font-[var(--font-accent)] font-bold mt-1">
                              Rs {getLineItemTotal(item.price, item.extras, item.quantity).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-brand-red hover:text-white hover:border-brand-red transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-[var(--font-accent)] font-bold text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-brand-red hover:text-white hover:border-brand-red transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 text-muted-foreground hover:text-brand-red hover:bg-brand-red/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border">
                    <Label className="font-[var(--font-accent)] font-semibold text-sm">Order type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderDetails({ deliveryMode: "delivery" })}
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-[var(--font-accent)] font-semibold transition-all ${
                          order.deliveryMode === "delivery"
                            ? "border-brand-red bg-brand-red text-white"
                            : "border-border bg-white"
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderDetails({ deliveryMode: "pickup" })}
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-[var(--font-accent)] font-semibold transition-all ${
                          order.deliveryMode === "pickup"
                            ? "border-brand-red bg-brand-red text-white"
                            : "border-border bg-white"
                        }`}
                      >
                        <Store className="w-4 h-4" />
                        Pickup
                      </button>
                    </div>
                  </div>

                  {order.deliveryMode === "delivery" && (
                    <div className="space-y-2">
                      <Label htmlFor="delivery-address" className="font-[var(--font-accent)] font-semibold text-sm">
                        Delivery address
                      </Label>
                      <Input
                        id="delivery-address"
                        value={order.deliveryAddress}
                        onChange={(event) => setOrderDetails({ deliveryAddress: event.target.value })}
                        placeholder="House #, street, area, Multan"
                        className="rounded-2xl"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="order-instructions" className="font-[var(--font-accent)] font-semibold text-sm">
                      Order instructions
                    </Label>
                    <Textarea
                      id="order-instructions"
                      value={order.orderInstructions}
                      onChange={(event) => setOrderDetails({ orderInstructions: event.target.value })}
                      placeholder="Gate code, landmark, contact person..."
                      className="rounded-2xl min-h-[72px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coupon-code" className="font-[var(--font-accent)] font-semibold text-sm flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Promo code (optional)
                    </Label>
                    <Input
                      id="coupon-code"
                      value={order.couponCode}
                      onChange={(event) => setOrderDetails({ couponCode: event.target.value })}
                      placeholder="Enter code if you have one"
                      className="rounded-2xl"
                    />
                    {couponValid === false && (
                      <p className="text-xs text-brand-red">
                        Code not recognized online — branch will verify on WhatsApp.
                      </p>
                    )}
                    {couponValid === true && (
                      <p className="text-xs text-brand-charcoal">
                        {VERIFIED_COUPON_CODES[order.couponCode.trim().toUpperCase()].description}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {state.items.length > 0 && (
              <div className="p-5 border-t border-border bg-brand-cream space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-[var(--font-accent)]">Subtotal</span>
                  <span className="font-[var(--font-accent)] font-bold text-brand-charcoal">
                    Rs {subtotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Delivery charges and taxes are confirmed by the branch on WhatsApp. No automatic
                  discounts are applied online unless a verified promo code is configured.
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal">
                    Estimated total
                  </span>
                  <span className="font-[var(--font-accent)] font-extrabold text-2xl text-brand-red">
                    Rs {totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    className="flex-1 rounded-2xl border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white"
                  >
                    Clear
                  </Button>
                  <a
                    href={checkoutDisabled ? undefined : buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                    onClick={(event) => checkoutDisabled && event.preventDefault()}
                  >
                    <Button
                      disabled={checkoutDisabled}
                      className="w-full rounded-2xl brand-gradient text-white font-[var(--font-accent)] font-bold shadow-lg shadow-brand-red/25 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Checkout
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
