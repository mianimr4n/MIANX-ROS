import { createContext, useContext, useState, type ReactNode } from "react";
import type { MenuItem } from "@/lib/telepizza-types";
import { PizzaCustomizerDialog } from "@/components/menu/PizzaCustomizerDialog";

interface PizzaCustomizerContextType {
  /** Opens the configurator on an exact sellable SKU; siblings come from its product family. */
  openCustomizer: (sku: MenuItem) => void;
}

const PizzaCustomizerContext = createContext<PizzaCustomizerContextType | null>(null);

export function PizzaCustomizerProvider({ children }: { children: ReactNode }) {
  const [sku, setSku] = useState<MenuItem | null>(null);

  return (
    <PizzaCustomizerContext.Provider value={{ openCustomizer: setSku }}>
      {children}
      <PizzaCustomizerDialog sku={sku} onClose={() => setSku(null)} />
    </PizzaCustomizerContext.Provider>
  );
}

export function usePizzaCustomizer() {
  const context = useContext(PizzaCustomizerContext);
  if (!context) {
    throw new Error("usePizzaCustomizer must be used within PizzaCustomizerProvider");
  }
  return context;
}
