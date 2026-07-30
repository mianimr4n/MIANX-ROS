import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { AvailabilityPanel } from "@/components/admin/menu/AvailabilityPanel";
import { ModifierManager } from "@/components/admin/menu/ModifierManager";
import { PricingPanel } from "@/components/admin/menu/PricingPanel";
import { PublishingPanel } from "@/components/admin/menu/PublishingPanel";
import { SkuFamilyPanel } from "@/components/admin/menu/SkuFamilyPanel";
import { itemSku, type MenuCatalogItemView } from "@/lib/admin-menu";
import type { AdminMenuAuditEvent, UpdateMenuSkuBody } from "@/lib/admin-menu-api";
import { formatPkr } from "@/lib/admin-order-format";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

export function ProductDrawer({
  open,
  product,
  family,
  categories,
  canWrite,
  saving,
  saveError,
  auditEvents,
  onSave,
  onUploadImage,
  onOpenSibling,
  onClose,
}: {
  open: boolean;
  product: MenuCatalogItemView | null;
  /** Sibling SKUs sharing this product's family key. */
  family: MenuCatalogItemView[];
  categories: Array<{ id: string; name: string; slug: string }>;
  canWrite: boolean;
  saving: boolean;
  saveError: string | null;
  auditEvents: AdminMenuAuditEvent[];
  onSave: (patch: UpdateMenuSkuBody) => void;
  onUploadImage: (file: File) => void | Promise<void>;
  onOpenSibling: (sibling: MenuCatalogItemView) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [productGroupSlug, setProductGroupSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? "");
    setSizeLabel(product.sizeLabel ?? "");
    setProductGroupSlug(product.productGroupSlug ?? product.slug ?? product.id);
    setCategoryId(categories.find((c) => c.slug === product.categorySlug)?.id ?? "");
    setImageUrl(product.image ?? "");
    setLocalPreview(null);
    setImageError(null);
  }, [product, categories]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  if (!open || !product) return null;

  const detailsDirty =
    name !== product.name ||
    description !== (product.description ?? "") ||
    sizeLabel !== (product.sizeLabel ?? "") ||
    productGroupSlug !== (product.productGroupSlug ?? product.slug ?? product.id) ||
    imageUrl !== (product.image ?? "") ||
    (categoryId !== "" && categoryId !== categories.find((c) => c.slug === product.categorySlug)?.id);

  const displayImage = localPreview || imageUrl || product.image;

  const saveDetails = () => {
    const patch: UpdateMenuSkuBody = {
      name: name.trim(),
      description: description.trim() || null,
      sizeLabel: sizeLabel.trim() || null,
      productGroupSlug: productGroupSlug.trim().toLowerCase(),
      imageUrl: imageUrl.trim() || null,
    };
    const originalCategoryId = categories.find((c) => c.slug === product.categorySlug)?.id;
    if (categoryId && categoryId !== originalCategoryId) patch.categoryId = categoryId;
    onSave(patch);
  };

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return;
    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setImageError("Please choose a JPG or PNG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("Image must be 2 MB or smaller.");
      return;
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    try {
      await onUploadImage(file);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image upload failed.");
    }
  };

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Sellable SKU</p>
            <h2 id={titleId} className="mt-1 truncate text-xl font-semibold">
              {product.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              SKU {itemSku(product)} · {product.catalogScope === "internal" ? "Internal SKU" : "Browse SKU"} ·{" "}
              <span className="tabular-nums">{formatPkr(product.price)}</span>
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
            <section aria-labelledby="product-image-heading" className="space-y-3">
              <h3 id="product-image-heading" className="text-sm font-semibold">
                Product image
              </h3>
              {displayImage ? (
                <img src={displayImage} alt="" className="aspect-video w-full rounded-xl object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl bg-[var(--admin-soft)] text-sm text-[var(--admin-muted)]">
                  No image in catalog
                </div>
              )}
              {canWrite ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      void onFilePicked(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    {saving ? "Uploading…" : "Upload Image"}
                  </button>
                  <p className="text-xs text-[var(--admin-muted)]">JPG or PNG · max 2 MB</p>
                </div>
              ) : null}
              {imageError ? (
                <p className="text-xs text-red-700" role="alert">
                  {imageError}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="general-heading">
              <h3 id="general-heading" className="text-sm font-semibold">
                General
              </h3>
              <div className="mt-3 space-y-3 rounded-xl border border-[var(--admin-border)] p-3">
                <label className="block text-sm font-medium">
                  Name
                  <input
                    value={name}
                    disabled={!canWrite || saving}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 disabled:bg-[var(--admin-soft)]"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Description
                  <textarea
                    value={description}
                    rows={3}
                    disabled={!canWrite || saving}
                    onChange={(event) => setDescription(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 disabled:bg-[var(--admin-soft)]"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Size label
                    <input
                      value={sizeLabel}
                      placeholder="e.g. 10 inch Medium"
                      disabled={!canWrite || saving}
                      onChange={(event) => setSizeLabel(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 disabled:bg-[var(--admin-soft)]"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Product group
                    <input
                      value={productGroupSlug}
                      disabled={!canWrite || saving}
                      onChange={(event) => setProductGroupSlug(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 disabled:bg-[var(--admin-soft)]"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Category
                    <select
                      value={categoryId}
                      disabled={!canWrite || saving || categories.length === 0}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 disabled:bg-[var(--admin-soft)]"
                    >
                      <option value="">{product.category}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Image URL (optional)
                    <input
                      value={imageUrl}
                      disabled={!canWrite || saving}
                      onChange={(event) => setImageUrl(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 disabled:bg-[var(--admin-soft)]"
                    />
                  </label>
                </div>
                {canWrite ? (
                  <button
                    type="button"
                    disabled={!detailsDirty || saving || name.trim().length === 0}
                    onClick={saveDetails}
                    className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 text-sm font-semibold disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                ) : (
                  <p className="text-xs text-[var(--admin-muted)]">
                    Read-only — `menu.write` is required to edit this SKU.
                  </p>
                )}
              </div>
            </section>

            <PricingPanel
              product={product}
              canWrite={canWrite}
              saving={saving}
              error={saveError}
              onSave={({ price, isAvailable }) => onSave({ price, isAvailable })}
            />
            <SkuFamilyPanel product={product} family={family} onOpen={onOpenSibling} />
            <ModifierManager product={product} />
            <AvailabilityPanel
              product={product}
              canWrite={canWrite}
              saving={saving}
              onToggle={(isAvailable) => onSave({ isAvailable })}
            />
            <PublishingPanel product={product} />

            <section aria-labelledby="audit-heading">
              <h3 id="audit-heading" className="text-sm font-semibold">
                Change history
              </h3>
              {auditEvents.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  No recorded changes for this SKU yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {auditEvents.map((event) => (
                    <li key={event.id} className="rounded-xl border border-[var(--admin-border)] px-3 py-2">
                      <p className="font-medium">{event.action}</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {new Date(event.createdAt).toLocaleString()} · {event.scope}
                        {event.actorUserId ? ` · actor ${event.actorUserId.slice(0, 8)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
