import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { deriveFamilyName } from "@/lib/menu-catalog";
import type { MenuItem, MenuProductGroup } from "@/lib/telepizza-types";
import { ProductConfigurator } from "./ProductConfigurator";

type PizzaCustomizerDialogProps = {
  /** The SKU the customer clicked; its family provides the other size options. */
  sku: MenuItem | null;
  onClose: () => void;
};

/** Fall back to a single-option family so a SKU missing from the loaded catalog still opens. */
function soloFamily(sku: MenuItem): MenuProductGroup {
  return {
    productGroupSlug: sku.productGroupSlug ?? sku.slug ?? sku.id,
    name: deriveFamilyName(sku.name, sku.sizeLabel),
    category: sku.category,
    categorySlug: sku.categorySlug,
    description: sku.description,
    image: sku.image,
    badge: sku.badge,
    productType: sku.productType,
    featured: sku.featured,
    options: [sku],
  };
}

export function PizzaCustomizerDialog({ sku, onClose }: PizzaCustomizerDialogProps) {
  const { groups } = useMenuCatalog();

  if (!sku) return null;

  const familyKey = sku.productGroupSlug ?? sku.slug ?? sku.id;
  const group = groups.find((candidate) => candidate.productGroupSlug === familyKey) ?? soloFamily(sku);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-[var(--font-display)] text-2xl">
            Customize {group.name}
          </DialogTitle>
          <DialogDescription>
            Choose your options. Availability and final pricing are checked again at checkout.
          </DialogDescription>
        </DialogHeader>
        <ProductConfigurator group={group} initialSkuId={sku.id} compact onAdded={onClose} />
      </DialogContent>
    </Dialog>
  );
}
