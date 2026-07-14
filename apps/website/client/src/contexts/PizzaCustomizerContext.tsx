import { createContext, useContext, useState, type ReactNode } from "react";
import type { MenuItem } from "@/data/menu-data";
import { PizzaCustomizerDialog } from "@/components/menu/PizzaCustomizerDialog";

interface PizzaCustomizerState {
  item: MenuItem;
  initialVariantLabel?: string;
}

interface PizzaCustomizerContextType {
  openCustomizer: (item: MenuItem, initialVariantLabel?: string) => void;
}

const PizzaCustomizerContext = createContext<PizzaCustomizerContextType | null>(null);

export function PizzaCustomizerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PizzaCustomizerState | null>(null);

  return (
    <PizzaCustomizerContext.Provider
      value={{
        openCustomizer: (item, initialVariantLabel) => setState({ item, initialVariantLabel }),
      }}
    >
      {children}
      <PizzaCustomizerDialog
        item={state?.item ?? null}
        initialVariantLabel={state?.initialVariantLabel}
        onClose={() => setState(null)}
      />
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
