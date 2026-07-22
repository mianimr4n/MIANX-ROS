export function MessageComposer() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] p-3">
      <label htmlFor="whatsapp-message-composer" className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
        Message composer · Foundation
      </label>
      <textarea
        id="whatsapp-message-composer"
        disabled
        rows={3}
        placeholder="Outbound messaging requires a provider send API and conversation storage."
        className="mt-2 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-white/60 px-3 py-2 text-sm text-[var(--admin-muted)]"
        aria-describedby="whatsapp-composer-help"
      />
      <p id="whatsapp-composer-help" className="mt-2 text-xs text-[var(--admin-muted)]">
        Send is disabled — no outbound WhatsApp API in this repository. External handoff links are labeled separately
        and are not tracked messaging.
      </p>
      <button
        type="button"
        disabled
        className="mt-2 min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]"
      >
        Send message · Foundation
      </button>
    </div>
  );
}
