import type { MenuItem } from "@/lib/telepizza-types";
import { isConfigurableSku, isStandalonePurchasable } from "@/data/cart-config";
import { buildCartItemPayload } from "@/lib/menu-utils";
import { useCart } from "@/contexts/CartContext";
import { usePizzaCustomizer } from "@/contexts/PizzaCustomizerContext";
import { toast } from "sonner";

export function useAddMenuItem() {
  const { addItem } = useCart();
  const { openCustomizer } = usePizzaCustomizer();

  /** `item` is always an exact sellable SKU — sizes are separate SKUs, not options of one. */
  return (item: MenuItem) => {
    if (!isStandalonePurchasable(item)) {
      toast.error("This item is only available as a pizza topping.");
      return;
    }

    if (isConfigurableSku(item)) {
      openCustomizer(item);
      return;
    }

    const payload = buildCartItemPayload(item);
    if (payload) addItem(payload);
  };
}
