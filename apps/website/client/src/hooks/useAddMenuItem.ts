import type { MenuItem } from "@/lib/telepizza-types";
import { isPizzaItem, isStandalonePurchasable } from "@/data/cart-config";
import { buildCartItemPayload } from "@/lib/menu-utils";
import { useCart } from "@/contexts/CartContext";
import { usePizzaCustomizer } from "@/contexts/PizzaCustomizerContext";
import { toast } from "sonner";

export function useAddMenuItem() {
  const { addItem } = useCart();
  const { openCustomizer } = usePizzaCustomizer();

  return (item: MenuItem, initialVariantLabel?: string) => {
    if (!isStandalonePurchasable(item)) {
      toast.error("This item is only available as a pizza topping.");
      return;
    }

    if (isPizzaItem(item)) {
      openCustomizer(item, initialVariantLabel);
      return;
    }

    const payload = buildCartItemPayload(
      item,
      initialVariantLabel
        ? item.variants?.find((variant) => variant.label === initialVariantLabel)
        : undefined,
    );
    if (payload) addItem(payload);
  };
}
