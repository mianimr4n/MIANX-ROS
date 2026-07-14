import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart, type CartExtra } from "@/contexts/CartContext";
import { menuItems, type MenuItem, type MenuVariant } from "@/data/menu-data";
import {
  EXTRA_TOPPING_PRICES,
  PIZZA_ADDON_DRINK_IDS,
  PIZZA_ADDON_FRIES_IDS,
  getToppingTierFromVariantLabel,
} from "@/data/cart-config";
import { getDefaultVariant, getVariantId } from "@/lib/menu-utils";

type PizzaCustomizerDialogProps = {
  item: MenuItem | null;
  initialVariantLabel?: string;
  onClose: () => void;
};

export function PizzaCustomizerDialog({ item, initialVariantLabel, onClose }: PizzaCustomizerDialogProps) {
  const { addItem } = useCart();
  const [selectedVariantLabel, setSelectedVariantLabel] = useState("");
  const [extraChicken, setExtraChicken] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraCheeseSlice, setExtraCheeseSlice] = useState(false);
  const [drinkId, setDrinkId] = useState<string>("none");
  const [friesId, setFriesId] = useState<string>("none");
  const [instructions, setInstructions] = useState("");

  const drinkOptions = useMemo(
    () => menuItems.filter((entry) => PIZZA_ADDON_DRINK_IDS.includes(entry.id as (typeof PIZZA_ADDON_DRINK_IDS)[number])),
    [],
  );

  const friesOptions = useMemo(
    () => menuItems.filter((entry) => PIZZA_ADDON_FRIES_IDS.includes(entry.id as (typeof PIZZA_ADDON_FRIES_IDS)[number])),
    [],
  );

  useEffect(() => {
    if (!item) return;
    setSelectedVariantLabel(initialVariantLabel ?? getDefaultVariant(item)?.label ?? "");
    setExtraChicken(false);
    setExtraCheese(false);
    setExtraCheeseSlice(false);
    setDrinkId("none");
    setFriesId("none");
    setInstructions("");
  }, [item, initialVariantLabel]);

  if (!item) return null;

  const selectedVariant =
    item.variants?.find((variant) => variant.label === selectedVariantLabel) ??
    getDefaultVariant(item);

  const toppingTier = selectedVariant
    ? getToppingTierFromVariantLabel(selectedVariant.label)
    : "small";

  const extras: CartExtra[] = [];

  if (extraChicken) {
    extras.push({
      label: `Extra Chicken (${selectedVariant?.label ?? "Small"})`,
      price: EXTRA_TOPPING_PRICES.chicken[toppingTier],
    });
  }
  if (extraCheese) {
    extras.push({
      label: `Extra Cheese (${selectedVariant?.label ?? "Small"})`,
      price: EXTRA_TOPPING_PRICES.cheese[toppingTier],
    });
  }
  if (extraCheeseSlice) {
    extras.push({ label: "Extra Cheese Slice", price: EXTRA_TOPPING_PRICES.cheeseSlice });
  }

  const selectedDrink = drinkOptions.find((entry) => entry.id === drinkId);
  if (selectedDrink?.price) {
    extras.push({ label: selectedDrink.name, price: selectedDrink.price });
  }

  const selectedFries = friesOptions.find((entry) => entry.id === friesId);
  if (selectedFries?.price) {
    extras.push({ label: selectedFries.name, price: selectedFries.price });
  }

  const basePrice = selectedVariant?.price ?? item.price ?? 0;
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  const lineTotal = basePrice + extrasTotal;

  const handleAdd = () => {
    if (!selectedVariant && item.price === undefined) return;

    const variant = selectedVariant as MenuVariant | undefined;
    const variantId = variant ? getVariantId(variant) : null;
    const extraSlug = extras.map((extra) => extra.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("-");
    const cartId = [item.id, variantId, extraSlug || null].filter(Boolean).join("--");

    addItem({
      id: cartId,
      menuSlug: item.id,
      name: item.name,
      price: basePrice,
      category: item.category,
      variant: variant?.label,
      image: item.image,
      description: item.description,
      extras,
      instructions: instructions.trim() || undefined,
    });

    onClose();
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-[var(--font-display)] text-2xl">
            Customize {item.name}
          </DialogTitle>
          <DialogDescription>
            Choose size and verified add-ons. Specialty crusts (Crown Crust, Stuffed Crust) are
            separate menu items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-2">
              <Label className="font-[var(--font-accent)] font-semibold">Size</Label>
              <div className="flex flex-wrap gap-2">
                {item.variants.map((variant) => (
                  <button
                    key={variant.label}
                    type="button"
                    onClick={() => setSelectedVariantLabel(variant.label)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-[var(--font-accent)] font-semibold transition-all ${
                      selectedVariantLabel === variant.label
                        ? "border-brand-red bg-brand-red text-white"
                        : "border-border bg-white hover:border-brand-red/40"
                    }`}
                  >
                    {variant.label}
                    <span className="ml-1 opacity-80">Rs {variant.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-[var(--font-accent)] font-semibold">Extra toppings</Label>
            <div className="space-y-2">
              <label className="flex items-center justify-between rounded-2xl border border-border p-3 cursor-pointer hover:border-brand-red/30">
                <span className="text-sm font-[var(--font-accent)]">Extra Chicken</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-brand-red font-bold">
                    +Rs {EXTRA_TOPPING_PRICES.chicken[toppingTier]}
                  </span>
                  <input
                    type="checkbox"
                    checked={extraChicken}
                    onChange={(event) => setExtraChicken(event.target.checked)}
                    className="h-4 w-4 accent-brand-red"
                  />
                </div>
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border p-3 cursor-pointer hover:border-brand-red/30">
                <span className="text-sm font-[var(--font-accent)]">Extra Cheese</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-brand-red font-bold">
                    +Rs {EXTRA_TOPPING_PRICES.cheese[toppingTier]}
                  </span>
                  <input
                    type="checkbox"
                    checked={extraCheese}
                    onChange={(event) => setExtraCheese(event.target.checked)}
                    className="h-4 w-4 accent-brand-red"
                  />
                </div>
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border p-3 cursor-pointer hover:border-brand-red/30">
                <span className="text-sm font-[var(--font-accent)]">Extra Cheese Slice</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-brand-red font-bold">
                    +Rs {EXTRA_TOPPING_PRICES.cheeseSlice}
                  </span>
                  <input
                    type="checkbox"
                    checked={extraCheeseSlice}
                    onChange={(event) => setExtraCheeseSlice(event.target.checked)}
                    className="h-4 w-4 accent-brand-red"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-[var(--font-accent)] font-semibold">Add a drink</Label>
              <Select value={drinkId} onValueChange={setDrinkId}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="No drink" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No drink</SelectItem>
                  {drinkOptions.map((drink) => (
                    <SelectItem key={drink.id} value={drink.id}>
                      {drink.name} — Rs {drink.price?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-[var(--font-accent)] font-semibold">Add fries</Label>
              <Select value={friesId} onValueChange={setFriesId}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="No fries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No fries</SelectItem>
                  {friesOptions.map((fries) => (
                    <SelectItem key={fries.id} value={fries.id}>
                      {fries.name} — Rs {fries.price?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pizza-instructions" className="font-[var(--font-accent)] font-semibold">
              Special instructions
            </Label>
            <Textarea
              id="pizza-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="e.g. well done, no olives..."
              className="rounded-2xl min-h-[80px]"
            />
          </div>

          <div className="rounded-2xl brand-gradient p-4 text-white flex items-center justify-between">
            <span className="font-[var(--font-display)] font-bold">Line total</span>
            <span className="font-[var(--font-accent)] font-extrabold text-2xl">
              Rs {lineTotal.toLocaleString()}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-2xl">
            Cancel
          </Button>
          <Button onClick={handleAdd} className="rounded-2xl brand-gradient text-white font-bold">
            <Plus className="w-4 h-4 mr-1" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
