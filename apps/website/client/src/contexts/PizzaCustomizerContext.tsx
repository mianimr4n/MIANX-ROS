import { Suspense, lazy, createContext, useContext, useState, type ReactNode } from "react";
import type { MenuItem } from "@/lib/telepizza-types";

interface PizzaCustomizerContextType {
  /** Opens the configurator on an exact sellable SKU; siblings come from its product family. */
  openCustomizer: (sku: MenuItem) => void;
}

const PizzaCustomizerContext = createContext<PizzaCustomizerContextType | null>(null);

/** Dialog + radix select + configurator stay out of the entry chunk until opened. */
const PizzaCustomizerDialog = lazy(() =>
  import("@/components/menu/PizzaCustomizerDialog").then((m) => ({
    default: m.PizzaCustomizerDialog,
  })),
);

export function PizzaCustomizerProvider({ children }: { children: ReactNode }) {
  const [sku, setSku] = useState<MenuItem | null>(null);

  return (
    <PizzaCustomizerContext.Provider value={{ openCustomizer: setSku }}>
      {children}
      {sku ? (
        <Suspense fallback={null}>
          <PizzaCustomizerDialog sku={sku} onClose={() => setSku(null)} />
        </Suspense>
      ) : null}
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
