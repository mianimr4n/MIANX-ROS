export function PaymentPanel({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (value: string) => void;
}) {
  const methods = [
    { id: "cash", label: "Cash", live: false },
    { id: "card", label: "Card", live: false },
    { id: "wallet", label: "Wallet", live: false },
    { id: "split", label: "Split payment", live: false },
  ] as const;

  return (
    <section
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
      aria-label="Payment panel"
    >
      <h3 className="text-base font-semibold">Payment</h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        No POS payment capture API yet. Place Order creates the order (same as counter COD / unpaid until
        cashier settlement). Methods below are Foundation labels only.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
              selected === method.id
                ? "border-[var(--brand-red)] bg-[var(--admin-soft)]"
                : "border-dashed border-[var(--admin-border)] text-[var(--admin-muted)]"
            }`}
            aria-pressed={selected === method.id}
          >
            {method.label}
            <span className="mt-1 block text-[10px] uppercase tracking-wide">Foundation</span>
          </button>
        ))}
      </div>
    </section>
  );
}
