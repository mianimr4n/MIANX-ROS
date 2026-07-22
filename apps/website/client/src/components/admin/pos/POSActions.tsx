export function POSActions({
  canPlace,
  placing,
  canKitchenSend,
  kitchenBusy,
  lastOrderId,
  onPlace,
  onCancelLocal,
  onKitchenSend,
}: {
  canPlace: boolean;
  placing: boolean;
  canKitchenSend: boolean;
  kitchenBusy: boolean;
  lastOrderId: string | null;
  onPlace: () => void;
  onCancelLocal: () => void;
  onKitchenSend: () => void;
}) {
  return (
    <section aria-label="Order actions" className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled
        className="min-h-12 cursor-not-allowed rounded-xl border border-dashed border-[var(--admin-border)] px-4 text-sm font-semibold text-[var(--admin-muted)]"
        title="Server draft orders are not available"
      >
        Save draft · Foundation
      </button>
      <button
        type="button"
        disabled={!canPlace || placing}
        onClick={onPlace}
        className="min-h-12 rounded-xl bg-[var(--brand-red)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] disabled:opacity-40"
      >
        {placing ? "Placing…" : "Place order"}
      </button>
      <button
        type="button"
        disabled={!canKitchenSend || !lastOrderId || kitchenBusy}
        onClick={onKitchenSend}
        className="min-h-12 rounded-xl border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold disabled:opacity-40"
        title="Confirm + start preparing when order.manage is present"
      >
        {kitchenBusy ? "Sending…" : "Kitchen send"}
      </button>
      <button
        type="button"
        onClick={onCancelLocal}
        className="min-h-12 rounded-xl border border-[var(--admin-border)] px-4 text-sm font-semibold"
      >
        Cancel / reset
      </button>
      <button
        type="button"
        disabled
        className="min-h-12 cursor-not-allowed rounded-xl border border-dashed border-[var(--admin-border)] px-4 text-sm font-semibold text-[var(--admin-muted)]"
      >
        Print receipt · Foundation
      </button>
    </section>
  );
}
