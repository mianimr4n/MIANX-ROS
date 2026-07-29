/**
 * POS payment method selector — opening-ready operational methods.
 * Cash is available for takeaway / delivery / phone at place-order time.
 * Card terminal / bank / complimentary require an open dine-in bill settle path.
 * Online card gateway is NOT claimed.
 */

const METHODS = [
  { id: "cash", label: "Cash", hint: "Cash at counter or COD — recorded on the order" },
  { id: "card_terminal", label: "Card terminal", hint: "Manual terminal confirmation (dine-in settle)" },
  { id: "bank_manual", label: "Bank / reference", hint: "Authorized manual reference (dine-in settle)" },
  { id: "complimentary", label: "Complimentary", hint: "Manager override with reason (dine-in settle)" },
] as const;

export function PaymentPanel({
  selected,
  onSelect,
  settlementReady = false,
  remainingBalance = null,
}: {
  selected: string;
  onSelect: (value: string) => void;
  /** True when a restaurant bill exists for the active dining session. */
  settlementReady?: boolean;
  remainingBalance?: number | null;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
      aria-label="Payment panel"
    >
      <h3 className="text-base font-semibold">Payment</h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        {settlementReady
          ? "Settlement posts to the payment ledger (cash / card terminal / bank / complimentary). No online card gateway."
          : "Cash is live for POS place-order (pickup paid at counter; delivery stays pending COD). Other methods unlock after a dine-in bill is open."}
      </p>
      {remainingBalance != null ? (
        <p className="mt-2 text-sm font-semibold text-[var(--admin-text)]">
          Remaining balance: {remainingBalance.toFixed(2)} PKR
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            disabled={!settlementReady && method.id !== "cash"}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
              selected === method.id
                ? "border-[var(--brand-red)] bg-[var(--admin-soft)]"
                : "border-[var(--admin-border)] text-[var(--admin-muted)]"
            }`}
            aria-pressed={selected === method.id}
            title={method.hint}
          >
            {method.label}
            <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-[var(--admin-muted)]">
              {method.hint}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
