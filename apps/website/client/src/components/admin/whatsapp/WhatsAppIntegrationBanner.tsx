export function WhatsAppIntegrationBanner() {
  return (
    <section
      aria-labelledby="whatsapp-integration-heading"
      className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 md:px-5"
      data-testid="whatsapp-order-attribution-banner"
    >
      <h2 id="whatsapp-integration-heading" className="text-sm font-semibold text-emerald-950">
        WhatsApp inbox is live (Phase 2.2)
      </h2>
      <p className="mt-1 text-sm text-emerald-900">
        Conversations, message threads, agent assignment, templates, and outbound send are now available.
        The workspace still lists orders with <span className="font-semibold">order_source = whatsapp</span> for order
        context, alongside the live conversation store backed by ADR-004.
      </p>
    </section>
  );
}

/** Retained for static tests / unused panel imports — not rendered on owner handover UI. */
export function WhatsAppFoundationPanel({ checks }: { checks: { id: string; label: string; note: string; status: string }[] }) {
  return (
    <section aria-labelledby="whatsapp-foundation-heading" className="sr-only">
      <h2 id="whatsapp-foundation-heading">Integration readiness</h2>
      <ul>
        {checks.map((check) => (
          <li key={check.id}>
            {check.label} · {check.status} · {check.note}
          </li>
        ))}
      </ul>
    </section>
  );
}
