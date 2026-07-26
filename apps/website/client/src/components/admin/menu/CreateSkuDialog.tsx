import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { AdminMenuCategory, CreateMenuSkuBody } from "@/lib/admin-menu-api";

const PRODUCT_TYPES = [
  "pizza",
  "burger",
  "sandwich",
  "wings",
  "fries",
  "wrap",
  "pasta",
  "side",
  "drink",
  "deal",
  "topping",
] as const;

const SIZE_CODES = ["small", "medium", "large"] as const;

/**
 * Creates one sellable SKU. A size is not a sub-row here: to add "12 inch Large" you create a
 * new SKU that shares the family's product group slug.
 */
export function CreateSkuDialog({
  open,
  categories,
  presetGroupSlug,
  busy,
  error,
  onCreate,
  onClose,
}: {
  open: boolean;
  categories: AdminMenuCategory[];
  presetGroupSlug?: string;
  busy: boolean;
  error: string | null;
  onCreate: (body: CreateMenuSkuBody) => void;
  onClose: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [productGroupSlug, setProductGroupSlug] = useState(presetGroupSlug ?? "");
  const [sizeLabel, setSizeLabel] = useState("");
  const [sizeCode, setSizeCode] = useState<"" | (typeof SIZE_CODES)[number]>("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<(typeof PRODUCT_TYPES)[number]>("pizza");

  useEffect(() => {
    if (!open) return;
    setCategoryId(categories[0]?.id ?? "");
    setName("");
    setSlug("");
    setPrice("");
    setProductGroupSlug(presetGroupSlug ?? "");
    setSizeLabel("");
    setSizeCode("");
    setDescription("");
  }, [open, categories, presetGroupSlug]);

  if (!open) return null;

  const parsedPrice = Number(price);
  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());
  const groupValid = productGroupSlug.trim() === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productGroupSlug.trim());
  const canSubmit =
    Boolean(categoryId) &&
    name.trim().length > 0 &&
    slugValid &&
    groupValid &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0 &&
    !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close new SKU dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create menu SKU"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">New sellable SKU</h3>
            <p className="text-xs text-[var(--admin-muted)]">
              One SKU, one price. Add each size as its own SKU sharing a product group.
            </p>
          </div>
          <button type="button" className="rounded-md p-2 hover:bg-[var(--admin-soft)]" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onCreate({
              categoryId,
              slug: slug.trim(),
              name: name.trim(),
              price: parsedPrice,
              productGroupSlug: productGroupSlug.trim() || undefined,
              sizeLabel: sizeLabel.trim() || null,
              sizeCode: sizeCode || null,
              description: description.trim() || null,
              productType,
            });
          }}
        >
          <label className="block text-sm font-medium">
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder='Tele Special — 12 inch Large'
              className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium">
            Slug
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="tele-special-large"
              aria-invalid={slug.length > 0 && !slugValid}
              className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium">
            Price (PKR)
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-1.5 w-40 rounded-lg border border-[var(--admin-border)] px-3 py-2 tabular-nums"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Product group (optional)
              <input
                value={productGroupSlug}
                onChange={(event) => setProductGroupSlug(event.target.value)}
                placeholder="tele-special"
                aria-invalid={!groupValid}
                className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Size label (optional)
              <input
                value={sizeLabel}
                onChange={(event) => setSizeLabel(event.target.value)}
                placeholder="12 inch Large"
                className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Size tier (optional)
              <select
                value={sizeCode}
                onChange={(event) => setSizeCode(event.target.value as "" | (typeof SIZE_CODES)[number])}
                className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
              >
                <option value="">None</option>
                {SIZE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Product type
              <select
                value={productType}
                onChange={(event) => setProductType(event.target.value as (typeof PRODUCT_TYPES)[number])}
                className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium">
            Description
            <textarea
              value={description}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
            />
          </label>

          {error ? (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-12 w-full rounded-xl bg-[var(--brand-red)] text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create SKU"}
          </button>
        </form>
      </div>
    </div>
  );
}
