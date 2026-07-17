import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuItem } from "@/lib/telepizza-types";
import { ProductConfigurator } from "./ProductConfigurator";

type PizzaCustomizerDialogProps = {
  item: MenuItem | null;
  initialVariantLabel?: string;
  onClose: () => void;
};

export function PizzaCustomizerDialog({
  item,
  initialVariantLabel,
  onClose,
}: PizzaCustomizerDialogProps) {
  if (!item) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-[var(--font-display)] text-2xl">
            Customize {item.name}
          </DialogTitle>
          <DialogDescription>
            Choose your options. Availability and final pricing are checked again at checkout.
          </DialogDescription>
        </DialogHeader>
        <ProductConfigurator
          item={item}
          initialVariantLabel={initialVariantLabel}
          compact
          onAdded={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
