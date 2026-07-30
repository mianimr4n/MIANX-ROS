import { Link } from "wouter";

export function WhatsAppOrderBuilder() {
  return (
    <section aria-labelledby="whatsapp-order-builder-heading" className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] p-4">
      <h2 id="whatsapp-order-builder-heading" className="text-sm font-semibold">
        WhatsApp order builder · Planned for Phase 2
      </h2>
      <p className="mt-2 text-sm text-[var(--admin-muted)]">
        Backend supports <code className="rounded bg-white/70 px-1">orderSource=whatsapp</code>, but this workspace does
        not duplicate the POS quote/create flow. Staff should use Orders Management transitions on existing
        WhatsApp-attributed orders, or POS for counter intake.
      </p>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        POS currently tags new orders as <code className="rounded bg-white/70 px-1">pos</code> — a dedicated WhatsApp
        order builder with verified source tagging is a future sprint dependency.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/admin/pos"
          className="min-h-10 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          Open POS
        </Link>
        <Link
          href="/admin/orders?orderSource=whatsapp"
          className="min-h-10 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          All WhatsApp orders
        </Link>
      </div>
    </section>
  );
}
