import type { MenuItem } from "@/lib/telepizza-types";
import { isPizzaItem } from "@/data/cart-config";
import { buildCartItemPayload } from "@/lib/menu-utils";
import { useCart } from "@/contexts/CartContext";
import { usePizzaCustomizer } from "@/contexts/PizzaCustomizerContext";

export function useAddMenuItem() {
  const { addItem } = useCart();
  const { openCustomizer } = usePizzaCustomizer();

  return (item: MenuItem, initialVariantLabel?: string) => {
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
