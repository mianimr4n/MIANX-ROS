import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCart, type CartExtra } from "@/contexts/CartContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { handleImageError } from "@/lib/image-fallback";
import { getDefaultVariant, getVariantId } from "@/lib/menu-utils";
import {
  buildSelectedModifiers,
  defaultSelectionsForGroups,
  getModifierGroupsForItem,
  resolveOptionPriceForTier,
  sizeTierFromVariantLabel,
  toggleGroupOption,
  validateModifierSelections,
  type ModifierGroupDef,
} from "@/lib/modifiers";
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
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  const modifierGroups = useMemo(() => getModifierGroupsForItem(item), [item]);
  const priceCatalog = useMemo(() => [...catalogItems, ...toppings], [catalogItems, toppings]);

  useEffect(() => {
    setSelectedVariantLabel(initialVariantLabel ?? getDefaultVariant(item)?.label ?? "");
    setSelections(defaultSelectionsForGroups(modifierGroups));
    setInstructions("");
    setQuantity(1);
  }, [item, initialVariantLabel, modifierGroups]);

  const selectedVariant =
    item.variants?.find((variant) => variant.label === selectedVariantLabel) ??
    getDefaultVariant(item);
  const sizeTier = sizeTierFromVariantLabel(selectedVariant?.label);
  const selectedModifiers = buildSelectedModifiers({
    groups: modifierGroups,
    selections,
    sizeTier,
    catalogItems: priceCatalog,
  });

  const extras: CartExtra[] = selectedModifiers.map((modifier) => ({
    label: modifier.optionName,
    price: modifier.priceDelta,
    slug: modifier.linkedMenuItemSlug ?? modifier.optionCode,
    groupCode: modifier.groupCode,
    optionCode: modifier.optionCode,
  }));

  const basePrice = selectedVariant?.price ?? item.price;
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  const lineTotal = (basePrice ?? 0) * quantity + extrasTotal * quantity;

  const setGroupSelection = (group: ModifierGroupDef, optionCode: string, checked: boolean) => {
    setSelections((current) => ({
      ...current,
      [group.code]: toggleGroupOption({
        group,
        current: current[group.code] ?? [],
        optionCode,
        checked,
      }),
    }));
  };

  const handleAdd = () => {
    if (basePrice == null) {
      toast.error("This item is not available to order right now.");
      return;
    }

    const validationError = validateModifierSelections(modifierGroups, selections);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const variant = selectedVariant as MenuVariant | undefined;
    const variantId = variant ? getVariantId(variant) : null;
    const optionKey = extras
      .map((extra) => `${extra.groupCode ?? "x"}-${extra.optionCode ?? extra.label}`)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
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
        <ol
          className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          aria-label="Customization steps"
        >
          {["1. Choose size", "2. Customize", "3. Review", "4. Add to cart"].map((step, index) => (
            <li
              key={step}
              className={`rounded-full border px-2.5 py-1 ${
                index === 0
                  ? "border-brand-red/30 bg-brand-red/5 text-brand-red"
                  : "border-border bg-white"
              }`}
            >
              {step}
            </li>
          ))}
        </ol>
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

        {modifierGroups.map((group) => (
          <ModifierGroupFields
            key={group.code}
            group={group}
            selected={selections[group.code] ?? []}
            sizeTier={sizeTier}
            catalogItems={priceCatalog}
            onToggle={(optionCode, checked) => setGroupSelection(group, optionCode, checked)}
            onSelectSingle={(optionCode) =>
              setGroupSelection(group, optionCode, optionCode !== "none")
            }
          />
        ))}

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

function ModifierGroupFields({
  group,
  selected,
  sizeTier,
  catalogItems,
  onToggle,
  onSelectSingle,
}: {
  group: ModifierGroupDef;
  selected: string[];
  sizeTier: "small" | "medium" | "large";
  catalogItems: MenuItem[];
  onToggle: (optionCode: string, checked: boolean) => void;
  onSelectSingle: (optionCode: string) => void;
}) {
  const optionalSingle = group.selectionType === "single" && !group.isRequired;

  if (optionalSingle) {
    const value = selected[0] ?? "none";
    return (
      <div className="space-y-2">
        <Label>{group.name}</Label>
        <Select value={value} onValueChange={(next) => onSelectSingle(next)}>
          <SelectTrigger className="rounded-2xl" aria-label={group.name}>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {group.options.map((option) => {
              const price = resolveOptionPriceForTier(option, sizeTier, catalogItems);
              return (
                <SelectItem key={option.code} value={option.code}>
                  {option.name} · +Rs {price.toLocaleString()}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (group.selectionType === "single") {
    return (
      <fieldset className="space-y-2">
        <legend className="font-[var(--font-accent)] font-semibold">{group.name}</legend>
        <div className="flex flex-wrap gap-2">
          {group.options.map((option) => {
            const isSelected = selected.includes(option.code);
            const price = resolveOptionPriceForTier(option, sizeTier, catalogItems);
            return (
              <button
                key={option.code}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(option.code, true)}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-brand-red bg-brand-red text-white"
                    : "border-border bg-white hover:border-brand-red/50"
                }`}
              >
                {option.name}
                {price > 0 ? <span className="opacity-80"> · +Rs {price.toLocaleString()}</span> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="font-[var(--font-accent)] font-semibold">{group.name}</legend>
      <div className="space-y-2">
        {group.options.map((option) => {
          const price = resolveOptionPriceForTier(option, sizeTier, catalogItems);
          const checked = selected.includes(option.code);
          return (
            <label
              key={option.code}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 hover:border-brand-red/40"
            >
              <span className="text-sm">{option.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-sm font-bold text-brand-red">+Rs {price.toLocaleString()}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onToggle(option.code, event.target.checked)}
                  className="h-4 w-4 accent-brand-red"
                />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
