import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCart, type CartExtra } from "@/contexts/CartContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import {
  PIZZA_ADDON_DRINK_IDS,
  PIZZA_ADDON_FRIES_IDS,
  PIZZA_TOPPING_SLUGS,
  findCatalogItemBySlug,
  getToppingTierFromVariantLabel,
  isPizzaItem,
  resolveCatalogToppingPrice,
} from "@/data/cart-config";
import { handleImageError } from "@/lib/image-fallback";
import { getDefaultVariant, getVariantId } from "@/lib/menu-utils";
import type { MenuItem, MenuVariant } from "@/lib/telepizza-types";

type ProductConfiguratorProps = {
  item: MenuItem;
  initialVariantLabel?: string;
  compact?: boolean;
  onAdded?: () => void;
};

export function ProductConfigurator({
  item,
  initialVariantLabel,
  compact = false,
  onAdded,
}: ProductConfiguratorProps) {
  const { addItem } = useCart();
  const { items: catalogItems, toppings } = useMenuCatalog();
  const [selectedVariantLabel, setSelectedVariantLabel] = useState("");
  const [extraChicken, setExtraChicken] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraCheeseSlice, setExtraCheeseSlice] = useState(false);
  const [drinkId, setDrinkId] = useState("none");
  const [friesId, setFriesId] = useState("none");
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedVariantLabel(initialVariantLabel ?? getDefaultVariant(item)?.label ?? "");
    setExtraChicken(false);
    setExtraCheese(false);
    setExtraCheeseSlice(false);
    setDrinkId("none");
    setFriesId("none");
    setInstructions("");
    setQuantity(1);
  }, [item, initialVariantLabel]);

  const drinkOptions = useMemo(
    () =>
      catalogItems.filter((entry) =>
        PIZZA_ADDON_DRINK_IDS.includes(entry.id as (typeof PIZZA_ADDON_DRINK_IDS)[number]),
      ),
    [catalogItems],
  );
  const friesOptions = useMemo(
    () =>
      catalogItems.filter((entry) =>
        PIZZA_ADDON_FRIES_IDS.includes(entry.id as (typeof PIZZA_ADDON_FRIES_IDS)[number]),
      ),
    [catalogItems],
  );
  const chickenTopping = useMemo(
    () => findCatalogItemBySlug(toppings, PIZZA_TOPPING_SLUGS.chicken),
    [toppings],
  );
  const cheeseTopping = useMemo(
    () => findCatalogItemBySlug(toppings, PIZZA_TOPPING_SLUGS.cheese),
    [toppings],
  );
  const cheeseSliceTopping = useMemo(
    () => findCatalogItemBySlug(toppings, PIZZA_TOPPING_SLUGS.cheeseSlice),
    [toppings],
  );

  const selectedVariant =
    item.variants?.find((variant) => variant.label === selectedVariantLabel) ??
    getDefaultVariant(item);
  const toppingTier = selectedVariant
    ? getToppingTierFromVariantLabel(selectedVariant.label)
    : "small";
  const chickenPrice = resolveCatalogToppingPrice(chickenTopping, toppingTier);
  const cheesePrice = resolveCatalogToppingPrice(cheeseTopping, toppingTier);
  const cheeseSlicePrice = resolveCatalogToppingPrice(cheeseSliceTopping, "small");
  const pizza = isPizzaItem(item);

  const extras: CartExtra[] = [];
  if (extraChicken && chickenPrice != null) {
    extras.push({ label: `Extra Chicken (${selectedVariant?.label ?? "Small"})`, price: chickenPrice });
  }
  if (extraCheese && cheesePrice != null) {
    extras.push({ label: `Extra Cheese (${selectedVariant?.label ?? "Small"})`, price: cheesePrice });
  }
  if (extraCheeseSlice && cheeseSlicePrice != null) {
    extras.push({ label: "Extra Cheese Slice", price: cheeseSlicePrice });
  }
  const selectedDrink = drinkOptions.find((entry) => entry.id === drinkId);
  if (selectedDrink?.price != null) extras.push({ label: selectedDrink.name, price: selectedDrink.price });
  const selectedFries = friesOptions.find((entry) => entry.id === friesId);
  if (selectedFries?.price != null) extras.push({ label: selectedFries.name, price: selectedFries.price });

  const basePrice = selectedVariant?.price ?? item.price;
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  const lineTotal = (basePrice ?? 0) * quantity + extrasTotal * quantity;

  const handleAdd = () => {
    if (basePrice == null) {
      toast.error("This item is not available to order right now.");
      return;
    }
    if (extraChicken && chickenPrice == null) {
      toast.error("Extra chicken is unavailable for this size.");
      return;
    }
    if (extraCheese && cheesePrice == null) {
      toast.error("Extra cheese is unavailable for this size.");
      return;
    }
    if (extraCheeseSlice && cheeseSlicePrice == null) {
      toast.error("Extra cheese slice is unavailable.");
      return;
    }

    const variant = selectedVariant as MenuVariant | undefined;
    const variantId = variant ? getVariantId(variant) : null;
    const optionKey = extras
      .map((extra) => extra.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
      .join("-");
    const noteKey = instructions.trim()
      ? instructions.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)
      : null;
    const cartId = [item.id, variantId, optionKey || null, noteKey].filter(Boolean).join("--");

    addItem({
      id: cartId,
      menuSlug: item.slug ?? item.id,
      name: item.name,
      price: basePrice,
      quantity,
      category: item.category,
      variant: variant?.label,
      image: item.image,
      description: item.description,
      extras,
      instructions: instructions.trim() || undefined,
    });
    onAdded?.();
  };

  return (
    <div className={compact ? "space-y-5" : "grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]"}>
      <div className="space-y-3">
        <div className="overflow-hidden rounded-3xl border border-border bg-brand-cream">
          <img
            src={item.image}
            alt={item.name}
            onError={handleImageError}
            className={`w-full object-cover ${compact ? "max-h-64" : "aspect-[4/3]"}`}
          />
        </div>
        <div className="flex gap-2" aria-label={`${item.name} image gallery`}>
          <button
            type="button"
            aria-label={`View ${item.name} image`}
            aria-current="true"
            className="h-16 w-20 overflow-hidden rounded-xl border-2 border-brand-red"
          >
            <img src={item.image} alt="" onError={handleImageError} className="h-full w-full object-cover" />
          </button>
        </div>
        {!compact && <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>}
      </div>

      <div className="space-y-5">
        {compact && <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>}
        {item.variants?.length ? (
          <fieldset className="space-y-2">
            <legend className="font-[var(--font-accent)] font-semibold">Choose a size or variant</legend>
            <div className="flex flex-wrap gap-2">
              {item.variants.map((variant) => {
                const selected = selectedVariant?.label === variant.label;
                return (
                  <button
                    key={variant.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedVariantLabel(variant.label)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
                      selected
                        ? "border-brand-red bg-brand-red text-white"
                        : "border-border bg-white hover:border-brand-red/50"
                    }`}
                  >
                    {variant.label} <span className="opacity-80">· Rs {variant.price.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {pizza ? (
          <>
            <fieldset className="space-y-2">
              <legend className="font-[var(--font-accent)] font-semibold">Extra toppings</legend>
              <div className="space-y-2">
                <ToppingOption label="Extra Chicken" price={chickenPrice} checked={extraChicken} onChange={setExtraChicken} />
                <ToppingOption label="Extra Cheese" price={cheesePrice} checked={extraCheese} onChange={setExtraCheese} />
                <ToppingOption label="Extra Cheese Slice" price={cheeseSlicePrice} checked={extraCheeseSlice} onChange={setExtraCheeseSlice} />
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <AddonSelect label="Add a drink" value={drinkId} onChange={setDrinkId} options={drinkOptions} />
              <AddonSelect label="Add fries" value={friesId} onChange={setFriesId} options={friesOptions} />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`product-notes-${item.id}`}>Special instructions (optional)</Label>
          <Textarea
            id={`product-notes-${item.id}`}
            value={instructions}
            maxLength={300}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Add a preparation note for the branch"
            className="min-h-20 rounded-2xl"
          />
          <p className="text-right text-xs text-muted-foreground">{instructions.length}/300</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-cream p-4">
          <div>
            <div className="text-xs text-muted-foreground">Quantity</div>
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="rounded-xl" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <output aria-live="polite" className="min-w-8 text-center font-bold">{quantity}</output>
              <Button type="button" variant="outline" size="icon" className="rounded-xl" aria-label="Increase quantity" disabled={quantity >= 20} onClick={() => setQuantity((value) => Math.min(20, value + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Item total</div>
            <div className="text-2xl font-extrabold text-brand-red">Rs {lineTotal.toLocaleString()}</div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={basePrice == null}
          className="w-full rounded-2xl brand-gradient py-6 font-bold text-white"
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Add {quantity} to cart
        </Button>
        <p className="text-xs text-muted-foreground">
          Final prices are verified by the server during checkout.
        </p>
      </div>
    </div>
  );
}

function ToppingOption({
  label,
  price,
  checked,
  onChange,
}: {
  label: string;
  price: number | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const unavailable = price == null;
  return (
    <label className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${unavailable ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-brand-red/40"}`}>
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-3">
        <span className="text-sm font-bold text-brand-red">{unavailable ? "Unavailable" : `+Rs ${price.toLocaleString()}`}</span>
        <input type="checkbox" checked={checked && !unavailable} disabled={unavailable} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-red" />
      </span>
    </label>
  );
}

function AddonSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: MenuItem[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-2xl" aria-label={label}>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name} · Rs {option.price?.toLocaleString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
