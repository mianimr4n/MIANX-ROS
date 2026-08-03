export function WhatsAppIntegrationBanner() {
  return (
    <section
      aria-labelledby="whatsapp-integration-heading"
      className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
      data-testid="whatsapp-order-attribution-banner"
    >
      <h2 id="whatsapp-integration-heading" className="text-sm font-semibold text-sky-950">
        WhatsApp order attribution (not an inbox)
      </h2>
      <p className="mt-1 text-sm text-sky-900">
        This workspace lists orders with <span className="font-semibold">order_source = whatsapp</span>. There is no
        WhatsApp provider connection, conversation storage, unread state, templates, or agent assignment here.
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
