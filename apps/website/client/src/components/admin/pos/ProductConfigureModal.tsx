import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { defaultVariant, type PosCartLine } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";
import type { MenuItem } from "@/lib/telepizza-types";

export function ProductConfigureModal({
  item,
  open,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  open: boolean;
  onClose: () => void;
  onAdd: (line: Omit<PosCartLine, "key">) => void;
}) {
  const variants = item?.variants ?? [];
  const [variantLabel, setVariantLabel] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!item) return;
    const def = defaultVariant(item);
    setVariantLabel(def?.label ?? "");
    const defaults: Record<string, string> = {};
    for (const group of item.modifierGroups ?? []) {
      const defOpt = group.options.find((o) => o.isDefault) ?? group.options[0];
      if ((group.isRequired || group.minSelect > 0) && defOpt) {
        defaults[group.code] = defOpt.code;
      }
    }
    setSelectedOptions(defaults);
    setQuantity(1);
  }, [item]);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const variant = variants.find((v) => v.label === variantLabel) ?? defaultVariant(item);
    return variant?.price ?? item.price ?? 0;
  }, [item, variantLabel, variants]);

  const modifiers = useMemo(() => {
    if (!item) return [];
    const rows: PosCartLine["modifiers"] = [];
    for (const group of item.modifierGroups ?? []) {
      const code = selectedOptions[group.code];
      if (!code) continue;
      const opt = group.options.find((o) => o.code === code);
      if (!opt) continue;
      rows!.push({
        groupCode: group.code,
        optionCode: opt.code,
        label: `${group.name}: ${opt.name}`,
        priceDelta: opt.priceDelta,
      });
    }
    return rows;
  }, [item, selectedOptions]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close options" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configure ${item.name}`}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-sm text-[var(--admin-muted)]">{formatPkr(unitPrice)}</p>
          </div>
          <button type="button" className="rounded-md p-2 hover:bg-[var(--admin-soft)]" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {variants.length > 0 ? (
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Size / variant</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {variants.map((variant) => (
                <button
                  key={variant.label}
                  type="button"
                  onClick={() => setVariantLabel(variant.label)}
                  className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${
                    variantLabel === variant.label
                      ? "bg-[var(--brand-red)] text-white"
                      : "border border-[var(--admin-border)]"
                  }`}
                >
                  {variant.label} · {formatPkr(variant.price)}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {(item.modifierGroups ?? []).map((group) => (
          <fieldset key={group.code} className="mt-4">
            <legend className="text-sm font-semibold">
              {group.name}
              {group.isRequired || group.minSelect > 0 ? " *" : ""}
            </legend>
            <div className="mt-2 space-y-2">
              {group.options.map((opt) => (
                <label key={opt.code} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--admin-border)] px-3 text-sm">
                  <input
                    type="radio"
                    name={group.code}
                    checked={selectedOptions[group.code] === opt.code}
                    onChange={() => setSelectedOptions((prev) => ({ ...prev, [group.code]: opt.code }))}
                  />
                  <span className="flex-1">{opt.name}</span>
                  <span className="tabular-nums text-[var(--admin-muted)]">
                    {opt.priceDelta > 0 ? `+${formatPkr(opt.priceDelta)}` : "—"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="mt-4 block text-sm font-semibold">
          Quantity
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="mt-1.5 w-24 rounded-lg border border-[var(--admin-border)] px-3 py-2"
          />
        </label>

        <button
          type="button"
          className="mt-5 min-h-12 w-full rounded-xl bg-[var(--brand-red)] text-sm font-semibold text-white"
          onClick={() => {
            if (!item.slug) return;
            onAdd({
              menuItemSlug: item.slug,
              productName: item.name,
              variantLabel: variantLabel || undefined,
              unitPrice,
              quantity,
              modifiers,
              image: item.image,
            });
            onClose();
          }}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
