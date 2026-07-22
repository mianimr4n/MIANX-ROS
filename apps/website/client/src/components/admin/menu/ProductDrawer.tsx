import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { AvailabilityPanel } from "@/components/admin/menu/AvailabilityPanel";
import { ModifierManager } from "@/components/admin/menu/ModifierManager";
import { PricingPanel } from "@/components/admin/menu/PricingPanel";
import { PublishingPanel } from "@/components/admin/menu/PublishingPanel";
import { VariantManager } from "@/components/admin/menu/VariantManager";
import { itemSku, type MenuCatalogItemView } from "@/lib/admin-menu";
import { displayPrice } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";

export function ProductDrawer({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: MenuCatalogItemView | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !product) return null;

  const price = displayPrice(product);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close product drawer" onClick={onClose} />
      <aside
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Product</p>
            <h2 id={titleId} className="mt-1 truncate text-xl font-semibold">
              {product.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              SKU {itemSku(product)} · {product.catalogScope === "internal" ? "Internal SKU" : "Browse SKU"}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="rounded-md p-2 hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
            aria-label="Close drawer"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-6">
            {product.image ? (
              <img src={product.image} alt="" className="aspect-video w-full rounded-xl object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-[var(--admin-soft)] text-sm text-[var(--admin-muted)]">
                No image in catalog
              </div>
            )}

            <section>
              <h3 className="text-sm font-semibold">General</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Description</dt>
                  <dd className="max-w-[60%] text-right">{product.description || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Category</dt>
                  <dd>{product.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Product type</dt>
                  <dd>{product.productType ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Featured</dt>
                  <dd>{product.featured ? "Yes" : "No"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Display price</dt>
                  <dd className="tabular-nums">{price > 0 ? formatPkr(price) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Barcode</dt>
                  <dd className="text-[var(--admin-muted)]">Unavailable</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Tax class</dt>
                  <dd className="text-[var(--admin-muted)]">Foundation</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Preparation time</dt>
                  <dd className="text-[var(--admin-muted)]">Foundation</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-xs text-[var(--admin-muted)]">
                Edit controls require menu.write admin endpoints — this drawer is read-only.
              </p>
            </section>

            <ModifierManager product={product} />
            <VariantManager product={product} />
            <PricingPanel product={product} />
            <AvailabilityPanel product={product} />
            <PublishingPanel product={product} />
          </div>
        </div>
      </aside>
    </div>
  );
}
