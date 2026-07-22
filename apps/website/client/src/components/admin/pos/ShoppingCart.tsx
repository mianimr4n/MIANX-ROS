import { cartSubtotal, lineTotal, type PosCartLine } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";

export function ShoppingCart({
  lines,
  onQuantity,
  onRemove,
  onClear,
  onNote,
}: {
  lines: PosCartLine[];
  onQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onNote: (key: string, note: string) => void;
}) {
  const subtotal = cartSubtotal(lines);

  return (
    <section
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
      aria-label="Shopping cart"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Cart</h3>
        <button
          type="button"
          disabled={lines.length === 0}
          onClick={onClear}
          className="text-xs font-semibold text-[var(--admin-muted)] underline disabled:opacity-40"
        >
          Clear cart
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">Cart is empty. Add items from the menu.</p>
      ) : (
        <ul className="max-h-[22rem] space-y-3 overflow-y-auto">
          {lines.map((line) => (
            <li key={line.key} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {line.productName}
                    {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                  </p>
                  {line.modifiers && line.modifiers.length > 0 ? (
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {line.modifiers.map((m) => m.label).join(", ")}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPkr(lineTotal(line))}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`qty-${line.key}`}>
                  Quantity for {line.productName}
                </label>
                <input
                  id={`qty-${line.key}`}
                  type="number"
                  min={1}
                  max={20}
                  value={line.quantity}
                  onChange={(event) => onQuantity(line.key, Number(event.target.value) || 1)}
                  className="min-h-10 w-16 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRemove(line.key)}
                  className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold"
                >
                  Remove
                </button>
              </div>
              <label className="mt-2 block text-xs text-[var(--admin-muted)]">
                Item note
                <input
                  value={line.instructions ?? ""}
                  onChange={(event) => onNote(line.key, event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-white px-2 py-1.5 text-sm"
                  placeholder="Special instructions"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-1 border-t border-[var(--admin-border)] pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Cart subtotal (display)</dt>
          <dd className="tabular-nums font-semibold">{formatPkr(subtotal)}</dd>
        </div>
        <p className="text-xs text-[var(--admin-muted)]">
          Tax, discount, and delivery fee come from the live quote — not this display subtotal.
        </p>
      </dl>
    </section>
  );
}
