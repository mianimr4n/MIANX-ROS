import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { defaultSku, type PosCartLine } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";
import type { MenuProductGroup } from "@/lib/telepizza-types";

export function ProductConfigureModal({
  group,
  open,
  onClose,
  onAdd,
}: {
  /** Product family; the cashier picks one of its sellable SKUs. */
  group: MenuProductGroup | null;
  open: boolean;
  onClose: () => void;
  onAdd: (line: Omit<PosCartLine, "key">) => void;
}) {
  const options = group?.options ?? [];
  const [skuId, setSkuId] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const sku = options.find((option) => option.id === skuId) ?? (group ? defaultSku(group) : null);

  useEffect(() => {
    if (!group) return;
    setSkuId(defaultSku(group)?.id ?? "");
    setQuantity(1);
  }, [group]);

  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const modifierGroup of sku?.modifierGroups ?? []) {
      const defOpt = modifierGroup.options.find((o) => o.isDefault) ?? modifierGroup.options[0];
      if ((modifierGroup.isRequired || modifierGroup.minSelect > 0) && defOpt) {
        defaults[modifierGroup.code] = defOpt.code;
      }
    }
    setSelectedOptions(defaults);
  }, [sku]);

  const unitPrice = sku?.price ?? 0;

  const modifiers = useMemo(() => {
    const rows: NonNullable<PosCartLine["modifiers"]> = [];
    for (const modifierGroup of sku?.modifierGroups ?? []) {
      const code = selectedOptions[modifierGroup.code];
      if (!code) continue;
      const opt = modifierGroup.options.find((o) => o.code === code);
      if (!opt) continue;
      rows.push({
        groupCode: modifierGroup.code,
        optionCode: opt.code,
        label: `${modifierGroup.name}: ${opt.name}`,
        priceDelta: opt.priceDelta,
      });
    }
    return rows;
  }, [sku, selectedOptions]);

  if (!open || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close options" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configure ${group.name}`}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{group.name}</h3>
            <p className="text-sm text-[var(--admin-muted)]">{formatPkr(unitPrice)}</p>
          </div>
          <button type="button" className="rounded-md p-2 hover:bg-[var(--admin-soft)]" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {options.length > 1 ? (
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Size / variant</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={option.available === false}
                  onClick={() => setSkuId(option.id)}
                  className={`min-h-11 rounded-xl px-3 text-sm font-semibold disabled:opacity-40 ${
                    sku?.id === option.id
                      ? "bg-[var(--brand-red)] text-white"
                      : "border border-[var(--admin-border)]"
                  }`}
                >
                  {option.sizeLabel ?? option.name} · {formatPkr(option.price)}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {(sku?.modifierGroups ?? []).map((modifierGroup) => (
          <fieldset key={modifierGroup.code} className="mt-4">
            <legend className="text-sm font-semibold">
              {modifierGroup.name}
              {modifierGroup.isRequired || modifierGroup.minSelect > 0 ? " *" : ""}
            </legend>
            <div className="mt-2 space-y-2">
              {modifierGroup.options.map((opt) => (
                <label key={opt.code} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--admin-border)] px-3 text-sm">
                  <input
                    type="radio"
                    name={modifierGroup.code}
                    checked={selectedOptions[modifierGroup.code] === opt.code}
                    onChange={() => setSelectedOptions((prev) => ({ ...prev, [modifierGroup.code]: opt.code }))}
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
          disabled={!sku || sku.available === false}
          className="mt-5 min-h-12 w-full rounded-xl bg-[var(--brand-red)] text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => {
            if (!sku) return;
            onAdd({
              menuItemId: sku.id,
              menuItemSlug: sku.slug ?? sku.id,
              productName: sku.name,
              variantLabel: sku.sizeLabel,
              unitPrice,
              quantity,
              modifiers,
              image: sku.image,
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
