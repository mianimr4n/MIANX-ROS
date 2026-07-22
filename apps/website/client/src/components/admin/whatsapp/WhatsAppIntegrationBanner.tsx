import type { IntegrationCheck } from "@/lib/admin-whatsapp";

export function WhatsAppIntegrationBanner() {
  return (
    <section
      aria-labelledby="whatsapp-integration-heading"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 md:px-5"
    >
      <h2 id="whatsapp-integration-heading" className="text-sm font-semibold text-amber-950">
        Integration status
      </h2>
      <p className="mt-1 text-sm text-amber-900">
        Operational view derived from WhatsApp-attributed orders — conversation history is unavailable.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        Customer-facing ordering uses external <code className="rounded bg-white/70 px-1">wa.me</code> handoff to{" "}
        0304-1110495. That is not a tracked provider inbox.
      </p>
    </section>
  );
}

export function WhatsAppFoundationPanel({ checks }: { checks: IntegrationCheck[] }) {
  return (
    <section aria-labelledby="whatsapp-foundation-heading" className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <h2 id="whatsapp-foundation-heading" className="text-sm font-semibold">
        Integration readiness
      </h2>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        Verified repository dependencies — no secret values shown.
      </p>
      <ul className="mt-3 space-y-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{check.label}</p>
              <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{check.note}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                check.status === "present"
                  ? "bg-emerald-50 text-emerald-900"
                  : check.status === "partial" || check.status === "derived"
                    ? "bg-sky-50 text-sky-900"
                    : "bg-[var(--admin-soft)] text-[var(--admin-muted)]"
              }`}
            >
              {check.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
